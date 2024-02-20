//---------------------------------------
//  math utils
//---------------------------------------
// from pixar - https://graphics.pixar.com/library/OrthonormalB/paper.pdf
fn basis(n: vec3<f32>, b1: ptr<function, vec3f>, b2: ptr<function, vec3f>) {
    if (n.z < 0.0) {
        let a: f32 = 1.0 / (1.0 - n.z);
        let b: f32 = n.x * n.y * a;
        *b1 = vec3<f32>(1.0 - n.x * n.x * a, -b, n.x);
        *b2 = vec3<f32>(b, n.y * n.y * a - 1.0, -n.y);
    } else {
        let a: f32 = 1.0 / (1.0 + n.z);
        let b: f32 = -n.x * n.y * a;
        *b1 = vec3<f32>(1.0 - n.x * n.x * a, b, -n.x);
        *b2 = vec3<f32>(b, 1.0 - n.y * n.y * a, -n.y);
    }
}

//---------------------------------------
//  BRDF
//---------------------------------------


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
fn cosineDirection(seed: ptr<function,u32>, nor: vec3f) -> vec3f {
    var  u: f32 = frand(seed);
    var  v: f32 = frand(seed);

    var a: f32 = 6.2831853 * v;
    var b: f32 = 2.0 * u - 1.0;
    var direction: vec3f = vec3f(sqrt(1.0 - b * b) * vec2f(cos(a),sin(a)),b);
    return normalize(nor+direction);
}