import * as THREE from 'three';
import * as wt from '../lib/wtrace';

var canvas: HTMLCanvasElement;
var camera: THREE.PerspectiveCamera;
var cameraController: wt.CameraController;
var pathTracer: wt.PathTracer;

const onUpdate = () => {
	// update camera
	cameraController.update(wt.Application.getDeltaTime());

	// render
	pathTracer.render(camera);
}

const main = async () => {
	await wt.Application.init();

    canvas = document.getElementById('wt_canvas-webgpu') as HTMLCanvasElement;    
    camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.01, 1000);
	cameraController = new wt.CameraController({camera: camera});
	pathTracer = new wt.PathTracer(canvas);

	wt.Application.run(onUpdate);
}

main();