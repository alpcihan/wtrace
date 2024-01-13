import * as THREE from "three";

import rng_shader from "../shaders/rng.wgsl";
import screen_shader from "../shaders/screen_shader.wgsl";
import pathtracer_compute from "../shaders/pathtracer_compute.wgsl";

import { IGPU } from "./igpu";

class PathTracer {
  constructor(canvas: HTMLCanvasElement, triangleVertices: Float32Array) { // TODO: create a scene loader + model system, instead of passing raw vertices in constructor
    this.m_canvas = canvas;

    this._initContext();
    this._initAssets();
    this.setScene(triangleVertices);
    this._initPipelines();
  }

  public reset(): void {
    const frameInfo = new Float32Array(this.m_canvas.height * this.m_canvas.width * 4).fill(0);
    IGPU.get().queue.writeBuffer(this.m_accumulationBuffer, 0, frameInfo);
  }

  public setScene(triangleVertices: Float32Array): void {
    this.m_triangleVertexBuffer = IGPU.get().createBuffer({
      size: triangleVertices.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    IGPU.get().queue.writeBuffer(this.m_triangleVertexBuffer, 0, triangleVertices);
  }

  public render(camera: THREE.PerspectiveCamera): void {
    this._updateUniforms(camera);

    const cmd: GPUCommandEncoder = IGPU.get().createCommandEncoder();

    // path trace pass
    {
      const pathTracerPass: GPUComputePassEncoder = cmd.beginComputePass();
      pathTracerPass.setPipeline(this.m_pathTracingPipeline);
      pathTracerPass.setBindGroup(0, this.m_pathTracingPipelineBindGroup);
      pathTracerPass.dispatchWorkgroups(
        Math.floor((this.m_canvas.width + 15) / 16),
        Math.floor((this.m_canvas.height + 15) / 16),
        1
      );
      pathTracerPass.end();
    }

    // screen present pass
    {
      const renderpass: GPURenderPassEncoder = cmd.beginRenderPass({
        colorAttachments: [
          {
            view: this.m_context.getCurrentTexture().createView(),
            clearValue: { r: 0.5, g: 0.0, b: 0.25, a: 1.0 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });
      renderpass.setPipeline(this.m_screenPipeline);
      renderpass.setBindGroup(0, this.m_screenPipelineBindGroup);
      renderpass.draw(3, 1, 0, 0);

      renderpass.end();
    }

    IGPU.get().queue.submit([cmd.finish()]);
    this.m_frameIndex++;
  }

  public terminate(): void {
    throw new Error("Function is not implemented.");
  }

  // device/context objects
  private static m_device: GPUDevice;
  private m_canvas: HTMLCanvasElement;
  private m_context: GPUCanvasContext;

  // passes
  private m_pathTracingPipeline: GPUComputePipeline;
  private m_pathTracingPipelineBindGroup: GPUBindGroup;
  private m_screenPipeline: GPURenderPipeline;
  private m_screenPipelineBindGroup: GPUBindGroup;

  // assets
  private m_uniformBuffer: GPUBuffer;
  private m_uniformCPU: Float32Array; // do not change it (TODO: create a separate class for uniforms and make it readonly)
  private m_triangleVertexBuffer: GPUBuffer;

  private m_accumulationBuffer: GPUBuffer;
  private m_frameIndex: number = 0;

  private _initContext() {
    this.m_context = this.m_canvas.getContext("webgpu") as GPUCanvasContext;
    this.m_context.configure({
      device: IGPU.get(),
      format: "bgra8unorm" as GPUTextureFormat,
    });
  }

  private _initAssets() {
    // uniform buffer
    {
      const uniformBufferSize =
        4 * 4 * 4 + // view
        4 * 4 * 4 + // projection
        4 * 2 +     // image resolution
        4 +         // frame index with padding (for random number generator)
        4;          // padding
      this.m_uniformCPU = new Float32Array(uniformBufferSize / 4);

      this.m_uniformBuffer = IGPU.get().createBuffer({
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
    }

    // accumulation buffer
    {
      this.m_accumulationBuffer = IGPU.get().createBuffer({
        size: this.m_canvas.width * this.m_canvas.height * 4 * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
    }
  }

  private _initPipelines() {
    // path tracer pass
    {
      const pathTracingBindGroupLayout = IGPU.get().createBindGroupLayout({
        entries: [
          {
            // uniform
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: "uniform",
            },
          },
          {
            // triangle vertices
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: "read-only-storage",
            },
          },
          {
            // render image (as storage buffer)
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: "storage",
            },
          },
        ],
      });

      this.m_pathTracingPipelineBindGroup = IGPU.get().createBindGroup({
        layout: pathTracingBindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: { buffer: this.m_uniformBuffer },
          },
          {
            binding: 1,
            resource: { buffer: this.m_triangleVertexBuffer },
          },
          {
            binding: 2,
            resource: { buffer: this.m_accumulationBuffer },
          },
        ],
      });

      const pathTracingPipelineLayout = IGPU.get().createPipelineLayout({
        bindGroupLayouts: [pathTracingBindGroupLayout],
      });

      const pathTracingShader = rng_shader + pathtracer_compute;
      this.m_pathTracingPipeline = IGPU.get().createComputePipeline({
        label: "path tracing compute pipeline",
        layout: pathTracingPipelineLayout,
        compute: {
          module: IGPU.get().createShaderModule({
            code: pathTracingShader,
          }),
          entryPoint: "main",
        },
      });
    }

    // screen pass
    {
      const screenBindGroupLayout = IGPU.get().createBindGroupLayout({
        entries: [
          {
            // uniform
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
              type: "uniform",
            },
          },
          {
            // render image (as storage buffer)
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
              type: "read-only-storage",
            },
          },
        ],
      });

      this.m_screenPipelineBindGroup = IGPU.get().createBindGroup({
        layout: screenBindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: { buffer: this.m_uniformBuffer },
          },
          {
            binding: 1,
            resource: { buffer: this.m_accumulationBuffer },
          },
        ],
      });

      const screenPipelineLayout = IGPU.get().createPipelineLayout({
        bindGroupLayouts: [screenBindGroupLayout],
      });

      this.m_screenPipeline = IGPU.get().createRenderPipeline({
        label: "fullscreen texture presentation render pipeline",
        layout: screenPipelineLayout,
        vertex: {
          module: IGPU.get().createShaderModule({
            code: screen_shader,
          }),
          entryPoint: "vs_main",
        },

        fragment: {
          module: IGPU.get().createShaderModule({
            code: screen_shader,
          }),
          entryPoint: "fs_main",
          targets: [
            {
              format: "bgra8unorm",
            },
          ],
        },

        primitive: {
          topology: "triangle-list",
        },
      });
    }
  }

  private _updateUniforms(camera: THREE.PerspectiveCamera) {
    // TODO: calculate the offsets automatically
    let offset = 0;
    this.m_uniformCPU.set(camera.matrixWorld.toArray(), offset); offset += 4 * 4;
    this.m_uniformCPU.set(camera.projectionMatrixInverse.toArray(), offset); offset += 4 * 4;
    this.m_uniformCPU.set([this.m_canvas.width, this.m_canvas.height], offset); offset += 2;
    this.m_uniformCPU.set([this.m_frameIndex], offset); offset += 1;

    IGPU.get().queue.writeBuffer(this.m_uniformBuffer, 0, this.m_uniformCPU);
  }
}

export { PathTracer };