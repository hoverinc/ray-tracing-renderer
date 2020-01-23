export default {

source: `
  in vec3 aPosition;
  in vec3 aNormal;

  uniform mat4 view;
  uniform mat4 proj;

  out vec3 vPosition;
  out vec3 vNormal;

  void main() {
    vPosition = aPosition;
    vNormal = aNormal;
    gl_Position = proj * view * vec4(aPosition, 1);
  }
`
}
