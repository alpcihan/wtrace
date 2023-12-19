import * as THREE from "three";

import rng_shader from "./shaders/rng.wgsl";
import screen_shader from "./shaders/screen_shader.wgsl";
import pathtracer_compute from "./shaders/pathtracer_compute.wgsl";

class PathTracer {
  public static init(device: GPUDevice): void {
    PathTracer.m_device = device;
  }

  constructor(canvas: HTMLCanvasElement, triangleVertices: Float32Array) {
    this.m_canvas = canvas;

    this._initContext();
    this._initAssets();
    this.setScene(triangleVertices);
    this._initPipelines();
  }

  public reset(): void {
    const frameInfo = new Float32Array(this.m_canvas.height * this.m_canvas.width * 4).fill(0);
    PathTracer.m_device.queue.writeBuffer(this.m_frameInfoBuffer, 0, frameInfo);
  }

  public setScene(triangleVertices: Float32Array): void {
    this.m_triangleVertexBuffer = PathTracer.m_device.createBuffer({
      size: triangleVertices.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    PathTracer.m_device.queue.writeBuffer(this.m_triangleVertexBuffer, 0, triangleVertices);
  }

  public render(camera: THREE.PerspectiveCamera): void {
    this._updateUniforms(camera);

    const cmd: GPUCommandEncoder = PathTracer.m_device.createCommandEncoder();

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

    PathTracer.m_device.queue.submit([cmd.finish()]);
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

  private m_colorTexture: GPUTexture;
  private m_colorBufferView: GPUTextureView;
  private m_sampler: GPUSampler;

  private m_frameInfoBuffer: GPUBuffer;

  private m_frameIndex: number = 0;

  private _initContext() {
    this.m_context = this.m_canvas.getContext("webgpu") as GPUCanvasContext;
    this.m_context.configure({
      device: PathTracer.m_device,
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

      this.m_uniformBuffer = PathTracer.m_device.createBuffer({
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
    }

    // color buffer + texture
    {
      this.m_colorTexture = PathTracer.m_device.createTexture({
        size: {
          width: this.m_canvas.width,
          height: this.m_canvas.height,
        },
        format: "rgba8unorm",
        usage:
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.STORAGE_BINDING |
          GPUTextureUsage.TEXTURE_BINDING,
      });
      this.m_colorBufferView = this.m_colorTexture.createView();
      this.m_sampler = PathTracer.m_device.createSampler({
        addressModeU: "repeat",
        addressModeV: "repeat",
        magFilter: "linear",
        minFilter: "nearest",
        mipmapFilter: "nearest",
        maxAnisotropy: 1,
      });

      this.m_frameInfoBuffer = PathTracer.m_device.createBuffer({
        size: this.m_canvas.width * this.m_canvas.height * 4 * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
    }
  }

  private _initPipelines() {
    // path tracer pass
    {
      const pathTracingBindGroupLayout = PathTracer.m_device.createBindGroupLayout({
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

      this.m_pathTracingPipelineBindGroup = PathTracer.m_device.createBindGroup({
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
            resource: { buffer: this.m_frameInfoBuffer },
          },
        ],
      });

      const pathTracingPipelineLayout = PathTracer.m_device.createPipelineLayout({
        bindGroupLayouts: [pathTracingBindGroupLayout],
      });

      const pathTracingShader = rng_shader + pathtracer_compute;
      this.m_pathTracingPipeline = PathTracer.m_device.createComputePipeline({
        label: "path tracing compute pipeline",
        layout: pathTracingPipelineLayout,
        compute: {
          module: PathTracer.m_device.createShaderModule({
            code: pathTracingShader,
          }),
          entryPoint: "main",
        },
      });
    }

    // screen pass
    {
      const screenBindGroupLayout = PathTracer.m_device.createBindGroupLayout({
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

      this.m_screenPipelineBindGroup = PathTracer.m_device.createBindGroup({
        layout: screenBindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: { buffer: this.m_uniformBuffer },
          },
          {
            binding: 1,
            resource: { buffer: this.m_frameInfoBuffer },
          },
        ],
      });

      const screenPipelineLayout = PathTracer.m_device.createPipelineLayout({
        bindGroupLayouts: [screenBindGroupLayout],
      });

      this.m_screenPipeline = PathTracer.m_device.createRenderPipeline({
        label: "fullscreen texture presentation render pipeline",
        layout: screenPipelineLayout,
        vertex: {
          module: PathTracer.m_device.createShaderModule({
            code: screen_shader,
          }),
          entryPoint: "vs_main",
        },

        fragment: {
          module: PathTracer.m_device.createShaderModule({
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
    this.m_uniformCPU.set(camera.matrixWorldInverse.toArray(), offset); offset += 4 * 4;
    this.m_uniformCPU.set(camera.projectionMatrixInverse.toArray(), offset); offset += 4 * 4;
    this.m_uniformCPU.set([this.m_canvas.width, this.m_canvas.height], offset); offset += 2;
    this.m_uniformCPU.set([this.m_frameIndex], offset); offset += 1;

    PathTracer.m_device.queue.writeBuffer(this.m_uniformBuffer, 0, this.m_uniformCPU);
  }
}

export { PathTracer };
