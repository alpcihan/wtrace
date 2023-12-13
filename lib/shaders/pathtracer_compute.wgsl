// enable chromium_experimental_read_write_storage_texture;

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var colorBuffer: texture_storage_2d<rgba8unorm, write>;

struct Sphere {
    center: vec3f,
    radius: f32,
};

struct Floor{
    normal: vec3f,
    distance: f32,
    color: vec3f,
};

struct Ray {
    direction: vec3f,
    origin: vec3f,
};

struct HitInfo {
    t: f32,
    normal: vec3f,
    color: vec3f,
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

    let uv: vec2f = (vec2f(texelCoord) / vec2f(screenSize)) * 2 - 1;
    var ray: Ray = createCameraRay(uv, uniforms.view_i, uniforms.projection_i);

    var pixel_color : vec3f = traceRay(ray);

    textureStore(colorBuffer, texelCoord, vec4f(pixel_color, 1.0));
}

fn createCameraRay(uv: vec2f, view_i: mat4x4f, projection_i: mat4x4f) -> Ray {
    var ray: Ray;

    ray.direction = normalize((projection_i * vec4f(uv, 0, 1)).xyz);
    ray.origin = (view_i * vec4f(0,0,0,1)).xyz;

    return ray;
} 

fn traceRay(ray: Ray) -> vec3f {
    var hitInfo: HitInfo = hitWorld(ray);
    return hitInfo.color;
}
fn hitWorld(ray: Ray) -> HitInfo{

    var bestHit: HitInfo = createHitInfo();
    bestHit.color = backgroundAt(ray);

    bestHit = intersectFloor(ray, bestHit);
    bestHit = intersectSpheres(ray, bestHit);

    return bestHit;
}

fn intersectFloor(ray: Ray, hitInfo: HitInfo) -> HitInfo {
    var newHitInfo: HitInfo = hitInfo;
    var floor: Floor;
    floor.normal = vec3f(0.0, 1.0, 0.0);
    floor.distance = 0.5;
    floor.color = vec3f(0.5, 0.5, 0.5);

    var t: f32 = hitFloor(ray, floor);
    if (t > 0.0 && (t < hitInfo.t || hitInfo.t < 0.0)) {
        newHitInfo.t = t;
        newHitInfo.normal = floor.normal;
        newHitInfo.color = floor.color;
    }

    return newHitInfo;
}

fn intersectSpheres(ray: Ray, hitInfo: HitInfo) -> HitInfo {
    var newHitInfo: HitInfo = hitInfo;
    var sphere: Sphere;
    sphere.radius = 0.5;
    sphere.center = vec3f(0.0, 0.0, -2.0);

    var t: f32 = hitSphere(ray, sphere);
    if (t > 0.0 && (t < hitInfo.t || hitInfo.t < 0.0)) {
        newHitInfo.t = t;
        newHitInfo.normal = normalize(rayAt(ray, t) - sphere.center);
        newHitInfo.color = newHitInfo.normal * 0.5 + 0.5;
    }

    return newHitInfo;
}

fn hitFloor(ray: Ray, floor: Floor) -> f32 {
    var t: f32 = -(dot(ray.origin, floor.normal) + floor.distance) / dot(ray.direction, floor.normal);
    if (t > 0.0) {
        return t;
    }
    return -1.0;
}

fn hitSphere(ray: Ray, sphere: Sphere) -> f32 {
    
    let a: f32 = dot(ray.direction, ray.direction);
    let b: f32 = 2.0 * dot(ray.direction, ray.origin - sphere.center);
    let c: f32 = dot(ray.origin - sphere.center, ray.origin - sphere.center) - sphere.radius * sphere.radius;
    let discriminant: f32 = b * b - 4.0 * a * c;

    if(discriminant < 0.0) {
        return -1.0;
    }

    let t0: f32 = (-b - sqrt(discriminant)) / (2.0 * a);
    let t1: f32 = (-b + sqrt(discriminant)) / (2.0 * a);

    return min(t0, t1);
}

fn createHitInfo() -> HitInfo{
    var hitInfo: HitInfo;
    hitInfo.t = -1.0;
    hitInfo.normal = vec3f(0.0, 0.0, 0.0);
    hitInfo.color = vec3f(0.0, 0.0, 0.0);
    return hitInfo;
}

fn backgroundAt(ray: Ray) -> vec3f {
    var unit_direction: vec3f = normalize(ray.direction);
    var t: f32 = 0.5 * (unit_direction.y + 1.0);
    return (1.0 - t) * vec3f(1.0, 1.0, 1.0) + t * vec3f(0.5, 0.7, 1.0);
}

fn rayAt(ray: Ray, t: f32) -> vec3f {
    return ray.origin + ray.direction * t;
}

/************************Utils**********************/

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