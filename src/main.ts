import * as THREE from "three";
import * as wt from "../lib/wtrace";
import "./main.css";

var canvas: HTMLCanvasElement;
var fpsElement: HTMLTextAreaElement;
var fpsDisplayTimer: number;
var camera: THREE.PerspectiveCamera;
var cameraController: wt.CameraController;
var pathTracer: wt.PathTracer;
var objLoader: wt.OBJLoader;

const onUpdate = () => {
  // update camera
  cameraController.update(wt.Application.getDeltaTime());

  // render
  pathTracer.render(camera);

  if (cameraController.isUpdated()) {
    pathTracer.reset();
  }

  if (fpsDisplayTimer > 0.1) {
    fpsElement!.innerText = `FPS: ${Math.floor(1 / wt.Application.getDeltaTime())}`;
    fpsDisplayTimer = 0;
  }

  fpsDisplayTimer += wt.Application.getDeltaTime();
};

const main = async () => {
  await wt.Application.init();

  canvas = document.getElementById("wt_canvas-webgpu") as HTMLCanvasElement;

  camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.01, 1000);
  cameraController = new wt.CameraController({ camera: camera });

  fpsElement = document.getElementById("wt_fps") as HTMLTextAreaElement;
  fpsDisplayTimer = 0;

  objLoader = new wt.OBJLoader();
  const vertices: Float32Array | undefined = await objLoader.load("assets/suzanne.obj");

  if (vertices === undefined) {
    console.error("No valid obj provided, vertex buffer is empty. Terminating...");
    return;
  }

  pathTracer = new wt.PathTracer(canvas, vertices);

  wt.Application.run(onUpdate);
};

main();
