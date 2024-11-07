//-------------------------------------------------------------------
// Bindings
//-------------------------------------------------------------------
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(1) @binding(0) var<uniform> shift: f32;

@group(0) @binding(1) var<storage, read_write> histograms: array<u32>;

@group(0) @binding(2) var<storage, read_write> elementsIn: array<u32>;
@group(0) @binding(3) var<storage, read_write> elementsOut: array<u32>;

@group(0) @binding(4) var<storage, read_write> mapIn: array<u32>;
@group(0) @binding(5) var<storage, read_write> mapOut: array<u32>;

const BINS:u32 = 16;

var<workgroup> global_offsets: array<atomic<u32>, BINS>;

@compute @workgroup_size(16,1,1)
fn main(
    @builtin(workgroup_id) workGroupID : vec3u,
    @builtin(num_workgroups) numWorkGroups: vec3u,
    @builtin(local_invocation_id) localInvocationID: vec3u,
    @builtin(global_invocation_id) globalInvocationID: vec3u)
{
    let wgID: u32 = workGroupID.x;
    let wgCount:u32 = numWorkGroups.x;
    let lID:u32 = localInvocationID.x;
    let gID: u32 = globalInvocationID.x;

    // Initialize on first pass only
    if (u32(shift) == 0) {
        mapIn[gID] = gID;
        mapOut[gID] = gID;
    }

    var count: u32 = 0;
    var prefix_sum: u32 = 0;
    var local_offset: u32 = 0;
    for (var i: u32 = 0; i < wgCount; i++) { 
        let t: u32 = histograms[BINS * i + lID];
        local_offset = select(local_offset, count, i == wgID);
        count += t;
    }

    prefix_sum = subgroupExclusiveAdd(count);
    atomicStore(&global_offsets[lID], local_offset + prefix_sum);

    if (gID >= u32(uniforms.objectCount)) {
        return;
    }

    let eIn: u32 = elementsIn[gID];
    let binID: u32 = u32(eIn >> u32(shift)) & u32(BINS - 1);
    let oldValue: u32 = atomicAdd(&global_offsets[binID], 1);
    elementsOut[oldValue] = eIn;

    let eInMap: u32 = mapIn[gID];
    mapOut[oldValue] = eInMap;
}