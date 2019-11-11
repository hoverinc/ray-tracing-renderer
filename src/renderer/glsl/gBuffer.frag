import { addDefines } from '../glslUtil';

export default function({ gBufferRenderTargets, defines }) {
  return `#version 300 es

precision mediump float;
precision mediump int;

${addDefines(defines)}

${gBufferRenderTargets.set()}

in vec3 v_worldPosition;
in vec3 v_normal;
in vec2 v_uv;
flat in int v_meshId;
flat in vec3 v_flat_normal;

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

  out_albedo = vec4(albedo, 1.0);
  out_position = vec4(v_worldPosition, v_flat_normal.x);
  out_normal = vec4(v_normal, v_flat_normal.y);
  out_uvAndMeshId = vec4(v_uv, v_meshId, v_flat_normal.z);
}
`;
}
