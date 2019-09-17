export default function(params) {
  return `#version 300 es

precision mediump float;
precision mediump int;

in vec3 v_normal;
out vec4 fragColor;

void main() {
  fragColor = vec4(v_normal * 0.5 + 0.5, 1);
}
`;
}
