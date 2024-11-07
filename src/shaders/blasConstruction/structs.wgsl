//-------------------------------------------------------------------
// Structs
//-------------------------------------------------------------------
struct Uniforms {
    triCount: f32,
    idxOffset: f32,
    posOffset: f32,
    blasOffset: f32
};

struct AABB {
    min: vec4f,
    max: vec4f
}

struct Range {
    lower: i32,
    upper: i32,
}

struct BlasConstructionInfo {
    parent: u32,
    visitationCount: u32
};

//Memory coherent version
struct BlasConstructionInfoMC {
    parent: u32,
    visitationCount: atomic<u32>
};

struct BLASNode {
    aabbMins: vec4f,
    aabbMaxs: vec4f,

    isLeaf:u32,
    left: f32,
    right:f32,
    posOffset:u32
};

//Memory coherent version
struct BLASNodeMC {
    minX: atomic<u32>,
    minY: atomic<u32>,
    minZ: atomic<u32>,
    minW: u32,

    maxX: atomic<u32>,
    maxY: atomic<u32>,
    maxZ: atomic<u32>,
    maxW: u32,

    isLeaf:f32,
    left: f32,
    right:f32,
    posOffset: f32
};
