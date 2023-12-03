import triangle from './shaders/triangle.wgsl';

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
        this._initPipelines();
    }

    public render() {
        const view = this.m_context.getCurrentTexture().createView();
        const presentPass: GPURenderPassDescriptor = {
            colorAttachments: [{
                view : view,
                clearValue: { r: 0, g: 0, b: 0, a: 1.0 }, //background color
                loadOp: 'clear',
                storeOp: 'store'
            }]
        };

        const cmd = this.m_device.createCommandEncoder({ label: 'our encoder' });

        const renderPassEncoder = cmd.beginRenderPass(presentPass);
        renderPassEncoder.setPipeline(this.m_presentPass);
        renderPassEncoder.draw(3, 1, 0, 0);
        renderPassEncoder.end();

        this.m_device.queue.submit([cmd.finish()]);
    }

    public terminate() {
        throw new Error('Function is not implemented.');
    }

    private m_device: GPUDevice;
    private m_canvas: HTMLCanvasElement;
    private m_context: GPUCanvasContext;

    private m_presentPass: GPURenderPipeline;

    private async _initWebGPUDevice() {
        const gpu = navigator.gpu;
        if (!gpu) throw new Error('GPU is not found on this browser.');

        const adapter = await gpu.requestAdapter() as GPUAdapter;
        if (!adapter) throw new Error('Adapter is not found on this browser.');

        this.m_device = await adapter.requestDevice() as GPUDevice;
    }

    private _initContext() {
        this.m_context = this.m_canvas.getContext('webgpu') as GPUCanvasContext;
        this.m_context.configure({
            device: this.m_device,
            format: 'bgra8unorm' as GPUTextureFormat
        });
    }

    private _initPipelines() {
        const vs = this.m_device.createShaderModule({ code: triangle });
        const fs = this.m_device.createShaderModule({ code: triangle });
        this.m_presentPass = this.m_device.createRenderPipeline({
            label: "present pass render pipeline",
            layout: 'auto',
            vertex: {
                module: vs,
                entryPoint: "vs_main"
            },
            fragment: {
                module: fs,
                entryPoint: "fs_main",
                targets: [{
                    format: 'bgra8unorm' as GPUTextureFormat
                }]
            },
            primitive: {
                topology: "triangle-list"
            }
        });
    }
};

export { PathTracer };