//-------------------------------------------------------------------
// Bindings
//-------------------------------------------------------------------
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(1) @binding(0) var<uniform> shift: f32;
@group(0) @binding(1) var<storage, read_write> histograms: array<atomic<u32>>;
@group(0) @binding(2) var<storage, read_write> mortons: array<u32>;

const BINS:u32 = 16;

@compute @workgroup_size(16,1,1)
fn main(
    @builtin(global_invocation_id) globalInvocationID: vec3u,
    @builtin(workgroup_id) workGroupID : vec3u ) 
{
    let wgID: u32 = workGroupID.x;
    let wgSize: u32 = 16;
    let gID: u32 = globalInvocationID.x;
    let elementCount:u32 = u32(uniforms.triCount);
    atomicStore(&histograms[gID], 0);
    if(gID >= elementCount) {
		return;
    }

    let bin:u32 = (u32(mortons[gID] >> u32(shift)) & u32(BINS - 1)) + wgID * wgSize;
    atomicAdd(&histograms[bin], 1);
}