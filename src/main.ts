import "./main.css";
import * as THREE from "three";
import * as wt from "../lib/wtrace";
import { randFloat } from "three/src/math/MathUtils";

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
    let mesh: wt.Mesh | undefined = await wt.MeshLoader.load("assets/xyz.obj");
    const scale: number = 0.025;
    if(mesh === undefined) return;

    const dim: number = 4;
    for (let z = 0; z < dim; z++) {
        for (let x = 0; x < dim; x++) {
            // material
            let material: wt.Material = new wt.Material();

            const color: THREE.Vector3 = new THREE.Vector3(randFloat(0,1), randFloat(0,1), randFloat(0,1));
            material.baseColor = color;
            material.emissiveColor = randFloat(0,1) < 0.9 ? new THREE.Vector3(0,0,0) : color.clone().multiplyScalar(2);
            material.roughness = randFloat(0,1);
            material.metallic = randFloat(0,1);
        
            let model: wt.MeshModel = new wt.MeshModel(mesh, material);

            // transform
            const off: number = scale * dim * 0.5;
            model.position = new THREE.Vector3((x + off) * 4, 0, (z - off) * 4);
            model.euler = new THREE.Euler(0, 0, 0);
            model.scale = new THREE.Vector3(scale, scale, scale);
        
            scene.add(model);
        }
    }

    // load the scene
    wt.SceneManager.loadScene(scene);

    wt.Application.run(onUpdate);
};

main();
