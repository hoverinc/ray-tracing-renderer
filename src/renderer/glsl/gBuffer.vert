export default function() {
  return `#version 300 es

in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;
in int a_meshId;

uniform mat4 view;
uniform mat4 projection;
uniform vec2 resolution;
uniform float seed;

out vec3 v_worldPosition;
out vec3 v_normal;
out vec2 v_uv;
flat out vec3 v_flat_normal;
flat out int v_meshId;

flat out mat4 v_view;

vec2 randomVec2(vec2 co){
  float x = fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
  float y = fract(sin(dot(co.yx ,vec2(12.9898,78.233))) * 43758.5453);
  return vec2(x, y);
}

void main() {
  v_worldPosition = a_position;
  vec2 jitter = randomVec2(vec2(seed * 0.007, seed * 0.0009));
  v_normal = normalize(a_normal);
  v_flat_normal = normalize(a_normal);
  v_uv = a_uv;
  v_meshId = a_meshId;

  // gl_Position = projection * view * vec4(a_position, 1);
  mat4 jitteredMatrix = projection;
  float mult = 0.5;
  jitteredMatrix[2][0] += mult * (jitter.x * 2.0 - 1.0) / resolution.x;
  jitteredMatrix[2][1] += mult * (jitter.y * 2.0 - 1.0) / resolution.y;
  gl_Position = jitteredMatrix * view * vec4(a_position, 1);
  // jitteredProjection.xy += ((jitter * vec2(2.0)) - vec2(1.0)) / resolution;


  // vec4 jitteredProjection = projection * view * vec4(a_position, 1);
  // jitteredProjection.xy += ((jitter * vec2(2.0)) - vec2(1.0)) / resolution;
  // gl_Position = jitteredProjection;
}

`;
}
