import random from './chunks/random.glsl';
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

// uniform vec2 resolution;
flat in mat4 v_view;


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

// vec2 randomVec2() {
//     vec2 seed = gl_FragCoord.xy/resolution.xy;
//     return vec2(fract(sin(seed.x) * 100000.0), fract(sin(seed.y)) * 111111.0);
// }

void main() {
  vec3 albedo = vec3(1.0);
  vec3 localNormal = v_normal;
  float materialType = gBufferMaterials.colorAndMaterialType[v_meshId].w;
  if (materialType != 3.0) {
    albedo = gBufferMaterials.colorAndMaterialType[v_meshId].xyz;
    #ifdef NUM_DIFFUSE_MAPS
      int diffuseMapIndex = gBufferMaterials.diffuseNormalRoughnessMetalnessMapIndex[v_meshId].x;
      if (diffuseMapIndex >= 0) {
        albedo *= texture(diffuseMap, vec3(v_uv * gBufferMaterials.diffuseNormalMapSize[diffuseMapIndex].xy, diffuseMapIndex)).rgb;
      }
    #endif

    // #ifdef NUM_NORMAL_MAPS
    // 	int normalMapIndex = gBufferMaterials.diffuseNormalRoughnessMetalnessMapIndex[v_meshId].y;
    // 	if (normalMapIndex >= 0) {
    // 		localNormal = texture(normalMap, vec3(v_uv * gBufferMaterials.diffuseNormalMapSize[normalMapIndex].xy, normalMapIndex)).rgb;
    // 		// localNormal = (v_view * vec4(localNormal, 0)).xyz;
    //     localNormal = (inverse(transpose(v_view)) * vec4(localNormal, 0.0)).xyz;
    // 	}
    // #endif
  }

  // out_albedo = vec4(normalize(localNormal), 1.0);
  out_albedo = vec4(albedo, 1.0);
  out_position = vec4(v_worldPosition, v_flat_normal.x);
  out_normal = vec4((localNormal), 1.0);
  out_uvAndMeshId = vec4(v_uv, v_meshId, v_flat_normal.z);
}
`;
}
