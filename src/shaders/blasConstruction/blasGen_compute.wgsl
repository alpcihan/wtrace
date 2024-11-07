//-------------------------------------------------------------------
// Bindings
//-------------------------------------------------------------------
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> sortMap: array<u32>;
@group(0) @binding(2) var<storage, read> sortedMortons: array<u32>;
@group(0) @binding(3) var<storage, read> aabb: array<AABB>;

@group(0) @binding(4) var<storage, read_write> blasNodes: array<BLASNode>;
@group(0) @binding(5) var<storage, read_write> constructionInfoNodes: array<BlasConstructionInfo>;

const MAX_FLOAT:f32 =  3.402823466e+38;
const MIN_FLOAT:f32 = -3.402823466e+38;

@compute @workgroup_size(16,1,1)
fn main(
    @builtin(local_invocation_id) localInvocationID: vec3u,
    @builtin(global_invocation_id) globalInvocationID: vec3u)
{
    let lID:u32 = localInvocationID.x;
    let gID:u32 = globalInvocationID.x;
    let elementCount:u32 = u32(uniforms.triCount);
    let LEAF_OFFSET: i32 = i32(elementCount-1);

    // Construct leaf nodes
    if (gID < elementCount) 
    {
        let sortedInstanceID: u32 = sortMap[gID];
        let aabb: AABB = aabb[sortedInstanceID];
        blasNodes[i32(uniforms.blasOffset) + LEAF_OFFSET + i32(gID)] = BLASNode(vec4f(aabb.min.xyz, 1.0), vec4f(aabb.max.xyz, 1.0), 1, f32(sortedInstanceID * 3) + uniforms.idxOffset, 0, u32(uniforms.posOffset));
    }

    // Construct internal nodes
    if (gID < elementCount-1u) 
    {
        let range: Range = determineRange(i32(gID));
        
        let first: i32 = range.lower;
        let last: i32 = range.upper;
        let split: i32 = findSplit(first, last);

        let childA: i32 = select(split, LEAF_OFFSET + split, split == first);
        let childB: i32 = select(split + 1, LEAF_OFFSET + split + 1, split + 1 == last);

        blasNodes[u32(uniforms.blasOffset) + gID] = BLASNode(vec4f(MAX_FLOAT), vec4f(MIN_FLOAT), 0, uniforms.blasOffset + f32(childA), uniforms.blasOffset + f32(childB), 0);
        constructionInfoNodes[childA] = BlasConstructionInfo(u32(uniforms.blasOffset) + gID, 0);
        constructionInfoNodes[childB] = BlasConstructionInfo(u32(uniforms.blasOffset) + gID, 0);
    }

    if (gID == 0) {
        constructionInfoNodes[0] = BlasConstructionInfo(0, 0);
    }
}

fn determineRange(idx: i32) -> Range {
    let code: u32 = sortedMortons[idx];
    let deltaL: i32 = delta(idx, code, idx - 1);
    let deltaR: i32 = delta(idx, code, idx + 1);
    let d: i32 = select(-1, 1, deltaR >= deltaL);

    let deltaMin: i32 = min(deltaL, deltaR);
    var lMax: i32 = 2;
    while (delta(idx, code, idx + lMax * d) > deltaMin) 
    {
        lMax = lMax << 1;
    }

    var l: i32 = 0;
    for (var t = lMax >> 1; t > 0; t >>= 1) 
    {
        if (delta(idx, code, idx + (l + t) * d) > deltaMin) 
        {
            l += t;
        }
    }
    let jdx: i32 = idx + l * d;

    return Range(min(idx, jdx), max(idx, jdx));
}

fn findSplit(first: i32, last: i32) -> i32 
{
    let firstCode: u32 = sortedMortons[first];
    let commonPrefix: i32 = delta(first, firstCode, last);

    var split: i32 = first;
    var stride: i32 = last - first;

    // Initial iteration to replicate the do-while structure
    stride = (stride + 1) >> 1;
    var newSplit: i32 = split + stride;
    if (newSplit < last) {
        let splitPrefix: i32 = delta(first, firstCode, newSplit);
        if (splitPrefix > commonPrefix) {
            split = newSplit;
        }
    }
    
    while (stride > 1) {
        stride = (stride + 1) >> 1;
        var newSplit:i32 = split + stride;
        if (newSplit < last) {
            var splitPrefix:i32 = delta(first, firstCode, newSplit);
            if (splitPrefix > commonPrefix) {
                split = newSplit;
            }
        }
    }
    
    return split;
}

fn delta(i: i32, codeI: u32, j: i32) -> i32 
{
    if(j < 0 || j > i32(uniforms.triCount-1) ) {
        return -1;
    }

    let codeJ: u32 = sortedMortons[j];
    //handle duplicates
    if (codeI == codeJ) {
        return 31 - i32(floor(log2(f32(u32(i) ^ u32(j)))));
    }

    return 31 - i32(floor(log2(f32(codeI ^ codeJ))));
}
