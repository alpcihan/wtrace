import { PathTracer } from '../lib/path-tracer';

const main = async () => {
    const canvas = document.getElementById('wt_canvas-webgpu') as HTMLCanvasElement;
    
    const pathTracer: PathTracer = new PathTracer({canvas});
    await pathTracer.init();

    (function applicationLoop() {       
        pathTracer.render();
        requestAnimationFrame(() => applicationLoop());
    })();
}

main();