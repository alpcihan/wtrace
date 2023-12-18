import * as THREE from 'three';
import { PathTracer } from '../lib/path-tracer';

const main = async () => {
    const canvas = document.getElementById('wt_canvas-webgpu') as HTMLCanvasElement;    
    const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.01, 1000);

    const pathTracer: PathTracer = new PathTracer({canvas});
    await pathTracer.init();
    
    var frameCount: number= 0;
    var lastFrameTime: number= performance.now();
    var fpsElement = document.getElementById("wt_fps");

    (function applicationLoop() {
        const timeElapsed = performance.now()- lastFrameTime;
        if(timeElapsed> 1000) {
            fpsElement!.innerText = `FPS: ${frameCount}`;
            frameCount = 0;
            lastFrameTime = performance.now();
        }
        pathTracer.render(camera);
        requestAnimationFrame(() => applicationLoop());
        frameCount++;
    })();
}

main();