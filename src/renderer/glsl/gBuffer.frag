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
  flat in ivec2 vMaterialMeshIndex;

  vec3 faceNormals(vec3 pos) {
    vec3 fdx = dFdx(pos);
    vec3 fdy = dFdy(pos);
    return cross(fdx, fdy);
  }

  void main() {
    int materialIndex = vMaterialMeshIndex.x;
    int meshIndex = vMaterialMeshIndex.y;

    vec2 uv = fract(vUv);

    vec3 color = getMatColor(materialIndex, uv);
    float roughness = getMatRoughness(materialIndex, uv);
    float metalness = getMatMetalness(materialIndex, uv);
    float materialType = getMatType(materialIndex);

    roughness = clamp(roughness, ROUGHNESS_MIN, 1.0);
    metalness = clamp(metalness, 0.0, 1.0);

    vec3 normal = normalize(vNormal);
    vec3 faceNormal = normalize(faceNormals(vPosition));
    normal *= sign(dot(normal, faceNormal));

    #ifdef NUM_NORMAL_MAPS
      vec3 dp1 = dFdx(vPosition);
      vec3 dp2 = dFdy(vPosition);
      vec2 duv1 = dFdx(vUv);
      vec2 duv2 = dFdy(vUv);
      normal = getMatNormal(materialIndex, uv, normal, dp1, dp2, duv1, duv2);
    #endif

    out_position = vec4(vPosition, float(meshIndex) + EPS);
    out_normal = vec4(normal, materialType);
    out_faceNormal = vec4(faceNormal, 0);
    out_color = vec4(color, 0);
    out_matProps = vec4(roughness, metalness, 0, 0);
  }
`

}
