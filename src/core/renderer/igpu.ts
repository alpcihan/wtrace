class IGPU {
    public static async init(): Promise<void> {
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

        this.m_device = (await adapter.requestDevice()) as GPUDevice;
    }

    public static get(): GPUDevice {
        return this.m_device;
    }

    private static m_device: GPUDevice;

    private constructor() {}
}

export { IGPU };
