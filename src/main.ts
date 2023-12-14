import * as THREE from 'three';
import { PathTracer } from '../lib/path-tracer';

const main = async () => {
    const canvas = document.getElementById('wt_canvas-webgpu') as HTMLCanvasElement;    
    const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.01, 1000);

    const pathTracer: PathTracer = new PathTracer({canvas});
    await pathTracer.init();

    (function applicationLoop() {       
        pathTracer.render(camer2);
        requestAnimationFrame(() => applicationLoop());
    })();
}

main();