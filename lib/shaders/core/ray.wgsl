//-------------------------------------------------------------------
// structs
//-------------------------------------------------------------------
struct Ray {
    direction: vec3f,
    origin: vec3f,
};

struct HitInfo {
    t: f32,
    normal: vec3f,
    material: Material // TODO: use material index or model index instead
};

//-------------------------------------------------------------------
// ray utils
//-------------------------------------------------------------------
fn calculateUvSize() -> vec2f{
    return 1.0 / uniforms.resolution;
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

fn rayAt(ray: Ray, t: f32) -> vec3f {
    return ray.origin + ray.direction * t;
}

//-------------------------------------------------------------------
// hit utils
//-------------------------------------------------------------------
fn createHitInfo(hitInfo: ptr<function, HitInfo>){
    (*hitInfo).t = MAX_FLOAT32;
    (*hitInfo).normal = vec3f(0.0, 0.0, 0.0);
    (*hitInfo).material.albedo = vec3f(0.0, 0.0, 0.0);
    (*hitInfo).material.emissiveColor = vec3f(0.0, 0.0, 0.0);
}

//-------------------------------------------------------------------
// intersection tests
//-------------------------------------------------------------------
fn hitTriangle(ray: Ray, v0: vec3<f32>, v1: vec3<f32>, v2: vec3<f32>) -> vec3f {
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
        return vec3f(MAX_FLOAT32);
    }

    return vec3f(t,u,v);
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
            (*bestHit).material.albedo = vec3f(1.0, 0.0, 0.0);
            (*bestHit).material.emissiveColor = vec3f(0.0, 0.0, 0.0);
        }
    }
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
                    
                    // check triangle intersection
                    let v0: vec3f = vec3f(points[idx*9+0], points[idx*9+1], points[idx*9+2]);
                    let v1: vec3f = vec3f(points[idx*9+3], points[idx*9+4], points[idx*9+5]);
                    let v2: vec3f = vec3f(points[idx*9+6], points[idx*9+7], points[idx*9+8]);

                    let res: vec3f = hitTriangle(ray, v0, v1, v2);
                    if(res.x < (*hit_info).t && res.x > 0.0) {
                        // record hit distance
                        (*hit_info).t = res.x;

                        // record hit normal
                        let v0_n: vec3f = vec3f(normals[idx*9+0], normals[idx*9+1], normals[idx*9+2]);
                        let v1_n: vec3f = vec3f(normals[idx*9+3], normals[idx*9+4], normals[idx*9+5]);
                        let v2_n: vec3f = vec3f(normals[idx*9+6], normals[idx*9+7], normals[idx*9+8]);
                        let n_os: vec3f = (1 - res.y - res.z) * v0_n + res.y * v1_n + res.z * v2_n;
                        (*hit_info).normal = normalize((instance.transform * vec4f(n_os, 0)).xyz);

                        // record hit material
                        let material: Material = materials[instance.materialIdx];
                        (*hit_info).material = material;

                        // get hit uv
                        let v0_uv: vec2f = vec2f(uvs[idx*6+0], uvs[idx*6+1]);
                        let v1_uv: vec2f = vec2f(uvs[idx*6+2], uvs[idx*6+3]);
                        let v2_uv: vec2f = vec2f(uvs[idx*6+4], uvs[idx*6+5]);
                        var hit_UV: vec2f = (1 - res.y - res.z) * v0_uv + res.y * v1_uv + res.z * v2_uv;
                        hit_UV = fract(hit_UV); // repeat the texture 
                        hit_UV.y = 1 - hit_UV.y;

                        let textureDims = textureDimensions(materialTextures).xy;
                        var textureCoords: vec2i;
                        textureCoords.x = i32(round(hit_UV.x * f32(textureDims.x)));
                        textureCoords.y = i32(round(hit_UV.y * f32(textureDims.y)));

                        // albedo
                        if(material.albedoMapIdx >= 0){
                            (*hit_info).material.albedo = textureLoad(materialTextures, textureCoords, material.albedoMapIdx, 0).rgb;
                        }

                        // metallic + roughness
                        if(material.metallicMapIdx >= 0) {
                            let mr: vec2f = textureLoad(materialTextures, textureCoords, material.metallicMapIdx, 0).rg;
                            (*hit_info).material.metallic = mr.x * mr.x;
                            (*hit_info).material.roughness = mr.y * mr.y;
                        }
                    }             
                }

            } else{ // if triangle count = 0 not leaf node (leftFirst gives leftChild node)
                s[_stackPtr] = lFirst;
                _stackPtr = _stackPtr + 1;
                s[_stackPtr] = lFirst + 1; // right child is always left+1
                _stackPtr = _stackPtr + 1;
            }
        }
    }
}

fn intersectAABB(ray: Ray, aabbMin: vec3f, aabbMax: vec3f)-> bool{
    let invDirection: vec3f = 1.0 / ray.direction;
    let t1: vec3f = (aabbMin - ray.origin) * invDirection;
    let t2: vec3f = (aabbMax - ray.origin) * invDirection;

    let tmin: vec3f = min(t1, t2);
    let tmax: vec3f = max(t1, t2);

    let tenter: f32 = max(max(tmin.x, tmin.y), tmin.z);
    let texit: f32 = min(min(tmax.x, tmax.y), tmax.z);

    return (tenter <= texit) && (texit > 0.0);
}