export default `

uniform Materials {
  vec4 albedo_materialType[NUM_MATERIALS];
  vec4 roughness_metalness_normalScale[NUM_MATERIALS];

  #if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS) || defined(NUM_PBR_MAPS)
    ivec4 diffuse_normal_roughness_metalness_mapIndex[NUM_MATERIALS];
  #endif

  #if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS)
    vec4 diffuse_normal_mapSize[NUM_DIFFUSE_NORMAL_MAPS];
  #endif

  #if defined(NUM_PBR_MAPS)
    vec2 pbrMapSize[NUM_PBR_MAPS];
  #endif
} materials;

#ifdef NUM_DIFFUSE_MAPS
  uniform mediump sampler2DArray diffuseMap;
#endif

#ifdef NUM_NORMAL_MAPS
  uniform mediump sampler2DArray normalMap;
#endif

#ifdef NUM_PBR_MAPS
  uniform mediump sampler2DArray pbrMap;
#endif

float getMatType(int materialIndex) {
  return materials.albedo_materialType[materialIndex].w;
}

vec3 getMatAlbedo(int materialIndex, vec2 uv) {
  vec3 albedo = materials.albedo_materialType[materialIndex].rgb;

  #ifdef NUM_DIFFUSE_MAPS
    int diffuseMapIndex = materials.diffuse_normal_roughness_metalness_mapIndex[materialIndex].x;
    if (diffuseMapIndex >= 0) {
      vec3 texAlbedo = texture(diffuseMap, vec3(uv * materials.diffuse_normal_mapSize[diffuseMapIndex].xy, diffuseMapIndex)).rgb;

      // gamma correction done automatically by sRGB texture
      // texAlbedo = pow(texAlbedo, vec3(2.2));

      albedo *= texAlbedo;
    }
  #endif

  return albedo;
}

float getMatRoughness(int materialIndex, vec2 uv) {
  float roughness = materials.roughness_metalness_normalScale[materialIndex].x;

  #ifdef NUM_PBR_MAPS
    int roughnessMapIndex = materials.diffuse_normal_roughness_metalness_mapIndex[materialIndex].z;
    if (roughnessMapIndex >= 0) {
      roughness *= texture(pbrMap, vec3(uv * materials.pbrMapSize[roughnessMapIndex].xy, roughnessMapIndex)).g;
    }
  #endif

  return roughness;
}

float getMatMetalness(int materialIndex, vec2 uv) {
  float metalness = materials.roughness_metalness_normalScale[materialIndex].y;

  #ifdef NUM_PBR_MAPS
    int metalnessMapIndex = materials.diffuse_normal_roughness_metalness_mapIndex[materialIndex].w;
    if (metalnessMapIndex >= 0) {
      metalness *= texture(pbrMap, vec3(uv * materials.pbrMapSize[metalnessMapIndex].xy, metalnessMapIndex)).b;
    }
  #endif

  return metalness;
}

#ifdef NUM_NORMAL_MAPS
vec3 getMatNormal(int materialIndex, vec2 uv, vec3 normal, vec3 dp1, vec3 dp2, vec2 duv1, vec2 duv2) {
  int normalMapIndex = materials.diffuse_normal_roughness_metalness_mapIndex[materialIndex].y;
  if (normalMapIndex >= 0) {
    // http://www.thetenthplanet.de/archives/1180
    // Compute co-tangent and co-bitangent vectors
    vec3 dp2perp = cross(dp2, normal);
    vec3 dp1perp = cross(normal, dp1);
    vec3 dpdu = dp2perp * duv1.x + dp1perp * duv2.x;
    vec3 dpdv = dp2perp * duv1.y + dp1perp * duv2.y;
    float invmax = inversesqrt(max(dot(dpdu, dpdu), dot(dpdv, dpdv)));
    dpdu *= invmax;
    dpdv *= invmax;

    vec3 n = 2.0 * texture(normalMap, vec3(uv * materials.diffuse_normal_mapSize[normalMapIndex].zw, normalMapIndex)).rgb - 1.0;
    n.xy *= materials.roughness_metalness_normalScale[materialIndex].zw;

    mat3 tbn = mat3(dpdu, dpdv, normal);

    return normalize(tbn * n);
  } else {
    return normal;
  }
}
#endif
`;
