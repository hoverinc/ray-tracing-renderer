export default function(renderTargets, defines) {
  return `#version 300 es

precision mediump float;
precision mediump int;

in vec3 v_worldPosition;
in vec3 v_normal;

${renderTargets.glslOutput()}

void main() {
  out_position = vec4(v_worldPosition, 1.0);
  out_normal = vec4(v_normal, 1.0);
}
`;
}
