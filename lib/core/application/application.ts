import * as THREE from "three";
import { CameraController } from "../camera/camera-controller";
import { InputSystem } from "../input/input-system";
import { PathTracer } from "../renderer/path-tracer";
import { IGPU } from "../renderer/igpu";

class Application {
    public static async init(canvas: HTMLCanvasElement) {
        this.m_canvas = canvas;

        // context
        await IGPU.init();

        // input system
        InputSystem.init();

        // camera
        this.m_camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.01, 1000);
        this.m_cameraController = new CameraController({ camera: this.m_camera });
    }

    public static run(onUpdate: () => void) {
        // path tracer
        this.m_pathTracer = new PathTracer(this.m_canvas);

        const applicationLoop = (): void => {
            Application.m_deltaTime = (performance.now() - this.m_time) * 0.001;
            this.m_time = performance.now();

            // client callback
            onUpdate();

            // update camera controller
            this.m_cameraController.update(this.m_deltaTime);

            // update path tracer
            if (this.m_cameraController.isUpdated()) {
                this.m_pathTracer.reset();
            }
            this.m_pathTracer.render(this.m_camera);

            requestAnimationFrame(applicationLoop);
        };

        applicationLoop();
    }

    public static getDeltaTime(): number {
        return Application.m_deltaTime;
    }

    private static m_time: number = 0;
    private static m_deltaTime: number;
    
    private static m_canvas: HTMLCanvasElement;
    private static m_camera: THREE.PerspectiveCamera;
    private static m_cameraController: CameraController;
    private static m_pathTracer: PathTracer;

    private constructor() {}
}

export { Application };
