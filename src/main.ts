import "./main.css";
import * as wt from "../lib/wtrace";
import * as THREE from "three";
import * as test from "./test-scenes";

// camera controller
let cameraController: wt.CameraController;

async function init() {
    // get the target canvas
    const canvas: HTMLCanvasElement = document.getElementById("wt_canvas-webgpu") as HTMLCanvasElement;

    // init the application
    await wt.Application.init(canvas);

    // create camera and camera controller
    let camera: THREE.Camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.01, 1000);
    cameraController = new wt.CameraController({ camera: camera });

    // create scene
    let scene: wt.Scene = await test.create10kDamagedHelmet();
    scene.camera = camera;

    // load the scene
    wt.SceneManager.loadScene(scene);

    // application loop
    animate();
} 

function animate() {
    // get the next frame
    requestAnimationFrame(animate);

    // call the camera controller update and inform the application that a change has occurred in the scene
    if (cameraController.update(wt.Application.deltaTime)) {
        wt.Application.updateScene();
    }

    // render the scene
    wt.Application.onNextFrame();
}

init();