import * as THREE from 'three';
import { PathTracer } from '../lib/path-tracer';

const main = async () => {
    const canvas = document.getElementById('wt_canvas-webgpu') as HTMLCanvasElement;    
    const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.01, 1000);
    const pathTracer: PathTracer = new PathTracer({canvas});
    await pathTracer.init();

    // Define the speed of the camera movement
    const speed = 0.1;

    // Add event listener for keydown events
    window.addEventListener('keydown', (event) => {
        switch (event.key) {
            case 'w':
                // Move forward
                camera.position.z += speed;
                break;
            case 's':
                // Move backward
                camera.position.z -= speed;
                break;
            case 'a':
                // Move left
                camera.position.x += speed;
                break;
            case 'd':
                // Move right
                camera.position.x -= speed;
                break;
            //space
            case ' ':
                // Move up
                camera.position.y -= speed;
                break;
            //shift
            case 'Shift':
                // Move down
                camera.position.y += speed;
                break;
        }
        camera.updateMatrix();
        camera.updateMatrixWorld(true);
    });

    (function applicationLoop() {
        pathTracer.render(camera);
        requestAnimationFrame(() => applicationLoop());
    })();
}

main();