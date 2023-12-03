// vertex shader
struct Output {
    @builtin(position) b_position : vec4<f32>,
    @location(0) v_color : vec4<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) b_vertexIndex: u32) -> Output {
    var pos = array<vec2<f32>, 3>(
        vec2<f32>(0.0, 0.5),
        vec2<f32>(-0.5, -0.5),
        vec2<f32>(0.5, -0.5)
    );

    var color = array<vec3<f32>, 3>(
        vec3<f32>(1.0, 0.0, 0.0),
        vec3<f32>(0.0, 1.0, 0.0),
        vec3<f32>(0.0, 0.0, 1.0)
    );

    var output: Output;
    output.b_position = vec4<f32>(pos[b_vertexIndex], 0.0, 1.0);
    output.v_color = vec4<f32>(color[b_vertexIndex], 1.0);
    return output;
}

// fragment shader
@fragment
fn fs_main(@location(0) v_color: vec4<f32>) -> @location(0) vec4<f32> {
    return v_color;
}