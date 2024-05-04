import "./main.css";
import * as wt from "../lib/wtrace";
import * as test from "./test-scenes";

async function init() {
    // get the target canvas
    const canvas: HTMLCanvasElement = document.getElementById("wt_canvas-webgpu") as HTMLCanvasElement;

    // init the application
    await wt.Application.init(canvas);

    // create scene
    let scene: wt.Scene = await test.create10kDamagedHelmet();

    // load the scene
    wt.SceneManager.loadScene(scene);

    // application loop
    animate();
} 

function animate(): void {
    
    // next frame
    requestAnimationFrame(animate);
    wt.Application.onNextFrame();
}

init();