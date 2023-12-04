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

    let horizontal: f32 = (f32(texelCoord.x) - f32(screenSize.x) / 2) / f32(screenSize.x); // [-1, 1]
    let vertical: f32 = (f32(texelCoord.y) - f32(screenSize.y) / 2) / f32(screenSize.x);   // [-1, 1]
    let forward: vec3f = vec3f(1.0, 0.0, 0.0);
    let right: vec3f = vec3f(0.0, -1.0, 0.0);
    let up: vec3f = vec3f(0.0, 0.0, 1.0);

    var sphere: Sphere;
    sphere.center = vec3f(3.0, 0.0, 0.0);
    sphere.radius = 0.5;

    var ray: Ray;
    ray.direction = normalize(forward + horizontal * right + vertical * up);
    ray.origin = origin;

    var pixel_color : vec3f = vec3f(1.0, 0.0, 0.0);

    if (hit(ray, sphere)) {
        pixel_color = vec3f(0.0, 1.0, 0.0);
    }

    textureStore(colorBuffer, texelCoord, vec4f(pixel_color, 1.0));
}

fn hit(ray: Ray, sphere: Sphere) -> bool {
    
    let a: f32 = dot(ray.direction, ray.direction);
    let b: f32 = 2.0 * dot(ray.direction, ray.origin - sphere.center);
    let c: f32 = dot(ray.origin - sphere.center, ray.origin - sphere.center) - sphere.radius * sphere.radius;
    let discriminant: f32 = b * b - 4.0 * a * c;

    return discriminant > 0;
}