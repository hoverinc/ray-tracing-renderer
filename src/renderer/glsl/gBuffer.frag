import { addDefines } from '../glslUtil';

export default function(renderTargets, defines) {
  return `#version 300 es

precision mediump float;
precision mediump int;

${addDefines(defines)}

in vec3 v_worldPosition;
in vec3 v_normal;
in vec2 v_uv;
flat in int v_meshId;

uniform GBufferMaterials {
  vec4 colorAndMaterialType[NUM_MATERIALS];
  vec4 roughnessMetalnessNormalScale[NUM_MATERIALS];

  #if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS) || defined(NUM_PBR_MAPS)
    ivec4 diffuseNormalRoughnessMetalnessMapIndex[NUM_MATERIALS];
  #endif

  #if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS)
    vec4 diffuseNormalMapSize[${Math.max(defines.NUM_DIFFUSE_MAPS, defines.NUM_NORMAL_MAPS)}];
  #endif

  #if defined(NUM_PBR_MAPS)
    vec2 pbrMapSize[NUM_PBR_MAPS];
  #endif
} gBufferMaterials;

#ifdef NUM_DIFFUSE_MAPS
  uniform mediump sampler2DArray diffuseMap;
#endif

#ifdef NUM_NORMAL_MAPS
  uniform mediump sampler2DArray normalMap;
#endif

${renderTargets.glslOutput()}

void main() {
  vec3 albedo = vec3(1.0);
  float materialType = gBufferMaterials.colorAndMaterialType[v_meshId].w;
  if (materialType != 3.0) {
    albedo = gBufferMaterials.colorAndMaterialType[v_meshId].xyz;
    #ifdef NUM_DIFFUSE_MAPS
      int diffuseMapIndex = gBufferMaterials.diffuseNormalRoughnessMetalnessMapIndex[v_meshId].x;
      int fakeIndex = 0;
      if (diffuseMapIndex >= 0) {
        albedo *= texture(diffuseMap, vec3(v_uv * gBufferMaterials.diffuseNormalMapSize[diffuseMapIndex].xy, diffuseMapIndex)).rgb;
      }
    #endif
  }
  albedo = pow(albedo, vec3(2.2)); // to linear space

  out_albedo = vec4(albedo, 1.0);
  out_position = vec4(v_worldPosition, 0);
  out_normal = vec4(v_normal, 0);
  out_uvAndMeshId = vec4(v_uv, v_meshId, 0);
}
`;
}
