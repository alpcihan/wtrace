//-------------------------------------------------------------------
// Bindings
//-------------------------------------------------------------------
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blasNodes: array<BLASNode>;
@group(0) @binding(2) var<storage, read> blasInstances: array<BLASInstance>;
@group(0) @binding(3) var<storage, read_write> sceneAABB: AABB;

const WG_SIZE: u32 = 32;
const MAX_FLOAT:f32 =  3.402823466e+38;
const MIN_FLOAT:f32 = -3.402823466e+38;

var<workgroup> wgReduceBuffer: array<AABB, WG_SIZE>;

@compute @workgroup_size(32,1,1)
fn main(
    @builtin(workgroup_id) workGroupID : vec3u,
    @builtin(local_invocation_id) localInvocationID: vec3u,
    @builtin(global_invocation_id) globalInvocationID : vec3u) 
{
    let wgID:u32 = workGroupID.x;
    let lID:u32 = localInvocationID.x;

    var current: AABB = AABB(vec4(MAX_FLOAT), vec4(MIN_FLOAT));
    wgReduceBuffer[lID] = current;
    if(lID >= u32(uniforms.objectCount)) {
		return;
    }

    for (var i: u32 = lID; i < u32(uniforms.objectCount); i+= WG_SIZE)
    {
        let instance:BLASInstance = blasInstances[i];
        let node: BLASNode = blasNodes[instance.blasOffset];

        let transformedMin:vec4f = instance.transform * vec4f(node.aabbMins.xyz, 1.0);
        let transformedMax:vec4f = instance.transform * vec4f(node.aabbMaxs.xyz, 1.0);

        current = AABB(min(current.min, transformedMin), max(current.max, transformedMax));
    }
    wgReduceBuffer[lID] = current;
    
    if(lID == 0)
    {
        for (var i: u32 = 1; i < WG_SIZE; i++)
        {
            current = AABB(min(current.min, wgReduceBuffer[i].min), max(current.max, wgReduceBuffer[i].max));
        }
        //final aabb is the reduced one
        sceneAABB = current;
    }
}