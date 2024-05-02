import "./main.css";
import * as wt from "../lib/wtrace";
import * as test from "./test-scenes";

// UI elements
let canvas: HTMLCanvasElement =         document.getElementById("wt_canvas-webgpu") as HTMLCanvasElement;
let fpsElement: HTMLTextAreaElement =   document.getElementById("wt_fps") as HTMLTextAreaElement;

// global variables
let fpsDisplayTimer: number = 0;

const onUpdate = () => {
    if (fpsDisplayTimer > 0.1) {
        fpsElement!.innerText = `FPS: ${Math.floor(1 / wt.Application.getDeltaTime())}`;
        fpsDisplayTimer = 0;
    }

    fpsDisplayTimer += wt.Application.getDeltaTime();
};

const main = async () => {
    // init the application
    await wt.Application.init(canvas);

    // create scene
    let scene: wt.Scene = await test.create10kDamagedHelmet();

    // load the scene
    wt.SceneManager.loadScene(scene);

    // run the application
    wt.Application.run(onUpdate);
};

main();