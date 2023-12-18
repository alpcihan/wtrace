import { InputSystem } from "./input-system";
import { PathTracer } from "./path-tracer";

class Application {
	public static async init() {
		// context
		await this._initWebGPUDevice();

		// input system
		InputSystem.init();

		// path tracer
        PathTracer.init(Application.m_device);
	}

	public static run(onUpdate: () => void) {
        const applicationLoop = (): void => {
            Application.m_deltaTime = (performance.now() - this.m_time) * 0.001;
            this.m_time = performance.now();

            onUpdate();

            requestAnimationFrame(applicationLoop);
        }

        applicationLoop();
	}

    public static getDeltaTime(): number {
        return Application.m_deltaTime;
    }

    private static m_device: GPUDevice;
    private static m_time: number = 0;
    private static m_deltaTime: number;

	private static async _initWebGPUDevice() {
		const gpu = navigator.gpu;
		if (!gpu) throw new Error("GPU is not found on this browser.");

		const adapter = (await gpu.requestAdapter()) as GPUAdapter;
		if (!adapter) throw new Error("Adapter is not found on this browser.");

		//if (this.m_useReadWriteStorageExperimental) {
		//    const feature: GPUFeatureName = "chromium-experimental-read-write-storage-texture" as GPUFeatureName;
		//    if (!adapter.features.has(feature)) throw new Error("Read-write storage texture support is not available");
		//    this.m_device = await adapter.requestDevice({ requiredFeatures: [feature] }) as GPUDevice;
		//    return;
		//}

		Application.m_device = (await adapter.requestDevice()) as GPUDevice;
	}

    private constructor() {}
}

export { Application };
