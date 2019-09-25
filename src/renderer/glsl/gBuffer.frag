export default function(renderTargets) {
  return `#version 300 es

precision mediump float;
precision mediump int;

in vec3 v_worldPosition;
in vec3 v_normal;
in vec2 v_uv;
flat in int v_meshId;

${renderTargets.glslOutput()}

void main() {
  out_position = vec4(v_worldPosition, 0);
  out_normal = vec4(v_normal, 0);
  out_uvAndMeshId = vec4(v_uv, intBitsToFloat(v_meshId), 0.0);
}
`;
}
