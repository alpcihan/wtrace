import * as THREE from "three";

// shaders (TODO: preprocess)
import math_shader from "../../shaders/core/math.wgsl";
import ray_shader from "../../shaders/core/ray.wgsl";
import bvh_shader from "../../shaders/core/bvh.glsl";
import bsdf_shader from "../../shaders/core/bsdf.wgsl";
import rng_shader from "../../shaders/core/rng.wgsl";
import pathtracer_compute from "../../shaders/pathtracer_compute.wgsl";
import screen_shader from "../../shaders/screen_shader.wgsl";

import { IGPU } from "./igpu";
import { SceneManager } from "../scene/scene-manager";

class PathTracer {
    constructor(canvas: HTMLCanvasElement) {
        // TODO: create a scene loader + model system, instead of passing raw vertices in constructor
        this.m_canvas = canvas;

        this._initContext();
        this._initAssets();
        SceneManager.scene.sceneDataManager.buildSceneData(); // TODO: find a better place
        this._initPipelines();
    }

    public reset(): void {
        const frameInfo = new Float32Array(this.m_canvas.height * this.m_canvas.width * 4).fill(0);
        IGPU.get().queue.writeBuffer(this.m_accumulationBuffer, 0, frameInfo);
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

    // canvas
    private m_canvas: HTMLCanvasElement;
    private m_context: GPUCanvasContext;

    // passes
    private m_pathTracingPipeline: GPUComputePipeline;
    private m_pathTracingPipelineBindGroup: GPUBindGroup;
    private m_screenPipeline: GPURenderPipeline;
    private m_screenPipelineBindGroup: GPUBindGroup;

    // assets
    private m_uniformElementCount: Float32Array;
    private m_uniformBuffer: GPUBuffer;
    private m_uniformCPU: Float32Array; // do not change it (TODO: create a separate class for uniforms and make it readonly)

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
            //Holds the size of each element in the uniform buffer (in floats)
            this.m_uniformElementCount = new Float32Array([
                4 * 4, // view
                4 * 4, // projection
                2,     // image resolution
                1,     // frame index with padding (for random number generator)
                1      // padding
            ]);
            const uniformBufferSize = this.m_uniformElementCount.reduce((a, b) => a + b, 0) * 4; //uniformBufferSize in bytes
                
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
                        // normals
                        binding: 2,
                        visibility: GPUShaderStage.COMPUTE,
                        buffer: {
                            type: "read-only-storage",
                        },
                    },
                    {
                        // uv
                        binding: 3,
                        visibility: GPUShaderStage.COMPUTE,
                        buffer: {
                            type: "read-only-storage",
                        },
                    },
                    {
                        // render image (as storage buffer)
                        binding: 4,
                        visibility: GPUShaderStage.COMPUTE,
                        buffer: {
                            type: "storage",
                        },
                    },
                    {
                        // triangle indices
                        binding: 5,
                        visibility: GPUShaderStage.COMPUTE,
                        buffer: {
                            type: "read-only-storage",
                        },
                    },
                    {
                        // blas nodes
                        binding: 6,
                        visibility: GPUShaderStage.COMPUTE,
                        buffer: {
                            type: "read-only-storage",
                        },
                    },
                    {
                        // blas instances
                        binding: 7,
                        visibility: GPUShaderStage.COMPUTE,
                        buffer: {
                            type: "read-only-storage",
                        },
                    },
                    {
                        // materials
                        binding: 8,
                        visibility: GPUShaderStage.COMPUTE,
                        buffer: {
                            type: "read-only-storage",
                        },
                    },
                    {
                        // Texture
                        binding : 9,
                        visibility: GPUShaderStage.COMPUTE,
                        texture: {
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
                        resource: { buffer: SceneManager.scene.sceneDataManager.vertexBuffer },
                    },
                    {
                        binding: 2,
                        resource: { buffer: SceneManager.scene.sceneDataManager.normalBuffer},
                    },
                    {
                        binding: 3,
                        resource: { buffer: SceneManager.scene.sceneDataManager.uvBuffer},
                    },
                    {
                        binding: 4,
                        resource: { buffer: this.m_accumulationBuffer },
                    },
                    {
                        binding: 5,
                        resource: { buffer: SceneManager.scene.sceneDataManager.triangleIdxBuffer },
                    },
                    {
                        binding: 6,
                        resource: { buffer: SceneManager.scene.sceneDataManager.blasBuffer },
                    },
                    {
                        binding: 7,
                        resource: { buffer: SceneManager.scene.sceneDataManager.blasInstanceBuffer },
                    },
                    {
                        binding: 8,
                        resource: { buffer: SceneManager.scene.sceneDataManager.materialBuffer },
                    },
                    {
                        binding: 9,
                        resource: SceneManager.scene.sceneDataManager.textureView,
                    },
              
                ],
            });
            const pathTracingPipelineLayout = IGPU.get().createPipelineLayout({
                bindGroupLayouts: [pathTracingBindGroupLayout],
            });

            const pathTracingShader =   math_shader
                                      + rng_shader 
                                      + ray_shader
                                      + bvh_shader
                                      + bsdf_shader
                                      + pathtracer_compute;

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
        this.m_uniformCPU.set(camera.matrixWorld.toArray(), offset);
        offset += this.m_uniformElementCount[0];
        this.m_uniformCPU.set(camera.projectionMatrixInverse.toArray(), offset);
        offset += this.m_uniformElementCount[1];
        this.m_uniformCPU.set([this.m_canvas.width, this.m_canvas.height], offset);
        offset += this.m_uniformElementCount[2];
        this.m_uniformCPU.set([this.m_frameIndex], offset);
        offset += this.m_uniformElementCount[3];

        IGPU.get().queue.writeBuffer(this.m_uniformBuffer, 0, this.m_uniformCPU);
    }
}

export { PathTracer };
