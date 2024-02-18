//-------------------------------------------------------------------
// Consts
//-------------------------------------------------------------------
const MAX_FLOAT32: f32 = 3.402823466e+38;

//-------------------------------------------------------------------
// Structs
//-------------------------------------------------------------------
struct Uniforms {
    view_i: mat4x4f,
    projection_i: mat4x4f,
    resolution: vec2f, // TODO: pass as uint
    frameIdx: u32
};

struct Ray {
    direction: vec3f,
    origin: vec3f,
};

struct Sphere {
    center: vec3f,
    radius: f32,
};

struct XZPlane{
    normal: vec3f,
    distance: f32,
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

struct BLASNode {        // TODO: use uint for "leftFirst" and "triangleCount"
    leftFirst: f32,     //if triCount == 0 represents leftChild, if triCount > 0 represents first triangleIdx
    triangleCount: f32,

    aabbMins: vec4f,
    aabbMaxs: vec4f,
};

struct BLASInstance {
    transform: mat4x4f,     // transform
    transform_i: mat4x4f,   // transform inverse
    blasOffset: u32,        // blas node offset
    materialIdx: u32
    // 2*4 byte padding
};

//-------------------------------------------------------------------
// Bindings
//-------------------------------------------------------------------
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> points: array<f32>;
@group(0) @binding(2) var<storage, read_write> accumulationInfo: array<vec4f>; // TODO: replace with storage texture
@group(0) @binding(3) var<storage, read> triIdxInfo: array<u32>;
@group(0) @binding(4) var<storage, read> blasNodes: array<BLASNode>;
@group(0) @binding(5) var<storage, read> blasInstances: array<BLASInstance>;
@group(0) @binding(6) var<storage, read> materials: array<Material>;
@group(0) @binding(7) var ourTexture: texture_2d<f32>;

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

    // origin
    ray.origin = (view_i * vec4f(0,0,0,1)).xyz;

    // direction
    ray.direction = normalize(projection_i * vec4f(uv, 0, 1)).xyz;
    ray.direction = (view_i * vec4f(ray.direction, 0)).xyz;
    ray.direction = normalize(ray.direction);

    return ray;
} 

