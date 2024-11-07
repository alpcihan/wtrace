//-------------------------------------------------------------------
// Bindings
//-------------------------------------------------------------------
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> indices: array<u32>;
@group(0) @binding(2) var<storage, read> positions: array<f32>;
@group(0) @binding(3) var<storage, read_write> bbsOut: array<AABB>;

const WG_SIZE: u32 = 32;
const MAX_FLOAT:f32 =  3.402823466e+38;
const MIN_FLOAT:f32 = -3.402823466e+38;

var<workgroup> wgReduceBuffer: array<AABB, WG_SIZE>;

@compute @workgroup_size(32,1,1)
fn main(@builtin(local_invocation_id) localInvocationID: vec3u) 
{
    let lID:u32 = localInvocationID.x;
    let posOffset = u32(uniforms.posOffset);
    let idxOffset = u32(uniforms.idxOffset);
    let elementCount:u32 = u32(uniforms.triCount);
    if(lID >= elementCount) {
		return;
    }

    var current: AABB = AABB(vec4(MAX_FLOAT), vec4(MIN_FLOAT));
    for (var i: u32 = lID; i < elementCount; i+= WG_SIZE)
    {
        let iBase: u32 = i * 3 + idxOffset;
        let idx1: u32 = indices[iBase + 0] * 3 + posOffset;
        let idx2: u32 = indices[iBase + 1] * 3 + posOffset;
        let idx3: u32 = indices[iBase + 2] * 3 + posOffset;
        
        let p1: vec3f = vec3f(positions[idx1], positions[idx1 + 1], positions[idx1 + 2]);
        let p2: vec3f = vec3f(positions[idx2], positions[idx2 + 1], positions[idx2 + 2]);
        let p3: vec3f = vec3f(positions[idx3], positions[idx3 + 1], positions[idx3 + 2]);

        //triangle aabb save it for next pass
        let aabb = AABB(
            vec4f(
                min(p1.x, min(p2.x, p3.x)), 
                min(p1.y, min(p2.y, p3.y)), 
                min(p1.z, min(p2.z, p3.z)), 1.0),
            vec4f(
                max(p1.x, max(p2.x, p3.x)), 
                max(p1.y, max(p2.y, p3.y)), 
                max(p1.z, max(p2.z, p3.z)), 1.0)
        );
        bbsOut[i] = aabb;
        
        current  = AABB(min(current.min, aabb.min), max(current.max, aabb.max));
    }
    wgReduceBuffer[lID] = current;

    if(lID == 0)
    {
        for (var i: u32 = 1; i < WG_SIZE; i++)
        {
            current = AABB(min(current.min, wgReduceBuffer[i].min), max(current.max, wgReduceBuffer[i].max));
        }

        //final aabb is the reduced one
        bbsOut[elementCount] = current;
    }
}