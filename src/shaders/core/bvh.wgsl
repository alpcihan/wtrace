//-------------------------------------------------------------------
// structs
//-------------------------------------------------------------------
struct BLASNode {        // TODO: use uint for "leftFirst" and "triangleCount"
    leftFirst: f32,      // if triCount == 0 represents leftChild, if triCount > 0 represents first triangleIdx
    triangleCount: f32,

    aabbMins: vec4f,
    aabbMaxs: vec4f,
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

    left: u32,  //left tlas index
    right: u32, //right tlas index
    instanceIdx: u32 // blas node offset
    //4 bytes padding
};