import "./main.css";
import * as wt from "../lib/wtrace";
import * as test from "./test-scenes";

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
   // let scene: wt.Scene = new wt.Scene(); //TODO: Add texture scene
//
   // // load the models (TODO: make async)
   // let mesh: wt.Mesh | undefined = await wt.MeshLoader.load("assets/spot_triangulated.obj");
   // let albedoTexture = await wt.TextureLoader.load("assets/spot_texture.png");
//
   // for (let z = 0; z < 1; z++) {
   //     for (let x = 0; x < 1; x++) {
   //         if (mesh === undefined) continue;
   //         // material
   //         let material: wt.Material = new wt.Material(albedoTexture);
   //         const color: THREE.Vector3 = new THREE.Vector3(randFloat(0, 1), randFloat(0, 1), randFloat(0, 1));
   //         material.baseColor = new THREE.Vector3(randFloat(0, 1), randFloat(0, 1), randFloat(0, 1));
   //         material.emissiveColor = new THREE.Vector3(0,0,0);
   //         
   //         // model
   //         let model: wt.MeshModel = new wt.MeshModel(mesh, material);
   //         model.position = new THREE.Vector3(0, 0, 0);
   //         model.euler = new THREE.Euler(0, 0, 0);
   //         model.scale = new THREE.Vector3(1, 1, 1);
//
   //         scene.add(model);
   //     }
   // }

    let scene: wt.Scene = await test.createCornellBoxScene();

    // load the scene
    wt.SceneManager.loadScene(scene);

    wt.Application.run(onUpdate);
};
main();
