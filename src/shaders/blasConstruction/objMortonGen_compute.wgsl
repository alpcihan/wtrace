//-------------------------------------------------------------------
// Bindings
//-------------------------------------------------------------------
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> bbs: array<AABB>;
@group(0) @binding(2) var<storage, read_write> mortonCodes: array<u32>;

@compute @workgroup_size(16,1,1)
fn main(@builtin(global_invocation_id) globalInvocationID : vec3u) 
{
    let gID: u32 = globalInvocationID.x;
    let elementCount:u32 = u32(uniforms.triCount);
    if(gID >= elementCount) {
		return;
    }
    
    let triBB: AABB = bbs[gID];
    let objBB: AABB = bbs[elementCount];
    let center: vec4f = (triBB.max + triBB.min) * 0.5;
    let scaled_center: vec3f = ((center - objBB.min)/(objBB.max - objBB.min)).xyz;
    
    //write output
    mortonCodes[gID] = morton3D(scaled_center) << 2;
}

// Expands a 10-bit integer into 30 bits
// by inserting 2 zeros after each bit.
fn expandBits(in:u32) -> u32 
{
    var v:u32 = (in * 0x00010001u) & 0xFF0000FFu;
    v = (v * 0x00000101u) & 0x0F00F00Fu;
    v = (v * 0x00000011u) & 0xC30C30C3u;
    v = (v * 0x00000005u) & 0x49249249u;
    return v;
}

// Calculates a 30-bit Morton code for the
// given 3D point located within the unit cube [0,1].
fn morton3D(v: vec3f) -> u32 
{
    let x: f32 = min(max(v.x * 1024.0f, 0.0f), 1023.0f);
    let y: f32 = min(max(v.y * 1024.0f, 0.0f), 1023.0f);
    let z: f32 = min(max(v.z * 1024.0f, 0.0f), 1023.0f);

    let xx: u32 = expandBits(u32(x));
    let yy: u32 = expandBits(u32(y));
    let zz: u32 = expandBits(u32(z));

    return xx * 4 + yy * 2 + zz;
}