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
    metallic: f32,

    albedoMapIdx: i32,
    emissiveMapIdx: i32,
    roughnessMapIdx: i32,
    metallicMapIdx: i32
};

struct VertexInfo {
    normal: vec4f,
    uv: vec4f
};

//-------------------------------------------------------------------
// Bindings
//-------------------------------------------------------------------
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> points: array<f32>;
@group(0) @binding(2) var<storage, read> vertexInfo: array<VertexInfo>;
@group(0) @binding(3) var<storage, read_write> accumulationInfo: array<vec4f>; // TODO: replace with storage texture
@group(0) @binding(4) var<storage, read> triIdxInfo: array<u32>;
@group(0) @binding(5) var<storage, read> blasNodes: array<BLASNode>;
@group(0) @binding(6) var<storage, read> blasInstances: array<BLASInstance>;
@group(0) @binding(7) var<storage, read> tlasNodes: array<TLASNode>;
@group(0) @binding(8) var<storage, read> materials: array<Material>;
@group(0) @binding(9) var materialTextures: texture_2d_array<f32>;

@compute @workgroup_size(16,16,1)
fn main(@builtin(global_invocation_id) globalInvocationID : vec3u) {
    let resolution: vec2i = vec2i(uniforms.resolution);

    let texelCoord : vec2i = vec2i(i32(globalInvocationID.x), i32(globalInvocationID.y));
    if (texelCoord.x >= resolution.x || texelCoord.y >= resolution.y) {
        return;
    }

    var seed_i1: u32 = u32(texelCoord.x + texelCoord.y * resolution.x);
    var seed_i2: u32 = u32(uniforms.frameIdx);
    var seed: u32 = pcg(&seed_i1)+ pcg(&seed_i2);
    
    let texelSize: vec2f = calculateUvSize();
    var uv: vec2f = (vec2f(texelCoord) / vec2f(resolution)) * 2 - 1;

    uv.x += frand(&seed) * texelSize.x; //TODO: Make seed storage pointer
    uv.y += frand(&seed) * texelSize.y;

    var ray: Ray = createCameraRay(uv, uniforms.view_i, uniforms.projection_i);
    var pixel_color: vec3f = pathTrace(&ray, &seed);

    var state: vec4f = accumulationInfo[texelCoord.y * resolution.x + texelCoord.x];
    var weight: f32 = 1.0 / (state.a + 1);
    var finalColor: vec3f = state.xyz * (1-weight) + pixel_color * weight;

    accumulationInfo[texelCoord.y * resolution.x + texelCoord.x] = vec4f(finalColor, state.a + 1);
}

fn pathTrace(r: Ray_fp, seed: ptr<function,u32>) -> vec3f {

    var hitInfo: HitInfo;
    
    var acc: vec3f = vec3f(0.0, 0.0, 0.0);
    var abso: vec3f = vec3f(1.0, 1.0, 1.0);
    
    for(var i: u32 = 0; i < 3; i++) {
        createHitInfo(&hitInfo);
        hitWorld(r, &hitInfo);

        // skybox
        if(hitInfo.t > 1000000) {               // TODO: add max render distance
            let dir: vec3f = r.direction;
            var a: f32 = 0.5*(dir.y + 1.0);
            acc += mix(vec3f(1.0, 1.0, 1.0),vec3f(0.5, 0.7, 1.0), a) * abso;
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

fn hitWorld(ray: Ray_fp, bestHit: ptr<function, HitInfo>){
    intersectTLAS(ray, bestHit);
}