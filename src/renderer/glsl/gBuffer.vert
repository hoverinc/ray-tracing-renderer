export default {

source: `
  in vec3 aPosition;
  in vec3 aNormal;
  in vec2 aUv;
  in float aMaterialIndex;

  uniform mat4 view;
  uniform mat4 proj;

  out vec3 vPosition;
  out vec3 vNormal;
  out vec2 vUv;
  out float vMaterialIndex;

  void main() {
    vPosition = aPosition;
    vNormal = aNormal;
    vUv = aUv;
    vMaterialIndex = aMaterialIndex;
    gl_Position = proj * view * vec4(aPosition, 1);
  }
`
}
