//-------------------------------------------------------------------
// Bindings
//-------------------------------------------------------------------
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blasInstances: array<BLASInstance>;
@group(0) @binding(2) var<storage, read_write> tlasNodes: array<TLASNodeMC>;
@group(0) @binding(3) var<storage, read_write> constructionInfoNodes: array<TlasConstructionInfoMC>;

@compute @workgroup_size(16,1,1)
fn main(
    @builtin(local_invocation_id) localInvocationID: vec3u,
    @builtin(global_invocation_id) globalInvocationID: vec3u)
{
    let gID:u32 = globalInvocationID.x;
    let LEAF_OFFSET: i32 = i32(uniforms.objectCount) -1;

    if (gID >= u32(uniforms.objectCount)) {
        return;
    }

    var nodeIdx:u32 = constructionInfoNodes[LEAF_OFFSET + i32(gID)].parent;
    while (true) 
    {
        let visitations:u32 = atomicAdd(&constructionInfoNodes[nodeIdx].visitationCount, 1);
        if (visitations < 1) {
            return;
        }

        let aabbA = extractMinsAndMaxs(tlasNodes[nodeIdx].left);
        let aabbB = extractMinsAndMaxs(tlasNodes[nodeIdx].right);
        let u:AABB = aabbUnion(aabbA, aabbB);

        storeAABB(nodeIdx, u);
        if (nodeIdx == 0) {
            return;
        }

        nodeIdx = constructionInfoNodes[nodeIdx].parent;
    }
}

fn aabbUnion(a:AABB, b:AABB) -> AABB 
{
    return AABB(min(a.min, b.min), max(a.max, b.max));
}

// Function to extract mins and maxs from a TLASNode as an AABB
fn extractMinsAndMaxs(index: u32) -> AABB 
{
    let node = &tlasNodes[index];

    // Load and bitcast min components
    let minX_f32 = bitcast<f32>(atomicLoad(&node.minX));
    let minY_f32 = bitcast<f32>(atomicLoad(&node.minY));
    let minZ_f32 = bitcast<f32>(atomicLoad(&node.minZ));
    let mins = vec4<f32>(minX_f32, minY_f32, minZ_f32, 1);

    // Load and bitcast max components
    let maxX_f32 = bitcast<f32>(atomicLoad(&node.maxX));
    let maxY_f32 = bitcast<f32>(atomicLoad(&node.maxY));
    let maxZ_f32 = bitcast<f32>(atomicLoad(&node.maxZ));
    let maxs = vec4<f32>(maxX_f32, maxY_f32, maxZ_f32, 1);

    return AABB(mins, maxs);
}

// Function to store an AABB into a TLASNode
fn storeAABB(index: u32, aabb: AABB) 
{
    let node = &tlasNodes[index];

    // Bitcast and store min components
    let minX_u32 = bitcast<u32>(aabb.min.x);
    let minY_u32 = bitcast<u32>(aabb.min.y);
    let minZ_u32 = bitcast<u32>(aabb.min.z);
    atomicStore(&node.minX, minX_u32);
    atomicStore(&node.minY, minY_u32);
    atomicStore(&node.minZ, minZ_u32);

    // Bitcast and store max components
    let maxX_u32 = bitcast<u32>(aabb.max.x);
    let maxY_u32 = bitcast<u32>(aabb.max.y);
    let maxZ_u32 = bitcast<u32>(aabb.max.z);
    atomicStore(&node.maxX, maxX_u32);
    atomicStore(&node.maxY, maxY_u32);
    atomicStore(&node.maxZ, maxZ_u32);
}