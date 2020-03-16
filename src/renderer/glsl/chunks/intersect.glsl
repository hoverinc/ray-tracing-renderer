export default `

uniform sampler2D positionBuffer;
uniform sampler2D normalBuffer;
uniform sampler2D uvBuffer;
uniform sampler2D bvhBuffer;

struct Triangle {
  vec3 p0;
  vec3 p1;
  vec3 p2;
};

void surfaceInteractionFromBVH(inout SurfaceInteraction si, Triangle tri, vec3 barycentric, ivec3 index, vec3 faceNormal, int materialIndex) {
  si.hit = true;
  si.faceNormal = faceNormal;
  si.position = barycentric.x * tri.p0 + barycentric.y * tri.p1 + barycentric.z * tri.p2;
  ivec2 i0 = unpackTexel(index.x, VERTEX_COLUMNS);
  ivec2 i1 = unpackTexel(index.y, VERTEX_COLUMNS);
  ivec2 i2 = unpackTexel(index.z, VERTEX_COLUMNS);

  vec3 n0 = texelFetch(normalBuffer, i0, 0).xyz;
  vec3 n1 = texelFetch(normalBuffer, i1, 0).xyz;
  vec3 n2 = texelFetch(normalBuffer, i2, 0).xyz;
  vec3 normal = normalize(barycentric.x * n0 + barycentric.y * n1 + barycentric.z * n2);

  #if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS) || defined(NUM_PBR_MAPS)
    vec2 uv0 = texelFetch(uvBuffer, i0, 0).xy;
    vec2 uv1 = texelFetch(uvBuffer, i1, 0).xy;
    vec2 uv2 = texelFetch(uvBuffer, i2, 0).xy;
    vec2 uv = fract(barycentric.x * uv0 + barycentric.y * uv1 + barycentric.z * uv2);
  #else
    vec2 uv = vec2(0.0);
  #endif

  si.materialType = int(getMatType(materialIndex));
  si.color = getMatColor(materialIndex, uv);
  si.roughness = getMatRoughness(materialIndex, uv);
  si.metalness = getMatMetalness(materialIndex, uv);

  #ifdef NUM_NORMAL_MAPS
    vec3 dp1 = tri.p0 - tri.p2;
    vec3 dp2 = tri.p1 - tri.p2;
    vec2 duv1 = uv0 - uv2;
    vec2 duv2 = uv1 - uv2;
    si.normal = getMatNormal(materialIndex, uv, normal, dp1, dp2, duv1, duv2);
  #else
    si.normal = normal;
  #endif
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
void intersectScene(inout Ray ray, inout SurfaceInteraction si) {
  si.hit = false;

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

    vec4 r1 = fetchData(bvhBuffer, i, BVH_COLUMNS);
    vec4 r2 = fetchData(bvhBuffer, i + 1, BVH_COLUMNS);

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
        fetchData(positionBuffer, index.x, VERTEX_COLUMNS).xyz,
        fetchData(positionBuffer, index.y, VERTEX_COLUMNS).xyz,
        fetchData(positionBuffer, index.z, VERTEX_COLUMNS).xyz
      );
      TriangleIntersect hit = intersectTriangle(ray, tri, maxDim, shear);

      if (hit.t > 0.0) {
        ray.tMax = hit.t;
        int materialIndex = floatBitsToInt(r2.w);
        vec3 faceNormal = r2.xyz;
        surfaceInteractionFromBVH(si, tri, hit.barycentric, index, faceNormal, materialIndex);
      }
    }
  }

  // Values must be clamped outside of intersection loop. Clamping inside the loop produces incorrect numbers on some devices.
  si.roughness = clamp(si.roughness, ROUGHNESS_MIN, 1.0);
  si.metalness = clamp(si.metalness, 0.0, 1.0);
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

    vec4 r1 = fetchData(bvhBuffer, i, BVH_COLUMNS);
    vec4 r2 = fetchData(bvhBuffer, i + 1, BVH_COLUMNS);

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
        fetchData(positionBuffer, index.x, VERTEX_COLUMNS).xyz,
        fetchData(positionBuffer, index.y, VERTEX_COLUMNS).xyz,
        fetchData(positionBuffer, index.z, VERTEX_COLUMNS).xyz
      );

      if (intersectTriangle(ray, tri, maxDim, shear).t > 0.0) {
        return true;
      }
    }
  }

  return false;
}

`;
