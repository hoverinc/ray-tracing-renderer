// Manually performs linear filtering if the extension OES_texture_float_linear is not supported

export default `
vec4 textureLinear(sampler2D map, vec2 uv) {
  #ifdef OES_texture_float_linear
    return texture(map, uv);
  #else
    vec2 size = vec2(textureSize(map, 0));
    vec2 texelSize = 1.0 / size;

    uv = uv * size - 0.5;
    vec2 f = fract(uv);
    uv = floor(uv) + 0.5;

    vec4 s1 = texture(map, (uv + vec2(0, 0)) * texelSize);
    vec4 s2 = texture(map, (uv + vec2(1, 0)) * texelSize);
    vec4 s3 = texture(map, (uv + vec2(0, 1)) * texelSize);
    vec4 s4 = texture(map, (uv + vec2(1, 1)) * texelSize);

    return mix(mix(s1, s2, f.x), mix(s3, s4, f.x), f.y);
  #endif
}
`;
