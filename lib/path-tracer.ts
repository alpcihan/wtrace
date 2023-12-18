import * as THREE from 'three';

import rng_shader from './shaders/rng.wgsl';
import screen_shader from './shaders/screen_shader.wgsl';
import pathtracer_compute from './shaders/pathtracer_compute.wgsl';

interface PathTracerSettings {
    canvas: HTMLCanvasElement;
}

class PathTracer {
    constructor(settings: PathTracerSettings) {
        this.m_canvas = settings.canvas;
    }

    public async init() {
        await this._initWebGPUDevice();
        this._initContext();
        this._initAssets();
        this._initPipelines();
    }

    public render(camera: THREE.PerspectiveCamera) {
        this._updateUniforms(camera);

        const cmd: GPUCommandEncoder = this.m_device.createCommandEncoder();

        // path trace pass
        {
            const pathTracerPass: GPUComputePassEncoder = cmd.beginComputePass();
            pathTracerPass.setPipeline(this.m_pathTracingPipeline);
            pathTracerPass.setBindGroup(0, this.m_pathTracingPipelineBindGroup);
            pathTracerPass.dispatchWorkgroups(
                Math.floor((this.m_canvas.width + 7) / 8),
                Math.floor((this.m_canvas.height + 7) / 8), 1);
            pathTracerPass.end();
        }

        // screen present pass
        {
            const renderpass: GPURenderPassEncoder = cmd.beginRenderPass({
                colorAttachments: [{
                    view: this.m_context.getCurrentTexture().createView(),
                    clearValue: { r: 0.5, g: 0.0, b: 0.25, a: 1.0 },
                    loadOp: "clear",
                    storeOp: "store"
                }]
            });
            renderpass.setPipeline(this.m_screenPipeline);
            renderpass.setBindGroup(0, this.m_screenPipelineBindGroup);
            renderpass.draw(3, 1, 0, 0);

            renderpass.end();
        }

        this.m_device.queue.submit([cmd.finish()]);
        this.m_frameIndex++;
    }

    public terminate() {
        throw new Error('Function is not implemented.');
    }

    // device/context objects
    private m_device: GPUDevice;
    private m_canvas: HTMLCanvasElement;
    private m_context: GPUCanvasContext;
    private m_useReadWriteStorageExperimental: boolean = false;

    // passes
    private m_pathTracingPipeline: GPUComputePipeline;
    private m_pathTracingPipelineBindGroup: GPUBindGroup;
    private m_screenPipeline: GPURenderPipeline;
    private m_screenPipelineBindGroup: GPUBindGroup;

    // assets
    private m_uniformBuffer: GPUBuffer;
    private m_uniformCPU: Float32Array; // do not change it (TODO: create a separate class for uniforms and make it readonly)

    private m_colorTexture: GPUTexture;
    private m_colorBufferView: GPUTextureView;
    private m_sampler: GPUSampler;

    private m_frameIndex: number = 0;

    private async _initWebGPUDevice() {
        const gpu = navigator.gpu;
        if (!gpu) throw new Error('GPU is not found on this browser.');

        const adapter = await gpu.requestAdapter() as GPUAdapter;
        if (!adapter) throw new Error('Adapter is not found on this browser.');

        if (this.m_useReadWriteStorageExperimental) {
            const feature: GPUFeatureName = "chromium-experimental-read-write-storage-texture" as GPUFeatureName;
            if (!adapter.features.has(feature)) throw new Error("Read-write storage texture support is not available");
            this.m_device = await adapter.requestDevice({ requiredFeatures: [feature] }) as GPUDevice;
            return;
        }

        this.m_device = await adapter.requestDevice() as GPUDevice;
    }

    private _initContext() {
        this.m_context = this.m_canvas.getContext('webgpu') as GPUCanvasContext;
        this.m_context.configure({
            device: this.m_device,
            format: 'bgra8unorm' as GPUTextureFormat
        });
    }

