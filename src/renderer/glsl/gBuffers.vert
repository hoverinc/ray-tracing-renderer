export default {

source: `
  in vec3 a_position;

  uniform mat4 view;
  uniform mat4 proj;

  out vec3 vPosition;

  void main() {
    vPosition = a_position;
    gl_Position = proj * view * vec4(a_position, 1);
  }
`
}
