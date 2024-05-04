import * as THREE from "three";
import { CameraController } from "./camera/camera-controller";
import { InputSystem } from "./input-system/input-system";
import { PathTracer } from "./renderer/path-tracer";
import { IGPU } from "./renderer/igpu";
import { SceneManager, setOnSceneLoadCallback } from "./scene/scene-manager";

class Application {
    public static async init(canvas: HTMLCanvasElement) {
        // init GPU context (TODO: take it from the client)
        await IGPU.init();

        // init canvas context
        this.m_canvasContext = canvas.getContext("webgpu") as GPUCanvasContext;
        this.m_canvasContext.configure({device: IGPU.get(), format: "bgra8unorm" as GPUTextureFormat});

        // input system
        InputSystem.init();

        // camera
        this.m_camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.01, 1000);
        this.m_cameraController = new CameraController({ camera: this.m_camera });

        // set scene load callback
        setOnSceneLoadCallback(Application._onSceneLoad);

        // init path tracer
        this.m_pathTracer = new PathTracer(this.m_canvasContext);
    }

    public static onNextFrame() {
        Application.m_deltaTime = (performance.now() - this.m_time) * 0.001;
        this.m_time = performance.now();

        // update path tracer
        if (this.m_cameraController.update(this.m_deltaTime)) {
            this.m_pathTracer.resetAccumulation();
        }

        this.m_pathTracer.render(this.m_camera);
    }

    public static getDeltaTime(): number {
        return Application.m_deltaTime;
    }

    private static m_time: number = 0;
    private static m_deltaTime: number;
    
    private static m_canvasContext: GPUCanvasContext;
    private static m_camera: THREE.PerspectiveCamera;
    private static m_cameraController: CameraController;
    private static m_pathTracer: PathTracer;

    private static _onSceneLoad() {
        Application.m_pathTracer.setScene(SceneManager.scene);
    }

    private constructor() {}
}

export { Application };
