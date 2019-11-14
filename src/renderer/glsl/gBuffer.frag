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
  vec3 normal = v_normal;
  float materialType = gBufferMaterials.colorAndMaterialType[v_meshId].w;
  if (materialType != 3.0) {
    albedo = gBufferMaterials.colorAndMaterialType[v_meshId].xyz;
    #ifdef NUM_DIFFUSE_MAPS
      int diffuseMapIndex = gBufferMaterials.diffuseNormalRoughnessMetalnessMapIndex[v_meshId].x;
      if (diffuseMapIndex >= 0) {
        albedo *= texture(diffuseMap, vec3(v_uv * gBufferMaterials.diffuseNormalMapSize[diffuseMapIndex].xy, diffuseMapIndex)).rgb;
      }
    #endif

    #ifdef NUM_NORMAL_MAPS
    	int normalMapIndex = gBufferMaterials.diffuseNormalRoughnessMetalnessMapIndex[v_meshId].y;
    	if (normalMapIndex >= 0) {
        vec2 duv02 = dFdx(v_uv);
        vec2 duv12 = dFdy(v_uv);
        vec3 dp02 = dFdx(v_worldPosition);
        vec3 dp12 = dFdy(v_worldPosition);

        vec3 dp12perp = cross(dp12, normal);
        vec3 dp02perp = cross(normal, dp02);
        vec3 dpdu = dp12perp * duv02.x + dp02perp * duv12.x;
        vec3 dpdv = dp12perp * duv02.y + dp02perp * duv12.y;
        float invmax = inversesqrt(max(dot(dpdu, dpdu), dot(dpdv, dpdv)));
        dpdu *= invmax;
        dpdv *= invmax;

        vec3 n = 2.0 * texture(normalMap, vec3(v_uv * gBufferMaterials.diffuseNormalMapSize[normalMapIndex].zw, normalMapIndex)).rgb - 1.0;
        n.xy *= gBufferMaterials.roughnessMetalnessNormalScale[v_meshId].zw;

        mat3 tbn = mat3(dpdu, dpdv, normal);

        normal = normalize(tbn * n);
    	}
    #endif
  }

  // out_albedo = vec4(normalize(localNormal), 1.0);
  out_albedo = vec4(albedo, 1.0);
  out_position = vec4(v_worldPosition, v_flat_normal.x);
  out_normal = vec4(normal, 1.0);
  out_uvAndMeshId = vec4(v_uv, v_meshId, v_flat_normal.z);
}
`;
}
