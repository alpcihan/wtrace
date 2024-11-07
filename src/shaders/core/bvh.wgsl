//-------------------------------------------------------------------
// structs
//-------------------------------------------------------------------
struct BLASNode {
    aabbMins: vec4f,
    aabbMaxs: vec4f,

    isLeaf:u32,
    left: f32,
    right:f32,
    posOffset:u32
};

struct BLASInstance {
    transform: mat4x4f,     // transform
    transform_i: mat4x4f,   // transform inverse
    blasOffset: u32,        // blas node offset 
    materialIdx: u32
    // 2*4 byte padding
};

struct TLASNode {
    
    aabbMins: vec4f,
    aabbMaxs: vec4f,

    isLeaf: u32,
    left: u32,
    right: u32,
    instanceIdx: u32
};