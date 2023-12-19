// enable chromium_experimental_read_write_storage_texture;

// @group(0) @binding(-) var colorBuffer: texture_storage_2d<rgba8unorm, write>; // Example usage: textureStore(colorBuffer, texelCoord, vec4f(pixel_color, 1.0));
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> vertices: array<f32>;
@group(0) @binding(2) var<storage, read_write> frameInfo: array<vec4f>;

struct Sphere {
    center: vec3f,
    radius: f32,
};

struct Floor{
    normal: vec3f,
    distance: f32,
    color: vec3f,
};

struct SphereLight{
    sphere: Sphere,
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
    emissiveColor: vec3f,
};

struct Uniforms {
    view_i: mat4x4f,
    projection_i: mat4x4f,
    resolution: vec2f, // TODO: pass as uint
    frameIdx: u32
};

@compute @workgroup_size(16,16,1)
fn main(@builtin(global_invocation_id) globalInvocationID : vec3u) {

    var resolution: vec2i = vec2i(uniforms.resolution);

    let texelCoord : vec2i = vec2i(i32(globalInvocationID.x), i32(globalInvocationID.y));
    if (texelCoord.x >= resolution.x || texelCoord.y >= resolution.y) {
        return;
    }

    let uv: vec2f = (vec2f(texelCoord) / vec2f(resolution)) * 2 - 1;
    var ray: Ray = createCameraRay(uv, uniforms.view_i, uniforms.projection_i);
    
    var seed_i1: u32 = u32(texelCoord.x + texelCoord.y * resolution.x);
    var seed_i2: u32 = u32(uniforms.frameIdx);
    var seed: u32 = pcg(&seed_i1)+ pcg(&seed_i2);

    var pixel_color: vec3f = traceRay(ray,seed);

    var state: vec4f = frameInfo[texelCoord.y * resolution.x + texelCoord.x];
    var weight: f32 = 1.0 / (state.a + 1);
    var finalColor: vec3f = state.xyz * (1-weight) + pixel_color * weight;

    frameInfo[texelCoord.y * resolution.x + texelCoord.x] = vec4f(finalColor, state.a + 1);
    //textureStore(colorBuffer, texelCoord, vec4f(pixel_color, 1.0));
}

fn createCameraRay(uv: vec2f, view_i: mat4x4f, projection_i: mat4x4f) -> Ray {
    var ray: Ray;

    ray.direction = normalize((projection_i * vec4f(uv, 0, 1)).xyz);
    ray.origin = (view_i * vec4f(0,0,0,1)).xyz;

    return ray;
} 

fn traceRay(ray: Ray, seed: u32) -> vec3f {
    var hitInfo: HitInfo;
    var r: Ray = ray;
    var s: u32 = seed;

    var incomingLight: vec3f = vec3f(0.0, 0.0, 0.0);
    var attenuation: vec3f = vec3f(1.0, 1.0, 1.0);

    for(var i: u32 = 0; i < 4; i++) {
        hitInfo = hitWorld(r);
        if (hitInfo.t > 0.0) {

            attenuation *= hitInfo.color;
            incomingLight += attenuation * hitInfo.emissiveColor;

            r.origin = rayAt(r, hitInfo.t)+ hitInfo.normal*0.001;
            r.direction = cosineDirection(&s, hitInfo.normal);
        } else {
            incomingLight += attenuation * vec3(0.1);
            break;
        }
    }

    return incomingLight;
}

fn hitWorld(ray: Ray) -> HitInfo {

    var bestHit: HitInfo = createHitInfo();
    bestHit.color = backgroundAt(ray);

    bestHit = intersectSphereLights(ray, bestHit);
    bestHit = intersectFloor(ray, bestHit);
    //bestHit = intersectSpheres(ray, bestHit);
    bestHit = intersectTriangles(ray, bestHit);

    return bestHit;
}

