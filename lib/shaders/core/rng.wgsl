//---------------------------------------
//  random number generators
//---------------------------------------
//https://www.reedbeta.com/blog/hash-functions-for-gpu-rendering/
fn pcg(n: ptr<function,u32>) -> u32 {
    var h = (*n) * 747796405u + 2891336453u;
    *n = h;
    h = ((h >> ((h >> 28u) + 4u)) ^ h) * 277803737u;
    return (h >> 22u) ^ h;
}

fn frand(seed: ptr<function,u32>) -> f32 {      // [0 - 1]
    return fract(f32(pcg(seed))/4294967296.0);
}

fn frand2(seed: ptr<function,u32>) -> vec2f {   // [0 - 1]
    return vec2f(frand(seed), frand(seed));
}

fn frand3(seed: ptr<function,u32>) -> vec3f {   // [0 - 1]
    return vec3f(frand(seed), frand(seed), frand(seed));
}

fn frand3OnHemisphere(normal: vec3f, seed: ptr<function,u32>) -> vec3f { // [-1 - 1]
    var frand3OnSphere: vec3f = normalize(frand3(seed) * 2 - 1);

    if (dot(frand3OnSphere, normal) > 0) {
        return frand3OnSphere;
    }

    return -frand3OnSphere;
}

//https://www.shadertoy.com/view/lssfD7
fn cosineSampleHemisphere(n: vec3f, seed: ptr<function,u32>) -> vec3f {
    let rnd: vec2f = frand2(seed);

    let a: f32 = PI * 2.0 * rnd.x;
    let b: f32 = 2.0 * rnd.y - 1.0;
    
    let dir_x: f32 = sqrt(1.0 - b * b) * cos(a);
    let dir_y: f32 = sqrt(1.0 - b * b) * sin(a);
    let dir_z: f32 = b;
    
    let dir: vec3f = vec3f(dir_x, dir_y, dir_z);
    return normalize(n + dir);
}