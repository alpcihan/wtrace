// enable chromium_experimental_read_write_storage_texture;

// @group(0) @binding(-) var colorBuffer: texture_storage_2d<rgba8unorm, write>; // Example usage: textureStore(colorBuffer, texelCoord, vec4f(pixel_color, 1.0));
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> vertices: array<f32>;
@group(0) @binding(2) var<storage, read_write> accumulationInfo: array<vec4f>; // TODO: replace with storage texture

struct Uniforms {
    view_i: mat4x4f,
    projection_i: mat4x4f,
    resolution: vec2f, // TODO: pass as uint
    frameIdx: u32
};

struct Sphere {
    center: vec3f,
    radius: f32,
};

struct XZPlane{
    normal: vec3f,
    distance: f32,
};

struct Ray {
    direction: vec3f,
    origin: vec3f,
};

struct HitInfo {
    t: f32,
    normal: vec3f,
    material: Material // TODO: use material index or model index instead
};

struct Material {
    color: vec3f,
    emissiveColor: vec3f
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

    var state: vec4f = accumulationInfo[texelCoord.y * resolution.x + texelCoord.x];
    var weight: f32 = 1.0 / (state.a + 1);
    var finalColor: vec3f = state.xyz * (1-weight) + pixel_color * weight;

    accumulationInfo[texelCoord.y * resolution.x + texelCoord.x] = vec4f(finalColor, state.a + 1);
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

        var hitInfo: HitInfo;
        createHitInfo(&hitInfo);
        hitWorld(r, &hitInfo);

        if (hitInfo.t > 0.0) {
            attenuation *= hitInfo.material.color;
            incomingLight += attenuation * hitInfo.material.emissiveColor;

            r.origin = rayAt(r, hitInfo.t)+ hitInfo.normal*0.001;
            r.direction = cosineDirection(&s, hitInfo.normal);
        } else {
            break;
        }
    }

    return incomingLight;
}

fn hitWorld(ray: Ray, bestHit: ptr<function, HitInfo>) {
    // Scene helper objects data // TODO: pass as buffer
    var sphere: Sphere = Sphere(vec3f(2.0,2.0,3.0), 2.0);
    var lightMaterial: Material = Material(vec3f(1.0,1.0,1.0), vec3f(1.0,1.0,1.0));
    var floorY: f32 = -1;
    var floorMaterial: Material = Material(vec3f(1.0,1.0,1.0), vec3f(0,0,0));

    intersectSphere(&sphere, &lightMaterial, ray, bestHit);
    intersectXZPlane(floorY, &floorMaterial, ray, bestHit);
    intersectTriangles(ray, bestHit);
}

fn intersectXZPlane(
    y: f32,
    material: ptr<function, Material>,
    ray: Ray,
    hitInfo: ptr<function, HitInfo>) {

    var xzPlane: XZPlane;
    xzPlane.normal = vec3f(0.0, 1.0, 0.0);
    xzPlane.distance = -y;

    let t: f32 = -(dot(ray.origin, xzPlane.normal) + xzPlane.distance) / dot(ray.direction, xzPlane.normal);
    if (t > 0.0 && (t < (*hitInfo).t || (*hitInfo).t < 0.0)) {
        (*hitInfo).t = t;
        (*hitInfo).normal = vec3f(0.0, 1.0, 0.0);
        (*hitInfo).material = *(material); // TODO: reference directly or use index
    }
}

fn intersectSphere(
    sphere: ptr<function, Sphere>,
    material: ptr<function, Material>,
    ray: Ray, hitInfo: ptr<function, HitInfo>) {

    let a: f32 = dot(ray.direction, ray.direction);
    let b: f32 = 2.0 * dot(ray.direction, ray.origin - (*sphere).center);
    let c: f32 = dot(ray.origin - (*sphere).center, ray.origin - (*sphere).center) - (*sphere).radius * (*sphere).radius;
    let discriminant: f32 = b * b - 4.0 * a * c;

    if(discriminant < 0.0) {
        return;
    }

    let t0: f32 = (-b - sqrt(discriminant)) / (2.0 * a);
    let t1: f32 = (-b + sqrt(discriminant)) / (2.0 * a);

    let t: f32 =  min(t0, t1);

    if (t > 0.0 && (t < (*hitInfo).t || (*hitInfo).t < 0.0)) {
        (*hitInfo).t = t;
        (*hitInfo).normal = normalize(rayAt(ray, t) - (*sphere).center);
        (*hitInfo).material = (*material); // TODO: reference directly or use index
    }
}

fn intersectTriangles(ray: Ray, hitInfo: ptr<function, HitInfo>) {
    for(var i: u32 = 0; i < 8712; i+=9) { // TODO: pass triangle count as uniform 
        var v0: vec3f = vec3f(vertices[i], vertices[i+1], vertices[i+2]);
        var v1: vec3f = vec3f(vertices[i+3], vertices[i+4], vertices[i+5]);
        var v2: vec3f = vec3f(vertices[i+6], vertices[i+7], vertices[i+8]);

        var t: f32 = hitTriangle(ray, v0, v1, v2);
        if (t > 0.0 && (t < (*hitInfo).t || (*hitInfo).t < 0.0)) {
            // Calculate the normal using the cross product of the edge vectors
            var edge1: vec3f = v1 - v0;
            var edge2: vec3f = v2 - v0;
            var normal: vec3f = normalize(cross(edge1, edge2));
            
            (*hitInfo).t = t;
            (*hitInfo).normal = normal;
            (*hitInfo).material.color = vec3f(1.0, 1.0, 1.0);
            (*hitInfo).material.emissiveColor = vec3f(0.0, 0.0, 0.0);
        }
    }
}

fn hitTriangle(ray: Ray, v0: vec3f, v1: vec3f, v2: vec3f) -> f32 {
    const EPSILON: f32 = 0.0000001;
    
    var vertex0: vec3f = v0;
    var vertex1: vec3f = v1;
    var vertex2: vec3f = v2;

    var edge1: vec3f = vertex1 - vertex0;
    var edge2: vec3f = vertex2 - vertex0;
    var rayVecXe2: vec3f = cross(ray.direction, edge2);

    var det: f32 = dot(edge1, rayVecXe2);

    if (det > -EPSILON && det < EPSILON) {
        return -1; // This ray is parallel to this triangle.
    }

    var invDet: f32 = 1.0 / det;
    var s: vec3f = ray.origin - vertex0;
    var u: f32 = invDet * dot(s, rayVecXe2);

    if (u < 0.0 || u > 1.0) {
        return -1;
    }

    var sXe1: vec3f = cross(s, edge1);
    var v: f32 = invDet * dot(ray.direction, sXe1);

    if (v < 0.0 || u + v > 1.0) {
        return -1;
    }

    var t: f32 = invDet * dot(edge2, sXe1);

    return t;
}

fn createHitInfo(hitInfo: ptr<function, HitInfo>){
    (*hitInfo).t = -1.0;
    (*hitInfo).normal = vec3f(0.0, 0.0, 0.0);
    (*hitInfo).material.color = vec3f(0.0, 0.0, 0.0);
    (*hitInfo).material.emissiveColor = vec3f(0.0, 0.0, 0.0);
}

fn rayAt(ray: Ray, t: f32) -> vec3f {
    return ray.origin + ray.direction * t;
}