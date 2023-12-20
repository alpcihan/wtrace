//@group(0) @binding(-) var screenSampler : sampler;
//@group(0) @binding(-) var colorBuffer : texture_2d<f32>;
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> accumulationInfo: array<vec4f>; // TODO: replace with storage texture

struct Uniforms {
    view_i: mat4x4f,
    projection_i: mat4x4f,
    resolution: vec2f, // TODO: pass as uint
    frameIdx: u32
};

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) uv : vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var out: VertexOutput;
    out.uv = vec2<f32>(f32((vertexIndex<<1) & 2), f32(vertexIndex & 2));
    out.position = vec4<f32>(out.uv * 2.0 + -1.0, 0.0, 1.0);
    return out;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    //let screenSize: vec2i = vec2i(textureDimensions(colorBuffer)); // TODO: pass as uniform
    var resolution: vec2i = vec2i(uniforms.resolution);
    var texelCoord: vec2i = vec2i(uv * vec2f(resolution));

    return vec4f(accumulationInfo[texelCoord.y * resolution.x + texelCoord.x].xyz, 1);
    //return textureSample(colorBuffer, screenSampler, uv);
}