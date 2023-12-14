@group(0) @binding(0) var screenSampler : sampler;
@group(0) @binding(1) var colorBuffer : texture_2d<f32>;

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
    return textureSample(colorBuffer, screenSampler, uv);
}