    private _initAssets() {
        // uniform buffer
        {
            const uniformBufferSize = 
                4 * 4 * 4 + // view
                4 * 4 * 4 + // projection
                4 * 4       // frame index with padding (for random number generator) - Umut: Why do we need padding(having an error while there is no padding)? 
            ;

            this.m_uniformCPU = new Float32Array(uniformBufferSize / 4);

            this.m_uniformBuffer = this.m_device.createBuffer({
                size: uniformBufferSize,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
        }

        // color buffer + texture
        {
            this.m_colorTexture = this.m_device.createTexture({
                size: {
                    width: this.m_canvas.width,
                    height: this.m_canvas.height,
                },
                format: "rgba8unorm",
                usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
            });
            this.m_colorBufferView = this.m_colorTexture.createView();
            this.m_sampler = this.m_device.createSampler({
                addressModeU: "repeat",
                addressModeV: "repeat",
                magFilter: "linear",
                minFilter: "nearest",
                mipmapFilter: "nearest",
                maxAnisotropy: 1
            });
        }
    }

    private _initPipelines() {
        // path tracer pass
        {
            const pathTracingBindGroupLayout = this.m_device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.COMPUTE,
                        buffer: {}
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.COMPUTE,
                        storageTexture: {
                            access: "write-only",
                            format: "rgba8unorm",
                            viewDimension: "2d"
                        }
                    },
                ]
            });

            this.m_pathTracingPipelineBindGroup = this.m_device.createBindGroup({
                layout: pathTracingBindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: this.m_uniformBuffer }
                    },
                    {
                        binding: 1,
                        resource: this.m_colorBufferView
                    }
                ]
            });

            const pathTracingPipelineLayout = this.m_device.createPipelineLayout({
                bindGroupLayouts: [pathTracingBindGroupLayout]
            });

            const pathTracingShader = rng_shader + pathtracer_compute;
            this.m_pathTracingPipeline = this.m_device.createComputePipeline({
                label: "path tracing compute pipeline",
                layout: pathTracingPipelineLayout,
                compute: {
                    module: this.m_device.createShaderModule({
                        code: pathTracingShader,
                    }),
                    entryPoint: 'main',
                },
            });
        }

        // screen pass
        {
            const screenBindGroupLayout = this.m_device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.FRAGMENT,
                        sampler: {}
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.FRAGMENT,
                        texture: {}
                    },
                ]
            });

            this.m_screenPipelineBindGroup = this.m_device.createBindGroup({
                layout: screenBindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: this.m_sampler
                    },
                    {
                        binding: 1,
                        resource: this.m_colorBufferView
                    }
                ]
            });

            const screenPipelineLayout = this.m_device.createPipelineLayout({
                bindGroupLayouts: [screenBindGroupLayout]
            });

            this.m_screenPipeline = this.m_device.createRenderPipeline({
                label: "fullscreen texture presentation render pipeline",
                layout: screenPipelineLayout,
                vertex: {
                    module: this.m_device.createShaderModule({
                        code: screen_shader,
                    }),
                    entryPoint: 'vs_main',
                },

                fragment: {
                    module: this.m_device.createShaderModule({
                        code: screen_shader,
                    }),
                    entryPoint: 'fs_main',
                    targets: [
                        {
                            format: "bgra8unorm"
                        }
                    ]
                },

                primitive: {
                    topology: "triangle-list"
                }
            });
        }
    }

    private _updateUniforms(camera: THREE.PerspectiveCamera) {
        this.m_uniformCPU.set(camera.matrixWorldInverse.toArray(), 0);
        this.m_uniformCPU.set(camera.projectionMatrixInverse.toArray(), 4*4);
        this.m_uniformCPU.set([this.m_frameIndex], 4*4*2);

        this.m_device.queue.writeBuffer(this.m_uniformBuffer, 0, this.m_uniformCPU);
    }
};

export { PathTracer };