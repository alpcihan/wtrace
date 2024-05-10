# WTrace

Realtime WebGPU path tracer (WIP)

Description and screenshots will be added soon.

![wtrace](https://github.com/alpcihan/wtrace/assets/37274614/03900352-f8b5-44da-bb95-3d8ead83b607)

## Adding to a project
1) Use ```npm run build``` to build the project.
2) Add wtrace to the package.json of your project as a dependency and run ```npm install```.

## Features
- [x] GPU path-tracing with compute shaders
- [x] Acceleration structures
- [x] Instanced geometry
- [x] BRDF importance sampling
- [x] Scene system 
- [x] Material system
- [x] GLTF support
- [x] OBJ support
- [ ] Multi importance sampling
- [ ] Dielectrics
- [ ] Caustics
- [ ] Denoising

## Example usage
### Simple GLTF scene

```js
import * as wt from "wtrace";
import * as THREE from "three";

// camera controller
let cameraController: wt.CameraController;

async function init() {
    // get the target canvas
    const canvas: HTMLCanvasElement = document.getElementById("wt_canvas-webgpu") as HTMLCanvasElement;

    // init the wtrace application
    await wt.Application.init(canvas);

    // create a scene
    let scene: wt.Scene = new wt.Scene();

    // load models
    const meshModels: wt.MeshModel[] = await wt.WTGLTFLoader.load("sponza.glb");
    meshModels.forEach(meshModel => scene.add(meshModel));

    // create camera and camera controller
    scene.camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.01, 1000);
    cameraController = new wt.CameraController({ camera: scene.camera });

    // load the scene
    wt.SceneManager.loadScene(scene);

    // application loop
    animate();
} 

function animate() {
    // get the next frame
    requestAnimationFrame(animate);

    // call the camera controller's update function and set the refresh flag if a change occurs
    if (cameraController.update(wt.Application.deltaTime)) {
        wt.Application.refresh();
    }

    // render the scene
    wt.Application.onNextFrame();
}

init();
```
