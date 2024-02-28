//-------------------------------------------------------------------
// Structs
//-------------------------------------------------------------------
struct Uniforms {
    view_i: mat4x4f,
    projection_i: mat4x4f,
    resolution: vec2f, // TODO: pass as uint
    frameIdx: u32
};

struct Material {
    albedo: vec3f,
    roughness: f32,
    emissiveColor: vec3f,
    metallic: f32
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
@group(0) @binding(8) var<storage, read> uvs: array<f32>;

@compute @workgroup_size(16,16,1)
fn main(@builtin(global_invocation_id) globalInvocationID : vec3u) {
    var resolution: vec2i = vec2i(uniforms.resolution);

    let texelCoord : vec2i = vec2i(i32(globalInvocationID.x), i32(globalInvocationID.y));
    if (texelCoord.x >= resolution.x || texelCoord.y >= resolution.y) {
        return;
    }

    var seed_i1: u32 = u32(texelCoord.x + texelCoord.y * resolution.x);
    var seed_i2: u32 = u32(uniforms.frameIdx);
    var seed: u32 = pcg(&seed_i1)+ pcg(&seed_i2);
    
    var uv: vec2f = (vec2f(texelCoord) / vec2f(resolution)) * 2 - 1;

    uv.x += frand(&seed) * calculateUvSize().x;
    uv.y += frand(&seed) * calculateUvSize().y;

    var ray: Ray = createCameraRay(uv, uniforms.view_i, uniforms.projection_i);
    var pixel_color: vec3f = pathTrace(ray, &seed);

    var state: vec4f = accumulationInfo[texelCoord.y * resolution.x + texelCoord.x];
    var weight: f32 = 1.0 / (state.a + 1);
    var finalColor: vec3f = state.xyz * (1-weight) + pixel_color * weight;

    accumulationInfo[texelCoord.y * resolution.x + texelCoord.x] = vec4f(finalColor, state.a + 1);
}

fn calculateUvSize() -> vec2f{
    return 1.0 / uniforms.resolution;
}

fn pathTrace(ray: Ray, seed: ptr<function,u32>) -> vec3f {

    var hitInfo: HitInfo;
    var r: Ray = ray;
    
    var acc: vec3f = vec3f(0.0, 0.0, 0.0);
    var abso: vec3f = vec3f(1.0, 1.0, 1.0);
    
    for(var i: u32 = 0; i < 3; i++) {
        createHitInfo(&hitInfo);
        hitWorld(r, &hitInfo);

        // skybox
        if(hitInfo.t > 1000000) {               // TODO: add max render distance
            //let dir: vec3f = r.direction;
            //var a: f32 = 0.5*(dir.y + 1.0);
            //acc += mix(vec3f(1.0, 1.0, 1.0),vec3f(0.5, 0.7, 1.0), a) * abso;
            return acc;
        }

        // sample brdf
        var outDir: vec3f;
        let brdf: vec4f = sampleBRDF(
            -r.direction,
            hitInfo.normal,
            hitInfo.material,
            &outDir,
            seed);

        // add emission
        acc += hitInfo.material.emissiveColor * abso;

        // absorption
        if (brdf.w > 0.0) {
            abso *= brdf.xyz / brdf.w;
        }

        // next ray
        r.origin = rayAt(r, hitInfo.t)+hitInfo.normal*0.0001;
        r.direction = outDir;
    }

    return acc;
}

fn hitWorld(ray: Ray, bestHit: ptr<function, HitInfo>){
    // Scene helper objects data // TODO: pass as buffer
    var sphere: Sphere = Sphere(vec3f(0.0,0.5,0.0), 0);
    var lightMaterial: Material = Material(vec3f(2), 1, vec3f(2), 0);
    var floorY: f32 = -1;
    var floorMaterial: Material = Material(vec3f(0.5,0.5,0.5), 0.2, vec3f(0,0,0), 0.5);

    intersectSphere(&sphere, &lightMaterial, ray, bestHit);
    // intersectXZPlane(floorY, &floorMaterial, ray, bestHit);
    intersectAccelerationStructure(ray, bestHit);
}

//fn hitTriangle(ray: Ray, v0: vec3<f32>, v1: vec3<f32>, v2: vec3<f32>) -> vec3f { //TODO: Update it on place
//    let v1v0: vec3f = v1 - v0;
//    let v2v0: vec3f = v2 - v0;
//    let roV0: vec3f = ray.origin - v0;
//
//    let n: vec3f = cross(v1v0, v2v0);
//    let q: vec3f = cross(roV0, ray.direction); 
//    let d: f32 = 1.0 / dot(ray.direction, n);
//    let u: f32 = d * dot(-q, v2v0);
//    let v: f32 = d * dot(q, v1v0);
//    let t: f32 = d * dot(-n, roV0);
//
//    if(u<0.0 || v<0.0 || u+v>1.0 || t<0.0) {
//        return vec3f(MAX_FLOAT32);
//    }
//
//    return vec3f(t,u,v);
//}

//fn intersectBVH(r: Ray, instanceIdx: u32, hit_info: ptr<function, HitInfo>){ //TODO:Update it on place
//    let instance: BLASInstance = blasInstances[instanceIdx];
//
//    var ray: Ray;
//    ray.origin = (instance.transform_i * vec4f(r.origin,1)).xyz;
//    ray.direction = (instance.transform_i * vec4f(r.direction,0)).xyz;
//    
//    var s: array<u32, 64>;
//    var _stackPtr: i32 = 0;
//    let rootIdx: u32 = instance.blasOffset;
//    
//    s[_stackPtr] = rootIdx;
//    _stackPtr = _stackPtr + 1;
//
//    while(_stackPtr > 0) {
//        _stackPtr = _stackPtr - 1; // pop node from stack
//        let nodeIdx: u32 = s[_stackPtr];
//        let node: BLASNode = blasNodes[nodeIdx];
//        let aabbMin: vec3f = node.aabbMins.xyz;
//        let aabbMax: vec3f = node.aabbMaxs.xyz;
//
//        if(intersectAABB(ray, aabbMin, aabbMax)) {
//            let triCount: u32 = u32(node.triangleCount);
//            let lFirst: u32 = u32(node.leftFirst);
//            if(triCount > 0) { // if triangle count > 0 means leaf node (leftFirst gives first triangleIdx)
//                for(var i: u32 = 0; i < triCount; i = i + 1) {
//                    
//                    let idx: u32 = triIdxInfo[lFirst + i];
//                    
//                    //Do triangle intersection
//                    let v0: vec3f = vec3f(points[idx*9+0], points[idx*9+1], points[idx*9+2]);
//                    let v1: vec3f = vec3f(points[idx*9+3], points[idx*9+4], points[idx*9+5]);
//                    let v2: vec3f = vec3f(points[idx*9+6], points[idx*9+7], points[idx*9+8]);
//
//                    let res: vec3f = hitTriangle(ray, v0, v1, v2);
//                    if(res.x < (*hit_info).t && res.x > 0.0) {
//                        (*hit_info).t = res.x;
//                        (*hit_info).normal = normalize((instance.transform * vec4f(cross(v1 - v0, v2 - v0),0)).xyz);
//                        //(*hit_info).material = materials[instance.materialIdx];
//
//                        let v0_uv: vec2f = vec2f(uvs[idx*6+0], uvs[idx*6+1]);
//                        let v1_uv: vec2f = vec2f(uvs[idx*6+2], uvs[idx*6+3]);
//                        let v2_uv: vec2f = vec2f(uvs[idx*6+4], uvs[idx*6+5]);
//
//                        let hit_UV: vec2f = (1 - res.y - res.z) * v0_uv + res.y * v1_uv + res.z * v2_uv;
//                        let textureDims = textureDimensions(ourTexture).xy;
//                        var textureCoords: vec2i;
//                        textureCoords.x = i32(round(hit_UV.x * f32(textureDims.x)));
//                        textureCoords.x = min(textureCoords.x, i32(textureDims.x)-1);
//                        textureCoords.y = i32(round(hit_UV.y * f32(textureDims.y)));
//                        textureCoords.y = min(textureCoords.y, i32(textureDims.y)-1);
//
//                        (*hit_info).material.color = textureLoad(ourTexture,textureCoords,0).rgb;
//                        (*hit_info).material.emissiveColor = materials[instance.materialIdx].emissiveColor;
//                    }             
//                }
//
//            } else{ // If triangle count = 0 not leaf node (leftFirst gives leftChild node)
//                s[_stackPtr] = lFirst;
//                _stackPtr = _stackPtr + 1;
//                s[_stackPtr] = lFirst + 1; //right child is always left+1
//                _stackPtr = _stackPtr + 1;
//            }
//        }
//    }
//}

//fn intersectAABB(ray: Ray, aabbMin: vec3<f32>, aabbMax: vec3<f32>)-> bool{ TODO: Check on place
//    let invDirection: vec3f = 1.0 / ray.direction;
//    let t1: vec3f = (aabbMin - ray.origin) * invDirection;
//    let t2: vec3f = (aabbMax - ray.origin) * invDirection;
//
//    let tmin: vec3f = min(t1, t2);
//    let tmax: vec3f = max(t1, t2);
//
//    let tenter: f32 = max(max(tmin.x, tmin.y), tmin.z);
//    let texit: f32 = min(min(tmax.x, tmax.y), tmax.z);
//
//    return (tenter < texit) && (texit > 0.0);
//}