fn intersectFloor(ray: Ray, hitInfo: HitInfo) -> HitInfo {
    var newHitInfo: HitInfo = hitInfo;
    var floor: Floor;
    floor.normal = vec3f(0.0, 1.0, 0.0);
    floor.distance = 1;
    floor.color = vec3f(0.5, 0.5, 0.5);

    var t: f32 = hitFloor(ray, floor);
    if (t > 0.0 && (t < hitInfo.t || hitInfo.t < 0.0)) {
        newHitInfo.t = t;
        newHitInfo.normal = floor.normal;
        newHitInfo.color = floor.color;
        newHitInfo.emissiveColor = vec3f(0.0, 0.0, 0.0);
    }

    return newHitInfo;
}

fn intersectSphereLights(ray: Ray, hitInfo: HitInfo) -> HitInfo {
    var newHitInfo: HitInfo = hitInfo;
    var sphereLight: SphereLight;
    sphereLight.sphere.radius = 1.5;
    sphereLight.sphere.center = vec3f(2.0, 2.0, 2.0);
    sphereLight.color = vec3f(1.5);

    var t: f32 = hitSphere(ray, sphereLight.sphere);
    if (t > 0.0 && (t < hitInfo.t || hitInfo.t < 0.0)) {
        newHitInfo.t = t;
        newHitInfo.normal = normalize(rayAt(ray, t) - sphereLight.sphere.center);
        newHitInfo.color = sphereLight.color;
        newHitInfo.emissiveColor = sphereLight.color;
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
        newHitInfo.color = vec3f(1.0, 0.0, 0.0);
        newHitInfo.emissiveColor = vec3f(0.0, 0.0, 0.0);
    }

    return newHitInfo;
}

fn intersectTriangles(ray: Ray, hitInfo: HitInfo) -> HitInfo {
    var newHitInfo: HitInfo = hitInfo;
    
    for(var i: u32 = 0; i < 8712; i+=9) {
        var v0: vec3f = vec3f(vertices[i], vertices[i+1], vertices[i+2]);
        var v1: vec3f = vec3f(vertices[i+3], vertices[i+4], vertices[i+5]);
        var v2: vec3f = vec3f(vertices[i+6], vertices[i+7], vertices[i+8]);

        var t: f32 = hitTriangle(ray, v0, v1, v2);
        if (t > 0.0 && (t < hitInfo.t || hitInfo.t < 0.0)) {
            newHitInfo.t = t;

            // Calculate the normal using the cross product of the edge vectors
            var edge1: vec3<f32> = v1 - v0;
            var edge2: vec3<f32> = v2 - v0;
            newHitInfo.normal = normalize(cross(edge1, edge2));

            newHitInfo.color = vec3f(1.0, 0.1, 0.1);
            newHitInfo.emissiveColor = vec3f(0.0, 0.0, 0.0);
        }
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

fn hitTriangle(ray: Ray, v0: vec3<f32>, v1: vec3<f32>, v2: vec3<f32>) -> f32 {
    const EPSILON: f32 = 0.0000001;
    
    var vertex0: vec3<f32> = v0;
    var vertex1: vec3<f32> = v1;
    var vertex2: vec3<f32> = v2;

    var edge1: vec3<f32> = vertex1 - vertex0;
    var edge2: vec3<f32> = vertex2 - vertex0;
    var rayVecXe2: vec3<f32> = cross(ray.direction, edge2);

    var det: f32 = dot(edge1, rayVecXe2);

    if (det > -EPSILON && det < EPSILON) {
        return -1; // This ray is parallel to this triangle.
    }

    var invDet: f32 = 1.0 / det;
    var s: vec3<f32> = ray.origin - vertex0;
    var u: f32 = invDet * dot(s, rayVecXe2);

    if (u < 0.0 || u > 1.0) {
        return -1;
    }

    var sXe1: vec3<f32> = cross(s, edge1);
    var v: f32 = invDet * dot(ray.direction, sXe1);

    if (v < 0.0 || u + v > 1.0) {
        return -1;
    }

    // At this stage, we can compute t to find out where the intersection point is on the line.
    var t: f32 = invDet * dot(edge2, sXe1);

    return t;
}

fn createHitInfo() -> HitInfo{
    var hitInfo: HitInfo;
    hitInfo.t = -1.0;
    hitInfo.normal = vec3f(0.0, 0.0, 0.0);
    hitInfo.color = vec3f(0.0, 0.0, 0.0);
    hitInfo.emissiveColor = vec3f(0.0, 0.0, 0.0);
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