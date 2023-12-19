@group(0) @binding(0) var screenSampler : sampler;
@group(0) @binding(1) var colorBuffer : texture_2d<f32>;
@group(0) @binding(2) var<storage, read> frameInfo: array<vec4f>;

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
    let screenSize: vec2i = vec2i(textureDimensions(colorBuffer)); // TODO: pass as uniform

    var texelCoord: vec2i = vec2i(uv * vec2f(screenSize));

    return vec4f(frameInfo[texelCoord.y * screenSize.x + texelCoord.x].xyz, 1);
    //return textureSample(colorBuffer, screenSampler, uv);
}