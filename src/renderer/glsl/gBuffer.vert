export default function(params) {
  return `#version 300 es

in vec3 a_position;
in vec3 a_normal;

uniform mat4 view;
uniform mat4 projection;

out vec3 v_worldPosition;
out vec3 v_normal;

void main() {

  vec4 viewSpace = view * vec4(a_position, 1);
  vec4 clipSpace = projection * viewSpace;

  v_worldPosition = a_position;
  v_normal = a_normal;

  gl_Position = clipSpace;
}

`;
}
