export default function() {
  return `#version 300 es

in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;
in int a_meshId;

uniform mat4 view;
uniform mat4 projection;
uniform vec2 resolution;
uniform vec2 jitter;
uniform float seed;

out vec3 v_worldPosition;
out vec3 v_normal;
out vec2 v_uv;
flat out vec3 v_flat_normal;
flat out int v_meshId;

flat out mat4 v_view;

void main() {
  v_worldPosition = a_position;
  v_normal = normalize(a_normal);
  v_flat_normal = normalize(a_normal);
  v_uv = a_uv;
  v_meshId = a_meshId;

  mat4 jitteredMatrix = projection;
  jitteredMatrix[2][0] += jitter.x;
  jitteredMatrix[2][1] += jitter.y;
  gl_Position = jitteredMatrix * view * vec4(a_position, 1);
}

`;
}
