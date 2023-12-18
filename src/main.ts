import * as THREE from 'three';
import * as wt from '../lib/wtrace';

var canvas: HTMLCanvasElement;
var fpsElement: HTMLTextAreaElement;
var fpsDisplayTimer: number;
var camera: THREE.PerspectiveCamera;
var cameraController: wt.CameraController;
var pathTracer: wt.PathTracer;

const onUpdate = () => {
	// update camera
	cameraController.update(wt.Application.getDeltaTime());

	// render
	pathTracer.render(camera);

	if(fpsDisplayTimer > 0.1) {
		fpsElement!.innerText = `FPS: ${Math.floor(1/wt.Application.getDeltaTime())}`;
		fpsDisplayTimer = 0;
	}
	
	fpsDisplayTimer += wt.Application.getDeltaTime();
}

const main = async () => {
	await wt.Application.init();

    canvas = document.getElementById('wt_canvas-webgpu') as HTMLCanvasElement;  
	pathTracer = new wt.PathTracer(canvas);

    camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.01, 1000);
	cameraController = new wt.CameraController({camera: camera});
	
	fpsElement = document.getElementById('wt_fps') as HTMLTextAreaElement;
	fpsDisplayTimer = 0;

	wt.Application.run(onUpdate);
}

main();