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

  const vertices: Float32Array | undefined = await wt.OBJLoader.load("assets/suzanne.obj");

  if (vertices === undefined) {
    console.error("No valid obj provided, vertex buffer is empty. Terminating...");
    return;
  }

  await wt.Application.init(canvas, vertices);

  wt.Application.run(onUpdate);
};

main();
