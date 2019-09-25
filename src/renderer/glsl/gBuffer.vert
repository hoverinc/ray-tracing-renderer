export default function() {
  return `#version 300 es

in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;
in int a_meshId;

uniform mat4 view;
uniform mat4 projection;

out vec3 v_worldPosition;
out vec3 v_normal;
out vec2 v_uv;
flat out int v_meshId;

void main() {
  v_worldPosition = a_position;
  v_normal = a_normal;
  v_uv = a_uv;
  v_meshId = a_meshId;

  gl_Position = projection * view * vec4(a_position, 1);
}

`;
}
