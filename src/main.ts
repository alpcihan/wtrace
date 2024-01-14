import * as wt from "../lib/wtrace";
import "./main.css";

var canvas: HTMLCanvasElement;
var fpsElement: HTMLTextAreaElement;
var fpsDisplayTimer: number;

const onUpdate = () => {
    if (fpsDisplayTimer > 0.1) {
        fpsElement!.innerText = `FPS: ${Math.floor(1 / wt.Application.getDeltaTime())}`;
        fpsDisplayTimer = 0;
    }

    fpsDisplayTimer += wt.Application.getDeltaTime();
};

const main = async () => {
    canvas = document.getElementById("wt_canvas-webgpu") as HTMLCanvasElement;

    fpsElement = document.getElementById("wt_fps") as HTMLTextAreaElement;
    fpsDisplayTimer = 0;

    // init the application
    await wt.Application.init(canvas);

    // create the scene
    let scene: wt.Scene = new wt.Scene();

    // load the models (TODO: make async)
    let mesh: wt.Mesh | undefined = await wt.MeshLoader.load("assets/suzanne.obj");

    if (mesh !== undefined) {
        let model: wt.MeshModel = new wt.MeshModel(mesh);
        scene.add(model);
    }

    // load the scene
    wt.SceneManager.loadScene(scene);

    wt.Application.run(onUpdate);
};

main();
