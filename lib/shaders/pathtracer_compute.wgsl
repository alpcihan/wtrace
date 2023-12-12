// enable chromium_experimental_read_write_storage_texture;

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var colorBuffer: texture_storage_2d<rgba8unorm, write>;

struct Sphere {
    center: vec3f,
    radius: f32,
};

struct Ray {
    direction: vec3f,
    origin: vec3f,
};

struct Uniforms {
    view_i: mat4x4f,
    projection_i: mat4x4f,
};

@compute @workgroup_size(8,8,1)
fn main(@builtin(global_invocation_id) globalInvocationID : vec3u) {

    let screenSize: vec2i = vec2i(textureDimensions(colorBuffer));
    let texelCoord : vec2i = vec2i(i32(globalInvocationID.x), i32(globalInvocationID.y));
    if (texelCoord.x >= screenSize.x || texelCoord.y >= screenSize.y) {
        return;
    }

    // let uv: vec2f = (vec2f(texelCoord) / vec2f(screenSize)) * 2 - 1;
    // var ray: Ray = createCameraRay(uv, uniforms.view_i, uniforms.projection_i);

    // var sphere: Sphere;
    // sphere.center = vec3f(0.0, 0.0, -2.0);
    // sphere.radius = 0.5;

    // var pixel_color : vec3f = vec3f(1.0, 0, 0.0);

    // if (hit(ray, sphere)) {
    //     pixel_color = vec3f(0.0, 1.0, 0.0);
    // }
    var seed: u32 = u32(texelCoord.x + texelCoord.y * screenSize.x);
    var pixel_color: vec3f = vec3f(frand(seed));
    //var pixel_color: vec3f = vec3f(0.0, 1.0, 0.0);

    textureStore(colorBuffer, texelCoord, vec4f(pixel_color, 1.0));
}

fn createCameraRay(uv: vec2f, view_i: mat4x4f, projection_i: mat4x4f) -> Ray {
    var ray: Ray;

    ray.direction = normalize((projection_i * vec4f(uv, 0, 1)).xyz);
    ray.origin = (view_i * vec4f(0,0,0,1)).xyz;

    return ray;
} 

fn hit(ray: Ray, sphere: Sphere) -> bool {
    
    let a: f32 = dot(ray.direction, ray.direction);
    let b: f32 = 2.0 * dot(ray.direction, ray.origin - sphere.center);
    let c: f32 = dot(ray.origin - sphere.center, ray.origin - sphere.center) - sphere.radius * sphere.radius;
    let discriminant: f32 = b * b - 4.0 * a * c;

    return discriminant > 0;
}

fn pcg(n: u32) -> u32 {
    var h = n * 747796405u + 2891336453u;
    h = ((h >> ((h >> 28u) + 4u)) ^ h) * 277803737u;
    return (h >> 22u) ^ h;
}

fn frand(seed: u32) -> f32 {
    return f32(pcg(seed))/4294967296.0;
}

fn cosineDirection(seed: u32,nor: vec3f) -> vec3f {
    var  u: f32 = frand(seed);
    var  v: f32 = frand(seed);

    var a: f32 = 6.2831853 * u;
    var b: f32 = 2.0 * u - 1.0;
    var direction: vec3f = vec3f(sqrt(1.0 - b * b) * vec2f(cos(a),sin(a)),b);
    return normalize(nor+direction);
}