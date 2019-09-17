export default function(params) {
  return `#version 300 es

in vec3 a_position;
in vec3 a_normal;

uniform mat4 cameraInverse;
uniform mat4 projection;

out vec3 v_normal;

void main() {
  v_normal = a_normal;
  gl_Position = projection * cameraInverse * vec4(a_position, 1);
}

`;
}
