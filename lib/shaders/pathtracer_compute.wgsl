// enable chromium_experimental_read_write_storage_texture;

@group(0) @binding(0) var colorBuffer: texture_storage_2d<rgba8unorm, write>;

struct Sphere {
    center: vec3<f32>,
    radius: f32,
}

struct Ray {
    direction: vec3<f32>,
    origin: vec3<f32>,
}

@compute @workgroup_size(8,8,1)
fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {

    let screenSize: vec2<i32> = vec2<i32>(textureDimensions(colorBuffer));
    let texelCoord : vec2<i32> = vec2<i32>(i32(GlobalInvocationID.x), i32(GlobalInvocationID.y));

    if (texelCoord.x >= screenSize.x || texelCoord.y >= screenSize.y) {
        return;
    }

    let horizontal: f32 = (f32(texelCoord.x) - f32(screenSize.x) / 2) / f32(screenSize.x); // [-1, 1]
    let vertical: f32 = (f32(texelCoord.y) - f32(screenSize.y) / 2) / f32(screenSize.x);   // [-1, 1]
    let forward: vec3<f32> = vec3<f32>(1.0, 0.0, 0.0);
    let right: vec3<f32> = vec3<f32>(0.0, -1.0, 0.0);
    let up: vec3<f32> = vec3<f32>(0.0, 0.0, 1.0);

    var mySphere: Sphere;
    mySphere.center = vec3<f32>(3.0, 0.0, 0.0);
    mySphere.radius = 0.5;

    var myRay: Ray;
    myRay.direction = normalize(forward + horizontal * right + vertical * up);
    myRay.origin = vec3<f32>(0.0, 0.0, 0.0);

    var pixel_color : vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);

    if (hit(myRay, mySphere)) {
        pixel_color = vec3<f32>(1.0, 1.0, 1.0);
    }

    textureStore(colorBuffer, texelCoord, vec4<f32>(pixel_color, 1.0));
}

fn hit(ray: Ray, sphere: Sphere) -> bool {
    
    let a: f32 = dot(ray.direction, ray.direction);
    let b: f32 = 2.0 * dot(ray.direction, ray.origin - sphere.center);
    let c: f32 = dot(ray.origin - sphere.center, ray.origin - sphere.center) - sphere.radius * sphere.radius;
    let discriminant: f32 = b * b - 4.0 * a * c;

    return discriminant > 0;
    
}