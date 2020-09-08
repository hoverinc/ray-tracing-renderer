export default {

source: `
  in vec3 aPosition;
  in vec3 aNormal;
  in vec2 aUv;
  in ivec2 aMaterialMeshIndex;

  uniform mat4 projView;

  out vec3 vPosition;
  out vec3 vNormal;
  out vec2 vUv;
  out vec4 vClipPos;
  flat out ivec2 vMaterialMeshIndex;

  void main() {
    vPosition = aPosition;
    vNormal = aNormal;
    vUv = aUv;
    vMaterialMeshIndex = aMaterialMeshIndex;
    vClipPos = projView * vec4(aPosition, 1);
    gl_Position = vClipPos;
  }
`
}
