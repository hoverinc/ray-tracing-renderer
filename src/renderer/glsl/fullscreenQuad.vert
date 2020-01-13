export default {
source: `
  layout(location = 0) in vec2 a_position;

  out vec2 vCoord;

  void main() {
    vCoord = a_position;
    gl_Position = vec4(2. * a_position - 1., 0, 1);
  }
`
}
