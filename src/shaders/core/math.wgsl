//---------------------------------------
//  math utils
//---------------------------------------
const MAX_FLOAT32: f32 = 3.402823466e+38;

const PI: f32 = 3.141592653589793;

// from pixar - https://graphics.pixar.com/library/OrthonormalB/paper.pdf
fn basis(n: vec3f, b1: ptr<function, vec3f>, b2: ptr<function, vec3f>) {
    if (n.z < 0.0) {
        let a: f32 = 1.0 / (1.0 - n.z);
        let b: f32 = n.x * n.y * a;
        *b1 = vec3f(1.0 - n.x * n.x * a, -b, n.x);
        *b2 = vec3f(b, n.y * n.y * a - 1.0, -n.y);
    } else {
        let a: f32 = 1.0 / (1.0 + n.z);
        let b: f32 = -n.x * n.y * a;
        *b1 = vec3f(1.0 - n.x * n.x * a, b, -n.x);
        *b2 = vec3f(b, 1.0 - n.y * n.y * a, -n.y);
    }
}

fn toWorld(x: vec3f, y: vec3f, z: vec3f, v: vec3f) -> vec3f {
    return v.x * x + v.y * y + v.z * z;
}

fn toLocal(x: vec3f, y: vec3f, z: vec3f, v: vec3f) -> vec3f {
    return vec3f(dot(v, x), dot(v, y), dot(v, z));
}

fn inversesqrt(x: f32) -> f32 {
    return 1.0 / sqrt(x);
}

fn luma(color: vec3f) -> f32 {
    return dot(color, vec3f(0.299, 0.587, 0.114));
}