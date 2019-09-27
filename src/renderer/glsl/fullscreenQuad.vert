export default function() {
  return `#version 300 es

layout(location = 0) in vec2 position;
out vec2 vCoord;

void main() {
  vCoord = position;
  gl_Position = vec4(2. * position - 1., 0, 1);
}

`;
}
