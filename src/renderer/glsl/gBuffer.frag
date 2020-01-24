import constants from './chunks/constants.glsl';
import materialBuffer from './chunks/materialBuffer.glsl';

export default {

outputs: ['position', 'normal', 'faceNormal', 'color', 'matProps'],
includes: [
  constants,
  materialBuffer,
],
source: `
  in vec3 vPosition;
  in vec3 vNormal;
  in vec2 vUv;
  in vec2 vMaterialMeshIndex;

  vec3 faceNormals(vec3 pos) {
    vec3 fdx = dFdx(pos);
    vec3 fdy = dFdy(pos);
    return cross(fdx, fdy);
  }

  void main() {
    int materialIndex = int(EPS + vMaterialMeshIndex.x);
    float meshIndex = floor(EPS + vMaterialMeshIndex.y);

    vec3 color = getMatColor(materialIndex, vUv);
    float roughness = getMatRoughness(materialIndex, vUv);
    float metalness = getMatMetalness(materialIndex, vUv);
    float materialType = getMatType(materialIndex);

    roughness = clamp(roughness, ROUGHNESS_MIN, 1.0);
    metalness = clamp(metalness, 0.0, 1.0);

    vec3 normal = vNormal;
    vec3 faceNormal = faceNormals(vPosition);
    normal *= sign(dot(normal, faceNormal));

    #ifdef NUM_NORMAL_MAPS
      vec3 dp1 = dFdx(vPosition);
      vec3 dp2 = dFdy(vPosition);
      vec2 duv1 = dFdx(vUv);
      vec2 duv2 = dFdy(vUv);
      normal = getMatNormal(materialIndex, vUv, normal, dp1, dp2, duv1, duv2);
    #endif

    out_position = vec4(vPosition, meshIndex);
    out_normal = vec4(normal, materialType);
    out_faceNormal = vec4(faceNormal, 0);
    out_color = vec4(color, 0);
    out_matProps = vec4(roughness, metalness, 0, 0);
  }
`

}