fn traceRay(ray: Ray, seed: u32) -> vec3f {
    var hitInfo: HitInfo;
    var r: Ray = ray;
    var s: u32 = seed;

    var incomingLight: vec3f = vec3f(0.0, 0.0, 0.0);
    var attenuation: vec3f = vec3f(1.0, 1.0, 1.0);
     
    for(var i: u32 = 0; i < 3; i++) {
        createHitInfo(&hitInfo);
        hitWorld(r, &hitInfo);

        if (hitInfo.t > 0.0) {
            // incomingLight = hitInfo.material.color;
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

fn hitWorld(ray: Ray, bestHit: ptr<function, HitInfo>){
    // Scene helper objects data // TODO: pass as buffer
    var sphere: Sphere = Sphere(vec3f(2.0,10.0,3.0), 4.0);
    var lightMaterial: Material = Material(vec3f(2), vec3f(2));
    var floorY: f32 = -1;
    var floorMaterial: Material = Material(vec3f(1.0,1.0,1.0), vec3f(0,0,0));

    intersectSphere(&sphere, &lightMaterial, ray, bestHit);
    intersectXZPlane(floorY, &floorMaterial, ray, bestHit);
    intersectAccelerationStructure(ray, bestHit);
}

fn intersectXZPlane(
    y: f32,
    material: ptr<function, Material>,
    ray: Ray,
    bestHit: ptr<function, HitInfo>) {

    var xzPlane: XZPlane;
    xzPlane.normal = vec3f(0.0, 1.0, 0.0);
    xzPlane.distance = -y;

    let t: f32 = -(dot(ray.origin, xzPlane.normal) + xzPlane.distance) / dot(ray.direction, xzPlane.normal);
    if (t > 0.0 && t < (*bestHit).t) {
        (*bestHit).t = t;
        (*bestHit).normal = vec3f(0.0, 1.0, 0.0);
        (*bestHit).material = *(material); // TODO: reference directly or use index
    }
}

fn intersectSphere(
    sphere: ptr<function, Sphere>,
    material: ptr<function, Material>,
    ray: Ray,
    bestHit: ptr<function, HitInfo>) {

    let a: f32 = dot(ray.direction, ray.direction);
    let b: f32 = 2.0 * dot(ray.direction, ray.origin - (*sphere).center);
    let c: f32 = dot(ray.origin - (*sphere).center, ray.origin - (*sphere).center) - (*sphere).radius * (*sphere).radius;
    let discriminant: f32 = b * b - 4.0 * a * c;

    if(discriminant < 0.0) {
        return;
    }

    let t0: f32 = (-b - sqrt(discriminant)) / (2.0 * a);
    let t1: f32 = (-b + sqrt(discriminant)) / (2.0 * a);

    let t: f32 = min(t0, t1);

    if (t > 0.0 && t < (*bestHit).t) {
        (*bestHit).t = t;
        (*bestHit).normal = normalize(rayAt(ray, t) - (*sphere).center);
        (*bestHit).material = (*material); // TODO: reference directly or use index
    }
}

fn intersectTriangles(ray: Ray, bestHit: ptr<function, HitInfo>) {
    const EPSILON: f32 = 0.0000001;
    let vertexCount : u32 = arrayLength(&points);
    for(var i: u32 = 0; i < vertexCount ; i+=9) {

        let v0: vec3f = vec3f(points[i], points[i+1], points[i+2]);
        let v1: vec3f = vec3f(points[i+3], points[i+4], points[i+5]);
        let v2: vec3f = vec3f(points[i+6], points[i+7], points[i+8]);

        let vertex0: vec3f = v0;
        let vertex1: vec3f = v1;
        let vertex2: vec3f = v2;

        let edge1: vec3f = vertex1 - vertex0;
        let edge2: vec3f = vertex2 - vertex0;
        let rayVecXe2: vec3f = cross(ray.direction, edge2);

        let det: f32 = dot(edge1, rayVecXe2);

        if (det > -EPSILON && det < EPSILON) { // This ray is parallel to this triangle.
            continue;
        }

        let invDet: f32 = 1.0 / det;
        let s: vec3f = ray.origin - vertex0;
        let u: f32 = invDet * dot(s, rayVecXe2);

        if (u < 0.0 || u > 1.0) {
            continue;
        }

        let sXe1: vec3f = cross(s, edge1);
        let v: f32 = invDet * dot(ray.direction, sXe1);

        if (v < 0.0 || u + v > 1.0) {
            continue;
        }

        let t: f32 = invDet * dot(edge2, sXe1);

        if (t < (*bestHit).t && t > EPSILON ) {
            // Calculate the normal using the cross product of the edge vectors
            let edge1: vec3f = v1 - v0;
            let edge2: vec3f = v2 - v0;
            let normal: vec3f = normalize(cross(edge1, edge2));
            
            (*bestHit).t = t;
            (*bestHit).normal = normal;
            (*bestHit).material.color = vec3f(1.0, 0.0, 0.0);
            (*bestHit).material.emissiveColor = vec3f(0.0, 0.0, 0.0);
        }
    }
}

fn createHitInfo(hitInfo: ptr<function, HitInfo>){
    (*hitInfo).t = MAX_FLOAT32;
    (*hitInfo).normal = vec3f(0.0, 0.0, 0.0);
    (*hitInfo).material.color = vec3f(0.0, 0.0, 0.0);
    (*hitInfo).material.emissiveColor = vec3f(0.0, 0.0, 0.0);
}

fn rayAt(ray: Ray, t: f32) -> vec3f {
    return ray.origin + ray.direction * t;
}

fn hitTriangle(ray: Ray, v0: vec3<f32>, v1: vec3<f32>, v2: vec3<f32>) -> f32 {
    let v1v0: vec3f = v1 - v0;
    let v2v0: vec3f = v2 - v0;
    let roV0: vec3f = ray.origin - v0;

    let n: vec3f = cross(v1v0, v2v0);
    let q: vec3f = cross(roV0, ray.direction); 
    let d: f32 = 1.0 / dot(ray.direction, n);
    let u: f32 = d * dot(-q, v2v0);
    let v: f32 = d * dot(q, v1v0);
    let t: f32 = d * dot(-n, roV0);

    if(u<0.0 || v<0.0 || u+v>1.0 || t<0.0) {
        return MAX_FLOAT32;
    }

    return t;
}

fn intersectAccelerationStructure(r: Ray, hit_info: ptr<function, HitInfo>) {
    let instanceCount: u32 = arrayLength(&blasInstances);
    for(var i: u32 = 0; i < instanceCount; i++) {
       intersectBVH(r, i, hit_info);
    }
}

fn intersectBVH(r: Ray, instanceIdx: u32, hit_info: ptr<function, HitInfo>){
    let instance: BLASInstance = blasInstances[instanceIdx];

    var ray: Ray;
    ray.origin = (instance.transform_i * vec4f(r.origin,1)).xyz;
    ray.direction = (instance.transform_i * vec4f(r.direction,0)).xyz;
    
    var s: array<u32, 64>;
    var _stackPtr: i32 = 0;
    let rootIdx: u32 = instance.blasOffset;
    
    s[_stackPtr] = rootIdx;
    _stackPtr = _stackPtr + 1;

    while(_stackPtr > 0) {
        _stackPtr = _stackPtr - 1; // pop node from stack
        let nodeIdx: u32 = s[_stackPtr];
        let node: BLASNode = blasNodes[nodeIdx];
        let aabbMin: vec3f = node.aabbMins.xyz;
        let aabbMax: vec3f = node.aabbMaxs.xyz;

        if(intersectAABB(ray, aabbMin, aabbMax)) {
            let triCount: u32 = u32(node.triangleCount);
            let lFirst: u32 = u32(node.leftFirst);
            if(triCount > 0) { // if triangle count > 0 means leaf node (leftFirst gives first triangleIdx)
                for(var i: u32 = 0; i < triCount; i = i + 1) {
                    
                    let idx: u32 = triIdxInfo[lFirst + i];
                    
                    //Do triangle intersection
                    let v0: vec3f = vec3f(points[idx*9+0], points[idx*9+1], points[idx*9+2]);
                    let v1: vec3f = vec3f(points[idx*9+3], points[idx*9+4], points[idx*9+5]);
                    let v2: vec3f = vec3f(points[idx*9+6], points[idx*9+7], points[idx*9+8]);

                    let res: f32 = hitTriangle(ray, v0, v1, v2);
                    if(res < (*hit_info).t && res > 0.0) {
                        (*hit_info).t = res;
                        (*hit_info).normal = normalize((instance.transform * vec4f(cross(v1 - v0, v2 - v0),0)).xyz);
                        //(*hit_info).material = materials[instance.materialIdx];
                        (*hit_info).material.color = textureLoad(ourTexture,vec2i(0,0),0).rgb;
                        (*hit_info).material.emissiveColor = materials[instance.materialIdx].emissiveColor;
                    }             
                }

            } else{ // If triangle count = 0 not leaf node (leftFirst gives leftChild node)
                s[_stackPtr] = lFirst;
                _stackPtr = _stackPtr + 1;
                s[_stackPtr] = lFirst + 1; //right child is always left+1
                _stackPtr = _stackPtr + 1;
            }
        }
    }
}

fn intersectAABB(ray: Ray, aabbMin: vec3<f32>, aabbMax: vec3<f32>)-> bool{
    let invDirection: vec3f = 1.0 / ray.direction;
    let t1: vec3f = (aabbMin - ray.origin) * invDirection;
    let t2: vec3f = (aabbMax - ray.origin) * invDirection;

    let tmin: vec3f = min(t1, t2);
    let tmax: vec3f = max(t1, t2);

    let tenter: f32 = max(max(tmin.x, tmin.y), tmin.z);
    let texit: f32 = min(min(tmax.x, tmax.y), tmax.z);

    return (tenter < texit) && (texit > 0.0);
}

fn isNan(f: f32) -> bool {
    return f != f;
}