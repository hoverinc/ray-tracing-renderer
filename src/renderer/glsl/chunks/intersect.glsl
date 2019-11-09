export default function(defines) {
  return `

uniform highp isampler2D indices;
uniform sampler2D positions;
uniform sampler2D normals;
uniform sampler2D uvs;
uniform sampler2D bvh;

// G-Buffers
uniform sampler2D albedoBuffer;
uniform sampler2D positionBuffer;
uniform sampler2D normalBuffer;
uniform sampler2D uvAndMeshIdBuffer;

uniform Materials {
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

struct Triangle {
  vec3 p0;
  vec3 p1;
  vec3 p2;
};

SurfaceInteraction surfaceInteractionFromBuffer() {
  SurfaceInteraction si;
  vec4 positionNormalX = texture(positionBuffer, vCoord);
  vec4 normalNormalY = texture(normalBuffer, vCoord);
  vec4 uvAndMeshIdNormalZ = texture(uvAndMeshIdBuffer, vCoord);

  si.position = positionNormalX.xyz;//texture(positionBuffer, vCoord).xyz;
  si.normal = normalize(normalNormalY.xyz);//texture(normalBuffer, vCoord).xyz;
  si.faceNormal = normalize(vec3(positionNormalX.w, normalNormalY.w, uvAndMeshIdNormalZ.w));
  si.faceNormal = si.normal;

  si.hit = dot(si.normal, si.normal) > 0.0;
  if (!si.hit) {
    return si;
  }

  vec3 uvAndMeshId = uvAndMeshIdNormalZ.xyz;//texture(uvAndMeshIdBuffer, vCoord).xyz;

  vec2 uv = uvAndMeshId.xy;
  int materialIndex = int(uvAndMeshId.z);
  si.color = materials.colorAndMaterialType[materialIndex].rgb;

  #ifdef NUM_DIFFUSE_MAPS
    int diffuseMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].x;
    if (diffuseMapIndex >= 0) {
      si.color *= texture(diffuseMap, vec3(uv * materials.diffuseNormalMapSize[diffuseMapIndex].xy, diffuseMapIndex)).rgb;
    }
  #endif

  si.roughness = materials.roughnessMetalnessNormalScale[materialIndex].x;
  si.metalness = materials.roughnessMetalnessNormalScale[materialIndex].y;
  si.materialType = int(materials.colorAndMaterialType[materialIndex].w);

  #ifdef NUM_NORMAL_MAPS
    int normalMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].y;
    if (normalMapIndex >= 0) {
      vec2 duv02 = dFdx(uv);
      vec2 duv12 = dFdy(uv);
      vec3 dp02 = dFdx(si.position);
      vec3 dp12 = dFdy(si.position);

      vec3 dp12perp = cross(dp12, si.normal);
      vec3 dp02perp = cross(si.normal, dp02);
      vec3 dpdu = dp12perp * duv02.x + dp02perp * duv12.x;
      vec3 dpdv = dp12perp * duv02.y + dp02perp * duv12.y;
      float invmax = inversesqrt(max(dot(dpdu, dpdu), dot(dpdv, dpdv)));
      dpdu *= invmax;
      dpdv *= invmax;

      vec3 n = 2.0 * texture(normalMap, vec3(uv * materials.diffuseNormalMapSize[normalMapIndex].zw, normalMapIndex)).rgb - 1.0;
      n.xy *= materials.roughnessMetalnessNormalScale[materialIndex].zw;

      mat3 tbn = mat3(dpdu, dpdv, si.normal);

      si.normal = normalize(tbn * n);
    }
  #endif

  #ifdef NUM_PBR_MAPS
    int roughnessMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].z;
    int metalnessMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].w;
    if (roughnessMapIndex >= 0) {
      si.roughness *= texture(pbrMap, vec3(uv * materials.pbrMapSize[roughnessMapIndex].xy, roughnessMapIndex)).g;
    }
    if (metalnessMapIndex >= 0) {
      si.metalness *= texture(pbrMap, vec3(uv * materials.pbrMapSize[metalnessMapIndex].xy, metalnessMapIndex)).b;
    }
  #endif

  si.roughness = clamp(si.roughness, 0.03, 1.0);
  si.metalness = clamp(si.metalness, 0.0, 1.0);

  return si;
}

void surfaceInteractionFromTriangle(inout SurfaceInteraction si, Triangle tri, vec3 barycentric, ivec3 index, vec3 faceNormal, int materialIndex) {
  si.hit = true;
  si.faceNormal = faceNormal;
  si.position = barycentric.x * tri.p0 + barycentric.y * tri.p1 + barycentric.z * tri.p2;
  ivec2 i0 = unpackTexel(index.x, VERTEX_COLUMNS);
  ivec2 i1 = unpackTexel(index.y, VERTEX_COLUMNS);
  ivec2 i2 = unpackTexel(index.z, VERTEX_COLUMNS);

  vec3 n0 = texelFetch(normals, i0, 0).xyz;
  vec3 n1 = texelFetch(normals, i1, 0).xyz;
  vec3 n2 = texelFetch(normals, i2, 0).xyz;
  si.normal = normalize(barycentric.x * n0 + barycentric.y * n1 + barycentric.z * n2);

  si.color = materials.colorAndMaterialType[materialIndex].xyz;
  si.roughness = materials.roughnessMetalnessNormalScale[materialIndex].x;
  si.metalness = materials.roughnessMetalnessNormalScale[materialIndex].y;

  si.materialType = int(materials.colorAndMaterialType[materialIndex].w);

  #if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS) || defined(NUM_PBR_MAPS)
    vec2 uv0 = texelFetch(uvs, i0, 0).xy;
    vec2 uv1 = texelFetch(uvs, i1, 0).xy;
    vec2 uv2 = texelFetch(uvs, i2, 0).xy;
    vec2 uv = fract(barycentric.x * uv0 + barycentric.y * uv1 + barycentric.z * uv2);
  #endif

  #ifdef NUM_DIFFUSE_MAPS
    int diffuseMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].x;
    if (diffuseMapIndex >= 0) {
      si.color *= texture(diffuseMap, vec3(uv * materials.diffuseNormalMapSize[diffuseMapIndex].xy, diffuseMapIndex)).rgb;
    }
  #endif

  #ifdef NUM_NORMAL_MAPS
    int normalMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].y;
    if (normalMapIndex >= 0) {
      vec2 duv02 = uv0 - uv2;
      vec2 duv12 = uv1 - uv2;
      vec3 dp02 = tri.p0 - tri.p2;
      vec3 dp12 = tri.p1 - tri.p2;

      // Method One
      // http://www.pbr-book.org/3ed-2018/Shapes/Triangle_Meshes.html#fragment-Computetrianglepartialderivatives-0
      // Compute tangent vectors relative to the face normal. These vectors won't necessarily be orthogonal to the smoothed normal
      // This means the TBN matrix won't be orthogonal which is technically incorrect.
      // This is Three.js's method (https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderChunk/normalmap_pars_fragment.glsl.js)
      // --------------
      // float scale = sign(duv02.x * duv12.y - duv02.y * duv12.x);
      // vec3 dpdu = normalize((duv12.y * dp02 - duv02.y * dp12) * scale);
      // vec3 dpdv = normalize((-duv12.x * dp02 + duv02.x * dp12) * scale);

      // Method Two
      // Compute tangent vectors as in Method One but apply Gram-Schmidt process to make vectors orthogonal to smooth normal
      // This might inadvertently flip coordinate space orientation
      // --------------
      // float scale = sign(duv02.x * duv12.y - duv02.y * duv12.x);
      // vec3 dpdu = normalize((duv12.y * dp02 - duv02.y * dp12) * scale);
      // dpdu = (dpdu - dot(dpdu, si.normal) * si.normal); // Gram-Schmidt process
      // vec3 dpdv = cross(si.normal, dpdu) * scale;

      // Method Three
      // http://www.thetenthplanet.de/archives/1180
      // Compute co-tangent and co-bitangent vectors
      // These vectors are orthongal and maintain a consistent coordinate space
      // --------------
      vec3 dp12perp = cross(dp12, si.normal);
      vec3 dp02perp = cross(si.normal, dp02);
      vec3 dpdu = dp12perp * duv02.x + dp02perp * duv12.x;
      vec3 dpdv = dp12perp * duv02.y + dp02perp * duv12.y;
      float invmax = inversesqrt(max(dot(dpdu, dpdu), dot(dpdv, dpdv)));
      dpdu *= invmax;
      dpdv *= invmax;

      vec3 n = 2.0 * texture(normalMap, vec3(uv * materials.diffuseNormalMapSize[normalMapIndex].zw, normalMapIndex)).rgb - 1.0;
      n.xy *= materials.roughnessMetalnessNormalScale[materialIndex].zw;

      mat3 tbn = mat3(dpdu, dpdv, si.normal);

      si.normal = normalize(tbn * n);
    }
  #endif

  #ifdef NUM_PBR_MAPS
    int roughnessMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].z;
    int metalnessMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].w;
    if (roughnessMapIndex >= 0) {
      si.roughness *= texture(pbrMap, vec3(uv * materials.pbrMapSize[roughnessMapIndex].xy, roughnessMapIndex)).g;
    }
    if (metalnessMapIndex >= 0) {
      si.metalness *= texture(pbrMap, vec3(uv * materials.pbrMapSize[metalnessMapIndex].xy, metalnessMapIndex)).b;
    }
  #endif

  si.roughness = clamp(si.roughness, 0.03, 1.0);
  si.metalness = clamp(si.metalness, 0.0, 1.0);
}

struct TriangleIntersect {
  float t;
  vec3 barycentric;
};

// Triangle-ray intersection
// Faster than the classic Möller–Trumbore intersection algorithm
// http://www.pbr-book.org/3ed-2018/Shapes/Triangle_Meshes.html#TriangleIntersection
TriangleIntersect intersectTriangle(Ray r, Triangle tri, int maxDim, vec3 shear) {
  TriangleIntersect ti;
  vec3 d = r.d;

  // translate vertices based on ray origin
  vec3 p0t = tri.p0 - r.o;
  vec3 p1t = tri.p1 - r.o;
  vec3 p2t = tri.p2 - r.o;

  // permute components of triangle vertices
  if (maxDim == 0) {
    p0t = p0t.yzx;
    p1t = p1t.yzx;
    p2t = p2t.yzx;
  } else if (maxDim == 1) {
    p0t = p0t.zxy;
    p1t = p1t.zxy;
    p2t = p2t.zxy;
  }

  // apply shear transformation to translated vertex positions
  p0t.xy += shear.xy * p0t.z;
  p1t.xy += shear.xy * p1t.z;
  p2t.xy += shear.xy * p2t.z;

  // compute edge function coefficients
  vec3 e = vec3(
    p1t.x * p2t.y - p1t.y * p2t.x,
    p2t.x * p0t.y - p2t.y * p0t.x,
    p0t.x * p1t.y - p0t.y * p1t.x
  );

  // check if intersection is inside triangle
  if (any(lessThan(e, vec3(0))) && any(greaterThan(e, vec3(0)))) {
    return ti;
  }

  float det = e.x + e.y + e.z;

  // not needed?
  // if (det == 0.) {
  //   return ti;
  // }

  p0t.z *= shear.z;
  p1t.z *= shear.z;
  p2t.z *= shear.z;
  float tScaled = (e.x * p0t.z + e.y * p1t.z + e.z * p2t.z);

  // not needed?
  // if (sign(det) != sign(tScaled)) {
  //   return ti;
  // }

  // check if closer intersection already exists
  if (abs(tScaled) > abs(r.tMax * det)) {
    return ti;
  }

  float invDet = 1. / det;
  ti.t = tScaled * invDet;
  ti.barycentric = e * invDet;

  return ti;
}

struct Box {
  vec3 min;
  vec3 max;
};

// Branchless ray/box intersection
// https://tavianator.com/fast-branchless-raybounding-box-intersections/
float intersectBox(Ray r, Box b) {
  vec3 tBot = (b.min - r.o) * r.invD;
  vec3 tTop = (b.max - r.o) * r.invD;
  vec3 tNear = min(tBot, tTop);
  vec3 tFar = max(tBot, tTop);
  float t0 = max(tNear.x, max(tNear.y, tNear.z));
  float t1 = min(tFar.x, min(tFar.y, tFar.z));

  return (t0 > t1 || t0 > r.tMax) ? -1.0 : (t0 > 0.0 ? t0 : t1);
}

int maxDimension(vec3 v) {
  return v.x > v.y ? (v.x > v.z ? 0 : 2) : (v.y > v.z ? 1 : 2);
}

// Traverse BVH, find closest triangle intersection, and return surface information
SurfaceInteraction intersectScene(inout Ray ray) {
  SurfaceInteraction si;

  int maxDim = maxDimension(abs(ray.d));

  // Permute space so that the z dimension is the one where the absolute value of the ray's direction is largest.
  // Then create a shear transformation that aligns ray direction with the +z axis
  vec3 shear;
  if (maxDim == 0) {
    shear = vec3(-ray.d.y, -ray.d.z, 1.0) * ray.invD.x;
  } else if (maxDim == 1) {
    shear = vec3(-ray.d.z, -ray.d.x, 1.0) * ray.invD.y;
  } else {
    shear = vec3(-ray.d.x, -ray.d.y, 1.0) * ray.invD.z;
  }

  int nodesToVisit[STACK_SIZE];
  int stack = 0;

  nodesToVisit[0] = 0;

  while(stack >= 0) {
    int i = nodesToVisit[stack--];

    vec4 r1 = fetchData(bvh, i, BVH_COLUMNS);
    vec4 r2 = fetchData(bvh, i + 1, BVH_COLUMNS);

    int splitAxisOrNumPrimitives = floatBitsToInt(r1.w);

    if (splitAxisOrNumPrimitives >= 0) {
      // Intersection is a bounding box. Test for box intersection and keep traversing BVH
      int splitAxis = splitAxisOrNumPrimitives;

      Box bbox = Box(r1.xyz, r2.xyz);

      if (intersectBox(ray, bbox) > 0.0) {
        // traverse near node to ray first, and far node to ray last
        if (ray.d[splitAxis] > 0.0) {
          nodesToVisit[++stack] = floatBitsToInt(r2.w);
          nodesToVisit[++stack] = i + 2;
        } else {
          nodesToVisit[++stack] = i + 2;
          nodesToVisit[++stack] = floatBitsToInt(r2.w);
        }
      }
    } else {
      ivec3 index = floatBitsToInt(r1.xyz);
      Triangle tri = Triangle(
        fetchData(positions, index.x, VERTEX_COLUMNS).xyz,
        fetchData(positions, index.y, VERTEX_COLUMNS).xyz,
        fetchData(positions, index.z, VERTEX_COLUMNS).xyz
      );
      TriangleIntersect hit = intersectTriangle(ray, tri, maxDim, shear);

      if (hit.t > 0.0) {
        ray.tMax = hit.t;
        int materialIndex = floatBitsToInt(r2.w);
        vec3 faceNormal = r2.xyz;
        surfaceInteractionFromTriangle(si, tri, hit.barycentric, index, faceNormal, materialIndex);
      }
    }
  }

  // Values must be clamped outside of intersection loop. Clamping inside the loop produces incorrect numbers on some devices.
  si.roughness = clamp(si.roughness, 0.03, 1.0);
  si.metalness = clamp(si.metalness, 0.0, 1.0);

  return si;
}

bool intersectSceneShadow(inout Ray ray) {
  int maxDim = maxDimension(abs(ray.d));

  // Permute space so that the z dimension is the one where the absolute value of the ray's direction is largest.
  // Then create a shear transformation that aligns ray direction with the +z axis
  vec3 shear;
  if (maxDim == 0) {
    shear = vec3(-ray.d.y, -ray.d.z, 1.0) * ray.invD.x;
  } else if (maxDim == 1) {
    shear = vec3(-ray.d.z, -ray.d.x, 1.0) * ray.invD.y;
  } else {
    shear = vec3(-ray.d.x, -ray.d.y, 1.0) * ray.invD.z;
  }

  int nodesToVisit[STACK_SIZE];
  int stack = 0;

  nodesToVisit[0] = 0;

  while(stack >= 0) {
    int i = nodesToVisit[stack--];

    vec4 r1 = fetchData(bvh, i, BVH_COLUMNS);
    vec4 r2 = fetchData(bvh, i + 1, BVH_COLUMNS);

    int splitAxisOrNumPrimitives = floatBitsToInt(r1.w);

    if (splitAxisOrNumPrimitives >= 0) {
      int splitAxis = splitAxisOrNumPrimitives;

      Box bbox = Box(r1.xyz, r2.xyz);

      if (intersectBox(ray, bbox) > 0.0) {
        if (ray.d[splitAxis] > 0.0) {
          nodesToVisit[++stack] = floatBitsToInt(r2.w);
          nodesToVisit[++stack] = i + 2;
        } else {
          nodesToVisit[++stack] = i + 2;
          nodesToVisit[++stack] = floatBitsToInt(r2.w);
        }
      }
    } else {
      ivec3 index = floatBitsToInt(r1.xyz);
      Triangle tri = Triangle(
        fetchData(positions, index.x, VERTEX_COLUMNS).xyz,
        fetchData(positions, index.y, VERTEX_COLUMNS).xyz,
        fetchData(positions, index.z, VERTEX_COLUMNS).xyz
      );

      if (intersectTriangle(ray, tri, maxDim, shear).t > 0.0) {
        return true;
      }
    }
  }

  return false;
}
`;
}
