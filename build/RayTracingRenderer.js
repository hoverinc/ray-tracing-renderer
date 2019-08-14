(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('three')) :
  typeof define === 'function' && define.amd ? define(['exports', 'three'], factory) :
  (factory((global.RayTracingRenderer = {}),global.THREE));
}(this, (function (exports,THREE$1) { 'use strict';

  const ThinMaterial = 1;
  const ThickMaterial = 2;
  const ShadowCatcherMaterial = 3;

  var constants = /*#__PURE__*/Object.freeze({
    ThinMaterial: ThinMaterial,
    ThickMaterial: ThickMaterial,
    ShadowCatcherMaterial: ShadowCatcherMaterial
  });

  class LensCamera extends THREE$1.PerspectiveCamera {
    constructor(...args) {
      super(...args);
      this.aperture = 0.01;
    }

    copy(source, recursive) {
      super.copy(source, recursive);
      this.aperture = source.aperture;
    }
  }

  class SoftDirectionalLight extends THREE$1.DirectionalLight {
    constructor(...args) {
      super(...args);
      this.softness = 0.0;
    }

    copy(source) {
      super.copy(source);
      this.softness = source.softness;
    }
  }

  class RayTracingMaterial extends THREE$1.MeshStandardMaterial {
    constructor(...args) {
      super(...args);
      this.solid = false;
      this.shadowCatcher = false;
    }

    copy(source) {
      super.copy(source);
      this.solid = source.solid;
      this.shadowCatcher = source.shadowCatcher;
    }
  }

  function loadExtensions(gl, extensions) {
    const supported = {};
    for (const name of extensions) {
      supported[name] = gl.getExtension(name);
    }
    return supported;
  }

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if (success) {
      return shader;
    }

    console.log(
      source.split('\n').map((x, i) => `${i + 1}: ${x}`).join('\n')
    );

    throw gl.getShaderInfoLog(shader);
  }

  function createProgram(gl, vertexShader, fragmentShader, transformVaryings, transformBufferMode) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    if (transformVaryings) {
      gl.transformFeedbackVaryings(program, transformVaryings, transformBufferMode);
    }

    gl.linkProgram(program);

    gl.detachShader(program, vertexShader);
    gl.detachShader(program, fragmentShader);

    const success = gl.getProgramParameter(program, gl.LINK_STATUS);

    if (success) {
      return program;
    }

    throw gl.getProgramInfoLog(program);
  }

  function getUniforms(gl, program) {
    const uniforms = {};

    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const { name } = gl.getActiveUniform(program, i);
      const location = gl.getUniformLocation(program, name);
      if (location) {
        uniforms[name] = location;
      }
    }

    return uniforms;
  }

  function setData(dataView, setter, size, offset, stride, components, value) {
    const l = Math.min(value.length / components, size);
    for (let i = 0; i < l; i++) {
      for (let k = 0; k < components; k++) {
        dataView[setter](offset + i * stride + k * 4, value[components * i + k], true);
      }
    }
  }

  function makeUniformBuffer(gl, program, blockName) {
    const blockIndex = gl.getUniformBlockIndex(program, blockName);
    const blockSize = gl.getActiveUniformBlockParameter(program, blockIndex, gl.UNIFORM_BLOCK_DATA_SIZE);

    function getUniformInfo() {
      const indices = gl.getActiveUniformBlockParameter(program, blockIndex, gl.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES);
      const offset = gl.getActiveUniforms(program, indices, gl.UNIFORM_OFFSET);
      const stride = gl.getActiveUniforms(program, indices, gl.UNIFORM_ARRAY_STRIDE);

      const uniforms = {};
      for (let i = 0; i < indices.length; i++) {
        const { name, type, size } = gl.getActiveUniform(program, indices[i]);
        uniforms[name] = {
          type,
          size,
          offset: offset[i],
          stride: stride[i]
        };
      }

      return uniforms;
    }

    const uniforms = getUniformInfo();

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
    gl.bufferData(gl.UNIFORM_BUFFER, blockSize, gl.DYNAMIC_DRAW);

    const data = new DataView(new ArrayBuffer(blockSize));

    function set(name, value) {
      if (!uniforms[name]) {
        // console.warn('No uniform property with name ', name);
        return;
      }

      const { type, size, offset, stride } = uniforms[name];

      switch(type) {
        case gl.FLOAT:
          setData(data, 'setFloat32', size, offset, stride, 1, value);
          break;
        case gl.FLOAT_VEC2:
          setData(data, 'setFloat32', size, offset, stride, 2, value);
          break;
        case gl.FLOAT_VEC3:
          setData(data, 'setFloat32', size, offset, stride, 3, value);
          break;
        case gl.FLOAT_VEC4:
          setData(data, 'setFloat32', size, offset, stride, 4, value);
          break;
        case gl.INT:
          setData(data, 'setInt32', size, offset, stride, 1, value);
          break;
        case gl.INT_VEC2:
          setData(data, 'setInt32', size, offset, stride, 2, value);
          break;
        case gl.INT_VEC3:
          setData(data, 'setInt32', size, offset, stride, 3, value);
          break;
        case gl.INT_VEC4:
          setData(data, 'setInt32', size, offset, stride, 4, value);
          break;
        case gl.BOOL:
          setData(data, 'setUint32', size, offset, stride, 1, value);
          break;
        default:
          console.warn('UniformBuffer: Unsupported type');
      }
    }

    function bind(index) {
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data);
      gl.bindBufferBase(gl.UNIFORM_BUFFER, index, buffer);
    }

    return Object.freeze({
      set,
      bind
    });
  }

  function vertString(params) {
    return `#version 300 es

layout(location = 0) in vec2 position;
out vec2 vCoord;

void main() {
  vCoord = position;
  gl_Position = vec4(2. * position - 1., 0, 1);
}

`;
  }

  function makeFullscreenQuad(gl) {
    // TODO: use VAOs
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);

    // vertex shader should set layout(location = 0) on position attribute
    const posLoc = 0;

    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertString());

    function draw() {
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    return Object.freeze({
      draw,
      vertexShader
    });
  }

  // Manually performs linear filtering if the extension OES_texture_float_linear is not supported

  function textureLinear(params) {
    return `

  ${params.OES_texture_float_linear ? '#define OES_texture_float_linear' : ''}

  vec4 textureLinear(sampler2D map, vec2 uv) {
    #ifdef OES_texture_float_linear
      return texture(map, uv);
    #else
      vec2 size = vec2(textureSize(map, 0));
      vec2 texelSize = 1.0 / size;

      uv = uv * size - 0.5;
      vec2 f = fract(uv);
      uv = floor(uv) + 0.5;

      vec4 s1 = texture(map, (uv + vec2(0, 0)) * texelSize);
      vec4 s2 = texture(map, (uv + vec2(1, 0)) * texelSize);
      vec4 s3 = texture(map, (uv + vec2(0, 1)) * texelSize);
      vec4 s4 = texture(map, (uv + vec2(1, 1)) * texelSize);

      return mix(mix(s1, s2, f.x), mix(s3, s4, f.x), f.y);
    #endif
  }
`;
  }

  function intersect(params) {
    return `

#define BVH_COLUMNS ${params.bvhColumnsLog}
#define INDEX_COLUMNS ${params.indexColumnsLog}
#define VERTEX_COLUMNS ${params.vertexColumnsLog}
#define STACK_SIZE ${params.maxBvhDepth}
#define NUM_TRIS ${params.numTris}
#define NUM_MATERIALS ${params.numMaterials}
${params.numDiffuseMaps > 0 ? `#define NUM_DIFFUSE_MAPS ${params.numDiffuseMaps}` : ''}
${params.numNormalMaps > 0 ? `#define NUM_NORMAL_MAPS ${params.numNormalMaps}` : ''}
${params.numPbrMaps > 0 ? `#define NUM_PBR_MAPS ${params.numPbrMaps}` : ''}

uniform highp isampler2D indices;
uniform sampler2D positions;
uniform sampler2D normals;
uniform sampler2D uvs;
uniform sampler2D bvh;

uniform Materials {
  vec4 colorAndMaterialType[NUM_MATERIALS];
  vec4 roughnessMetalnessNormalScale[NUM_MATERIALS];

  #if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS) || defined(NUM_PBR_MAPS)
    ivec4 diffuseNormalRoughnessMetalnessMapIndex[NUM_MATERIALS];
  #endif

  #if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS)
    vec4 diffuseNormalMapSize[${Math.max(params.numDiffuseMaps, params.numNormalMaps)}];
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

void surfaceInteractionFromIntersection(inout SurfaceInteraction si, Triangle tri, vec3 barycentric, ivec3 index, vec3 faceNormal, int materialIndex) {
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
        surfaceInteractionFromIntersection(si, tri, hit.barycentric, index, faceNormal, materialIndex);
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

  // Random number generation as described by
  // http://www.reedbeta.com/blog/quick-and-easy-gpu-random-numbers-in-d3d11/

  function random(params) {
    return `

// higher quality but slower hashing function
uint wangHash(uint x) {
  x = (x ^ 61u) ^ (x >> 16u);
  x *= 9u;
  x = x ^ (x >> 4u);
  x *= 0x27d4eb2du;
  x = x ^ (x >> 15u);
  return x;
}

// lower quality but faster hashing function
uint xorshift(uint x) {
  x ^= x << 13u;
  x ^= x >> 17u;
  x ^= x << 5u;
  return x;
}

#define STRATA_DIMENSIONS ${params.strataDimensions}

uniform float seed; // Random number [0, 1)
uniform float strataStart[STRATA_DIMENSIONS];
uniform float strataSize;

const highp float maxUint = 1.0 / 4294967295.0;
highp uint randState;
int strataDimension;

// init state with high quality hashing function to avoid patterns across the 2d image
void initRandom() {
  randState = wangHash(floatBitsToUint(seed));
  randState *= wangHash(floatBitsToUint(vCoord.x));
  randState *= wangHash(floatBitsToUint(vCoord.y));
  randState = wangHash(randState);
  strataDimension = 0;
}

float random() {
  randState = xorshift(randState);
  float f = float(randState) * maxUint;

  // transform random number between [0, 1] to (0, 1)
  return EPS + (1.0 - 2.0 * EPS) * f;
}

vec2 randomVec2() {
  return vec2(random(), random());
}

float randomStrata() {
  return strataStart[strataDimension++] + strataSize * random();
}

vec2 randomStrataVec2() {
  return vec2(randomStrata(), randomStrata());
}
`;
  }

  // Sample the environment map using a cumulative distribution function as described in
  // http://www.pbr-book.org/3ed-2018/Light_Sources/Infinite_Area_Lights.html

  function envmap(params) {
    return `

uniform sampler2D envmap;
uniform sampler2D envmapDistribution;

float getEnvmapV(float u, out int vOffset, out float pdf) {
  ivec2 size = textureSize(envmap, 0);

  int left = 0;
  int right = size.y + 1; // cdf length is the length of the envmap + 1
  while (left < right) {
    int mid = (left + right) >> 1;
    float s = texelFetch(envmapDistribution, ivec2(0, mid), 0).x;
    if (s <= u) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  vOffset = left - 1;

  vec2 s0 = texelFetch(envmapDistribution, ivec2(0, vOffset), 0).xy;
  vec2 s1 = texelFetch(envmapDistribution, ivec2(0, vOffset + 1), 0).xy;

  pdf = s0.y;

  return (float(vOffset) +  (u - s0.x) / (s1.x - s0.x)) / float(size.y);
}

float getEnvmapU(float u, int vOffset, out float pdf) {
  ivec2 size = textureSize(envmap, 0);

  int left = 0;
  int right = size.x + 1; // cdf length is the length of the envmap + 1
  while (left < right) {
    int mid = (left + right) >> 1;
    float s = texelFetch(envmapDistribution, ivec2(1 + mid, vOffset), 0).x;
    if (s <= u) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  int uOffset = left - 1;

  vec2 s0 = texelFetch(envmapDistribution, ivec2(1 + uOffset, vOffset), 0).xy;
  vec2 s1 = texelFetch(envmapDistribution, ivec2(1 + uOffset + 1, vOffset), 0).xy;

  pdf = s0.y;

  return (float(uOffset) + (u - s0.x) / (s1.x - s0.x)) / float(size.x);
}

// Perform two binary searches to find light direction.
vec3 sampleEnvmap(vec2 random, out vec2 uv, out float pdf) {
  vec2 partialPdf;
  int vOffset;

  uv.y = getEnvmapV(random.x, vOffset, partialPdf.y);
  uv.x = getEnvmapU(random.y, vOffset, partialPdf.x);

  float phi = uv.x * TWOPI;
  float theta = uv.y * PI;
  float cosTheta = cos(theta);
  float sinTheta = sin(theta);
  float cosPhi = cos(phi);
  float sinPhi = sin(phi);

  vec3 dir = vec3(sinTheta * cosPhi, cosTheta, sinTheta * sinPhi);

  pdf = partialPdf.x * partialPdf.y * INVPI2 / (2.0 * sinTheta);

  return dir;
}

float envmapPdf(vec2 uv) {
  vec2 size = vec2(textureSize(envmap, 0));

  float sinTheta = sin(uv.y * PI);

  uv *= size;

  float partialX = texelFetch(envmapDistribution, ivec2(1.0 + uv.x, uv.y), 0).g;
  float partialY = texelFetch(envmapDistribution, ivec2(0, uv.y), 0).g;

  return partialX * partialY * INVPI2 / (2.0 * sinTheta);
}

vec3 sampleEnvmapFromDirection(vec3 d) {
  float theta = acos(d.y) * INVPI;
  float phi = mod(atan(d.z, d.x), TWOPI) * 0.5 * INVPI;

  return textureLinear(envmap, vec2(phi, theta)).rgb;
}

// debugging function
vec3 sampleEnvmapDistributionFromDirection(vec3 d) {
  vec2 size = vec2(textureSize(envmap, 0));

  float theta = acos(d.y) * INVPI;
  float phi = mod(atan(d.z, d.x), TWOPI) * 0.5 * INVPI;

  float u = texelFetch(envmapDistribution, ivec2(1.0 + phi * size.x, theta * size.y), 0).g;
  float v = texelFetch(envmapDistribution, ivec2(0, theta * size.y), 0).g;

  return vec3(u * v);
}

`;
  }

  function bsdf(params) {
    return `

// Computes the exact value of the Fresnel factor
// https://seblagarde.wordpress.com/2013/04/29/memo-on-fresnel-equations/
float fresnel(float cosTheta, float eta, float invEta) {
  eta = cosTheta > 0.0 ? eta : invEta;
  cosTheta = abs(cosTheta);

  float gSquared = eta * eta + cosTheta * cosTheta - 1.0;

  if (gSquared < 0.0) {
    return 1.0;
  }

  float g = sqrt(gSquared);

  float a = (g - cosTheta) / (g + cosTheta);
  float b = (cosTheta * (g + cosTheta) - 1.0) / (cosTheta * (g - cosTheta) + 1.0);

  return 0.5 * a * a * (1.0 + b * b);
}

float fresnelSchlickWeight(float cosTheta) {
  float w = 1.0 - cosTheta;
  return (w * w) * (w * w) * w;
}

// Computes Schlick's approximation of the Fresnel factor
// Assumes ray is moving from a less dense to a more dense medium
float fresnelSchlick(float cosTheta, float r0) {
  return mix(fresnelSchlickWeight(cosTheta), 1.0, r0);
}

// Computes Schlick's approximation of Fresnel factor
// Accounts for total internal reflection if ray is moving from a more dense to a less dense medium
float fresnelSchlickTIR(float cosTheta, float r0, float ni) {

  // moving from a more dense to a less dense medium
  if (cosTheta < 0.0) {
    float inv_eta = ni;
    float SinT2 = inv_eta * inv_eta * (1.0f - cosTheta * cosTheta);
    if (SinT2 > 1.0) {
        return 1.0; // total internal reflection
    }
    cosTheta = sqrt(1.0f - SinT2);
  }

  return mix(fresnelSchlickWeight(cosTheta), 1.0, r0);
}

float trowbridgeReitzD(float cosTheta, float alpha2) {
  float e = cosTheta * cosTheta * (alpha2 - 1.0) + 1.0;
  return alpha2 / (PI * e * e);
}

float trowbridgeReitzLambda(float cosTheta, float alpha2) {
  float cos2Theta = cosTheta * cosTheta;
  float tan2Theta = (1.0 - cos2Theta) / cos2Theta;
  return 0.5 * (-1.0 + sqrt(1.0 + alpha2 * tan2Theta));
}

// An implementation of Disney's principled BRDF
// https://disney-animation.s3.amazonaws.com/library/s2012_pbs_disney_brdf_notes_v2.pdf
vec3 materialBrdf(SurfaceInteraction si, vec3 viewDir, vec3 lightDir, float cosThetaL, float diffuseWeight, out float pdf) {
  vec3 halfVector = normalize(viewDir + lightDir);

  cosThetaL = abs(cosThetaL);
  float cosThetaV = abs(dot(si.normal, viewDir));
  float cosThetaH = abs(dot(si.normal, halfVector));
  float cosThetaD = abs(dot(lightDir, halfVector));

  float alpha2 = (si.roughness * si.roughness) * (si.roughness * si.roughness);

  float F = fresnelSchlick(cosThetaD, mix(R0, 0.6, si.metalness));
  float D = trowbridgeReitzD(cosThetaH, alpha2);

  float roughnessRemapped = 0.5 + 0.5 * si.roughness;
  float alpha2Remapped = (roughnessRemapped * roughnessRemapped) * (roughnessRemapped * roughnessRemapped);

  float G = 1.0 / (1.0 + trowbridgeReitzLambda(cosThetaV, alpha2Remapped) + trowbridgeReitzLambda(cosThetaL, alpha2Remapped));

  float specular = F * D * G / (4.0 * cosThetaV * cosThetaL);
  float specularPdf = D * cosThetaH / (4.0 * cosThetaD);

  float f = -0.5 + 2.0 * cosThetaD * cosThetaD * si.roughness;
  float diffuse = diffuseWeight * INVPI * (1.0 + f * fresnelSchlickWeight(cosThetaL)) * (1.0 + f * fresnelSchlickWeight(cosThetaV));
  float diffusePdf = cosThetaL * INVPI;

  pdf = mix(0.5 * (specularPdf + diffusePdf), specularPdf, si.metalness);

  return mix(si.color * diffuse + mix(si.color, vec3(1.0), F) * specular, si.color * specular, si.metalness);
}

`;
  }

  function sample(params) {
    return `

// https://graphics.pixar.com/library/OrthonormalB/paper.pdf
mat3 orthonormalBasis(vec3 n) {
  float zsign = n.z >= 0.0 ? 1.0 : -1.0;
  float a = -1.0 / (zsign + n.z);
  float b = n.x * n.y * a;
  vec3 s = vec3(1.0 + zsign * n.x * n.x * a, zsign * b, -zsign * n.x);
  vec3 t = vec3(b, zsign + n.y * n.y * a, -n.y);
  return mat3(s, t, n);
}

// http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#SamplingaUnitDisk
vec2 sampleCircle(vec2 p) {
  p = 2.0 * p - 1.0;

  bool greater = abs(p.x) > abs(p.y);

  float r = greater ? p.x : p.y;
  float theta = greater ? 0.25 * PI * p.y / p.x : PI * (0.5 - 0.25 * p.x / p.y);

  return r * vec2(cos(theta), sin(theta));
}

// http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#Cosine-WeightedHemisphereSampling
vec3 cosineSampleHemisphere(vec2 p) {
  vec2 h = sampleCircle(p);
  float z = sqrt(max(0.0, 1.0 - h.x * h.x - h.y * h.y));
  return vec3(h, z);
}


// http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Sampling_Reflection_Functions.html#MicrofacetBxDFs
// Instead of Beckmann distrubtion, we use the GTR2 (GGX) distrubtion as covered in Disney's Principled BRDF paper
vec3 lightDirSpecular(vec3 faceNormal, vec3 viewDir, mat3 basis, float roughness, vec2 random) {
  float phi = TWOPI * random.y;
  float alpha = roughness * roughness;
  float cosTheta = sqrt((1.0 - random.x) / (1.0 + (alpha * alpha - 1.0) * random.x));
  float sinTheta = sqrt(1.0 - cosTheta * cosTheta);

  vec3 halfVector = basis * sign(dot(faceNormal, viewDir)) * vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);

  vec3 lightDir = reflect(-viewDir, halfVector);

  return lightDir;
}

vec3 lightDirDiffuse(vec3 faceNormal, vec3 viewDir, mat3 basis, vec2 random) {
  return basis * sign(dot(faceNormal, viewDir)) * cosineSampleHemisphere(random);
}

float powerHeuristic(float f, float g) {
  return (f * f) / (f * f + g * g);
}

`;
  }

  // Estimate the direct lighting integral using multiple importance sampling
  // http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Direct_Lighting.html#EstimatingtheDirectLightingIntegral

  function sampleMaterial(params) {
    return `

vec3 importanceSampleLight(SurfaceInteraction si, vec3 viewDir, bool lastBounce, vec2 random) {
  vec3 li;

  float lightPdf;
  vec2 uv;
  vec3 lightDir = sampleEnvmap(random, uv, lightPdf);

  float cosThetaL = dot(si.normal, lightDir);

  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  if (orientation < 0.0) {
    return li;
  }

  float diffuseWeight = 1.0;
  Ray ray;
  initRay(ray, si.position + EPS * lightDir, lightDir);
  if (intersectSceneShadow(ray)) {
    if (lastBounce) {
      diffuseWeight = 0.0;
    } else {
      return li;
    }
  }

  vec3 irr = textureLinear(envmap, uv).xyz;

  float scatteringPdf;
  vec3 brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, diffuseWeight, scatteringPdf);

  float weight = powerHeuristic(lightPdf, scatteringPdf);

  li = brdf * irr * abs(cosThetaL) * weight / lightPdf;

  return li;
}

vec3 importanceSampleMaterial(SurfaceInteraction si, vec3 viewDir, bool lastBounce, vec3 lightDir) {
  vec3 li;

  float cosThetaL = dot(si.normal, lightDir);

  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  if (orientation < 0.0) {
    return li;
  }

  float diffuseWeight = 1.0;
  Ray ray;
  initRay(ray, si.position + EPS * lightDir, lightDir);
  if (intersectSceneShadow(ray)) {
    if (lastBounce) {
      diffuseWeight = 0.0;
    } else {
      return li;
    }
  }

  float phi = mod(atan(lightDir.z, lightDir.x), TWOPI);
  float theta = acos(lightDir.y);
  vec2 uv = vec2(0.5 * phi * INVPI, theta * INVPI);

  float lightPdf = envmapPdf(uv);

  vec3 irr = textureLinear(envmap, uv).rgb;

  float scatteringPdf;
  vec3 brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, diffuseWeight, scatteringPdf);

  float weight = powerHeuristic(scatteringPdf, lightPdf);

  li += brdf * irr * abs(cosThetaL) * weight / scatteringPdf;

  return li;
}

vec3 sampleMaterial(SurfaceInteraction si, int bounce, inout Ray ray, inout vec3 beta, inout bool abort) {
  mat3 basis = orthonormalBasis(si.normal);
  vec3 viewDir = -ray.d;

  vec2 diffuseOrSpecular = randomStrataVec2();

  vec3 lightDir = diffuseOrSpecular.x < mix(0.5, 0.0, si.metalness) ?
    lightDirDiffuse(si.faceNormal, viewDir, basis, randomStrataVec2()) :
    lightDirSpecular(si.faceNormal, viewDir, basis, si.roughness, randomStrataVec2());

  bool lastBounce = bounce == BOUNCES;

  // Add path contribution
  vec3 li = beta * (
      importanceSampleLight(si, viewDir, lastBounce, randomStrataVec2()) +
      importanceSampleMaterial(si, viewDir, lastBounce, lightDir)
    );

  // Get new path direction

  lightDir = diffuseOrSpecular.y < mix(0.5, 0.0, si.metalness) ?
    lightDirDiffuse(si.faceNormal, viewDir, basis, randomStrataVec2()) :
    lightDirSpecular(si.faceNormal, viewDir, basis, si.roughness, randomStrataVec2());

  float cosThetaL = dot(si.normal, lightDir);

  float scatteringPdf;
  vec3 brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, 1.0, scatteringPdf);

  beta *= abs(cosThetaL) * brdf / scatteringPdf;

  initRay(ray, si.position + EPS * lightDir, lightDir);

  // If new ray direction is pointing into the surface,
  // the light path is physically impossible and we terminate the path.
  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  abort = orientation < 0.0;

  return li;
}

`;
  }

  function sampleShadowCatcher (params) {
    return `

#ifdef USE_SHADOW_CATCHER

float importanceSampleLightShadowCatcher(SurfaceInteraction si, vec3 viewDir, vec2 random, inout float alpha) {
  float li;

  float lightPdf;
  vec2 uv;
  vec3 lightDir = sampleEnvmap(random, uv, lightPdf);

  float cosThetaL = dot(si.normal, lightDir);

  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  if (orientation < 0.0) {
    return li;
  }

  float occluded = 1.0;

  Ray ray;
  initRay(ray, si.position + EPS * lightDir, lightDir);
  if (intersectSceneShadow(ray)) {
    occluded = 0.0;
  }

  float irr = dot(luminance, textureLinear(envmap, uv).rgb);

  // lambertian BRDF
  float brdf = INVPI;
  float scatteringPdf = abs(cosThetaL) * INVPI;

  float weight = powerHeuristic(lightPdf, scatteringPdf);

  float lightEq = irr * brdf * abs(cosThetaL) * weight / lightPdf;

  alpha += lightEq;
  li += occluded * lightEq;

  return li;
}

float importanceSampleMaterialShadowCatcher(SurfaceInteraction si, vec3 viewDir, vec3 lightDir, inout float alpha) {
  float li;

  float cosThetaL = dot(si.normal, lightDir);

  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  if (orientation < 0.0) {
    return li;
  }

  float occluded = 1.0;

  Ray ray;
  initRay(ray, si.position + EPS * lightDir, lightDir);
  if (intersectSceneShadow(ray)) {
    occluded = 0.0;
  }

  float phi = mod(atan(lightDir.z, lightDir.x), TWOPI);
  float theta = acos(lightDir.y);
  vec2 uv = vec2(0.5 * phi * INVPI, theta * INVPI);

  float lightPdf = envmapPdf(uv);

  float irr = dot(luminance, textureLinear(envmap, uv).rgb);

  // lambertian BRDF
  float brdf = INVPI;
  float scatteringPdf = abs(cosThetaL) * INVPI;

  float weight = powerHeuristic(scatteringPdf, lightPdf);

  float lightEq = irr * brdf * abs(cosThetaL) * weight / scatteringPdf;

  alpha += lightEq;
  li += occluded * lightEq;

  return li;
}

vec3 sampleShadowCatcher(SurfaceInteraction si, int bounce, inout Ray ray, inout vec3 beta, inout float alpha, inout vec3 prevLi, inout bool abort) {
  mat3 basis = orthonormalBasis(si.normal);
  vec3 viewDir = -ray.d;
  vec3 color = sampleEnvmapFromDirection(-viewDir);

  vec3 lightDir = lightDirDiffuse(si.faceNormal, viewDir, basis, randomStrataVec2());

  float alphaBounce = 0.0;

  // Add path contribution
  vec3 li = beta * color * (
      importanceSampleLightShadowCatcher(si, viewDir, randomStrataVec2(), alphaBounce) +
      importanceSampleMaterialShadowCatcher(si, viewDir, lightDir, alphaBounce)
    );

  // alphaBounce contains the lighting of the shadow catcher *without* shadows
  alphaBounce = alphaBounce == 0.0 ? 1.0 : alphaBounce;

  // in post processing step, we divide by alpha to obtain the percentage of light relative to shadow for the shadow catcher
  alpha *= alphaBounce;

  // we only want the alpha division to affect the shadow catcher
  // factor in alpha to the previous light, so that dividing by alpha with the previous light cancels out this contribution
  prevLi *= alphaBounce;

  // Get new path direction

  lightDir = lightDirDiffuse(si.faceNormal, viewDir, basis, randomStrataVec2());

  float cosThetaL = dot(si.normal, lightDir);

  // lambertian brdf with terms cancelled
  beta *= color;

  initRay(ray, si.position + EPS * lightDir, lightDir);

  // If new ray direction is pointing into the surface,
  // the light path is physically impossible and we terminate the path.
  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  abort = orientation < 0.0;

  // advance strata index by unused stratified samples
  const int usedStrata = 6;
  strataDimension += STRATA_PER_MATERIAL - usedStrata;

  return li;
}

#endif
`;
  }

  function sampleGlass (params) {
    return `

#ifdef USE_GLASS

vec3 sampleGlassSpecular(SurfaceInteraction si, int bounce, inout Ray ray, inout vec3 beta) {
  vec3 viewDir = -ray.d;
  float cosTheta = dot(si.normal, viewDir);

  float F = si.materialType == THIN_GLASS ?
    fresnelSchlick(abs(cosTheta), R0) : // thin glass
    fresnelSchlickTIR(cosTheta, R0, IOR); // thick glass

  vec3 lightDir;

  float reflectionOrRefraction = randomStrata();

  if (reflectionOrRefraction < F) {
    lightDir = reflect(-viewDir, si.normal);
  } else {
    lightDir = si.materialType == THIN_GLASS ?
      refract(-viewDir, sign(cosTheta) * si.normal, INV_IOR_THIN) : // thin glass
      refract(-viewDir, sign(cosTheta) * si.normal, cosTheta < 0.0 ? IOR : INV_IOR); // thick glass
    beta *= si.color;
  }

  initRay(ray, si.position + EPS * lightDir, lightDir);

  // advance strata index by unused stratified samples
  const int usedStrata = 1;
  strataDimension += STRATA_PER_MATERIAL - usedStrata;

  return bounce == BOUNCES ? beta * sampleEnvmapFromDirection(lightDir) : vec3(0.0);
}

#endif

`;
  }

  function unrollLoop(indexName, start, limit, step, code) {
    let unrolled = `int ${indexName};\n`;

    for (let i = start; (step > 0 && i < limit) || (step < 0 && i > limit); i += step) {
      unrolled += `${indexName} = ${i};\n`;
      unrolled += code;
    }

    return unrolled;
  }

  function fragString(params) {
    return `#version 300 es

precision mediump float;
precision mediump int;

#define PI 3.14159265359
#define TWOPI 6.28318530718
#define INVPI 0.31830988618
#define INVPI2 0.10132118364
#define EPS 0.0005
#define INF 1.0e999
#define RAY_MAX_DISTANCE 9999.0

#define STANDARD 0
#define THIN_GLASS 1
#define THICK_GLASS 2
#define SHADOW_CATCHER 3

#define STRATA_PER_MATERIAL 8

const float IOR = 1.5;
const float INV_IOR = 1.0 / IOR;

const float IOR_THIN = 1.015;
const float INV_IOR_THIN = 1.0 / IOR_THIN;

const float R0 = (1.0 - IOR) * (1.0 - IOR)  / ((1.0 + IOR) * (1.0 + IOR));

// https://www.w3.org/WAI/GL/wiki/Relative_luminance
const vec3 luminance = vec3(0.2126, 0.7152, 0.0722);

#define BOUNCES ${params.bounces}
${params.useGlass ? '#define USE_GLASS' : ''}
${params.useShadowCatcher ? '#define USE_SHADOW_CATCHER' : ''}

struct Ray {
  vec3 o;
  vec3 d;
  vec3 invD;
  float tMax;
};

struct SurfaceInteraction {
  bool hit;
  vec3 position;
  vec3 normal; // smoothed normal from the three triangle vertices
  vec3 faceNormal; // normal of the triangle
  vec3 color;
  float roughness;
  float metalness;
  int materialType;
};

struct Camera {
  mat4 transform;
  float aspect;
  float fov;
  float focus;
  float aperture;
};

uniform Camera camera;
uniform vec2 pixelSize; // 1 / screenResolution

in vec2 vCoord;

out vec4 fragColor;

void initRay(inout Ray ray, vec3 origin, vec3 direction) {
  ray.o = origin;
  ray.d = direction;
  ray.invD = 1.0 / ray.d;
  ray.tMax = RAY_MAX_DISTANCE;
}

// given the index from a 1D array, retrieve corresponding position from packed 2D texture
ivec2 unpackTexel(int i, int columnsLog2) {
  ivec2 u;
  u.y = i >> columnsLog2; // equivalent to (i / 2^columnsLog2)
  u.x = i - (u.y << columnsLog2); // equivalent to (i % 2^columnsLog2)
  return u;
}

vec4 fetchData(sampler2D s, int i, int columnsLog2) {
  return texelFetch(s, unpackTexel(i, columnsLog2), 0);
}

ivec4 fetchData(isampler2D s, int i, int columnsLog2) {
  return texelFetch(s, unpackTexel(i, columnsLog2), 0);
}

${textureLinear(params)}
${intersect(params)}
${random(params)}
${envmap(params)}
${bsdf(params)}
${sample(params)}
${sampleMaterial(params)}
${sampleGlass(params)}
${sampleShadowCatcher(params)}

struct Path {
  Ray ray;
  float alpha;
  vec3 beta;
  bool specularBounce;
  bool abort;
};

vec3 bounce(inout Path path, int i) {
  vec3 li;

  if (path.abort) {
    return li;
  }

  SurfaceInteraction si = intersectScene(path.ray);

  if (!si.hit) {
    if (path.specularBounce) {
      li += path.beta * sampleEnvmapFromDirection(path.ray.d);
    }

    path.abort = true;
  } else {
    #ifdef USE_GLASS
      if (si.materialType == THIN_GLASS || si.materialType == THICK_GLASS) {
        li += sampleGlassSpecular(si, i, path.ray, path.beta);
        path.specularBounce = true;
      }
    #endif
    #ifdef USE_SHADOW_CATCHER
      if (si.materialType == SHADOW_CATCHER) {
        li += sampleShadowCatcher(si, i, path.ray, path.beta, path.alpha, li, path.abort);
        path.specularBounce = false;
      }
    #endif
    if (si.materialType == STANDARD) {
      li += sampleMaterial(si, i, path.ray, path.beta, path.abort);
      path.specularBounce = false;
    }

    // Russian Roulette sampling
    if (i >= 2) {
      float q = 1.0 - dot(path.beta, luminance);
      if (randomStrata() < q) {
        path.abort = true;
      }
      path.beta /= 1.0 - q;
    }
  }

  return li;
}

// Path tracing integrator as described in
// http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Path_Tracing.html#
vec4 integrator(inout Ray ray) {
  vec3 li;

  Path path;
  path.ray = ray;
  path.alpha = 1.0;
  path.beta = vec3(1.0);
  path.specularBounce = true;
  path.abort = false;

  // Manually unroll for loop.
  // Some hardware fails to interate over a GLSL loop, so we provide this workaround

  // for (int i = 1; i < params.bounces + 1, i += 1)
  // equivelant to
  ${unrollLoop('i', 1, params.bounces + 1, 1, `
    li += bounce(path, i);
  `)}

  return vec4(li, path.alpha);
}

void main() {
  initRandom();

  vec2 vCoordAntiAlias = vCoord + pixelSize * (randomStrataVec2() - 0.5);

  vec3 direction = normalize(vec3(vCoordAntiAlias - 0.5, -1.0) * vec3(camera.aspect, 1.0, camera.fov));

  // Thin lens model with depth-of-field
  // http://www.pbr-book.org/3ed-2018/Camera_Models/Projective_Camera_Models.html#TheThinLensModelandDepthofField
  vec2 lensPoint = camera.aperture * sampleCircle(randomStrataVec2());
  vec3 focusPoint = -direction * camera.focus / direction.z; // intersect ray direction with focus plane

  vec3 origin = vec3(lensPoint, 0.0);
  direction = normalize(focusPoint - origin);

  origin = vec3(camera.transform * vec4(origin, 1.0));
  direction = mat3(camera.transform) * direction;

  Ray cam;
  initRay(cam, origin, direction);

  vec4 liAndAlpha = integrator(cam);

  if (!(liAndAlpha.x < INF && liAndAlpha.x > -EPS)) {
    liAndAlpha = vec4(0, 0, 0, 1);
  }

  fragColor = liAndAlpha;

  // Stratified Sampling Sample Count Test
  // ---------------
  // Uncomment the following code
  // Then observe the colors of the image
  // If:
  // * The resulting image is pure black
  //   Extra samples are being passed to the shader that aren't being used.
  // * The resulting image contains red
  //   Not enough samples are being passed to the shader
  // * The resulting image contains only white with some black
  //   All samples are used by the shader. Correct result!

  // fragColor = vec4(0, 0, 0, 1);
  // if (strataDimension == STRATA_DIMENSIONS) {
  //   fragColor = vec4(1, 1, 1, 1);
  // } else if (strataDimension > STRATA_DIMENSIONS) {
  //   fragColor = vec4(1, 0, 0, 1);
  // }
}
`;
  }

  function addFlatGeometryIndices(geometry) {
    const position = geometry.getAttribute('position');

    if (!position) {
      console.warn('No position attribute');
      return;
    }

    const index = new Uint32Array(position.count);

    for (let i = 0; i < index.length; i++) {
      index[i] = i;
    }

    geometry.setIndex(new THREE$1.BufferAttribute(index, 1, false));

    return geometry;
  }

  function mergeGeometry(geometryAndMaterialIndex, vertexCount, indexCount) {
    const position = new THREE$1.BufferAttribute(new Float32Array(3 * vertexCount), 3, false);
    const normal = new THREE$1.BufferAttribute(new Float32Array(3 * vertexCount), 3, false);
    const uv = new THREE$1.BufferAttribute(new Float32Array(2 * vertexCount), 2, false);
    const index = new THREE$1.BufferAttribute(new Uint32Array(indexCount), 1, false);

    const materialIndices = [];

    const bg = new THREE$1.BufferGeometry();
    bg.addAttribute('position', position);
    bg.addAttribute('normal', normal);
    bg.addAttribute('uv', uv);
    bg.setIndex(index);

    let vertexIndex = 0;
    let indexIndex = 0;

    for (const { geometry, materialIndex } of geometryAndMaterialIndex) {
      bg.merge(geometry, vertexIndex);

      const meshIndex = geometry.getIndex();
      for (let k = 0; k < meshIndex.count; k++) {
        index.setX(indexIndex + k, vertexIndex + meshIndex.getX(k));
      }

      const triangleCount = meshIndex.count / 3;
      for (let k = 0; k < triangleCount; k++) {
        materialIndices.push(materialIndex);
      }

      vertexIndex += geometry.getAttribute('position').count;
      indexIndex += meshIndex.count;
    }

    return { geometry: bg, materialIndices };
  }

  function mergeMeshesToGeometry(meshes) {

    let vertexCount = 0;
    let indexCount = 0;

    const geometryAndMaterialIndex = [];
    const materialIndexMap = new Map();

    for (const mesh of meshes) {
      const geometry = mesh.geometry.clone();

      const index = geometry.getIndex();
      if (!index) {
        addFlatGeometryIndices(geometry);
      }

      geometry.applyMatrix(mesh.matrixWorld);

      if (!geometry.getAttribute('normal')) {
        geometry.computeVertexNormals();
      }

      vertexCount += geometry.getAttribute('position').count;
      indexCount += geometry.getIndex().count;

      const material = mesh.material;
      let materialIndex = materialIndexMap.get(material);
      if (materialIndex === undefined) {
        materialIndex = materialIndexMap.size;
        materialIndexMap.set(material, materialIndex);
      }

      geometryAndMaterialIndex.push({
        geometry,
        materialIndex
      });
    }

    const { geometry, materialIndices } = mergeGeometry(geometryAndMaterialIndex, vertexCount, indexCount);

    return {
      geometry,
      materialIndices,
      materials: Array.from(materialIndexMap.keys())
    };
  }

  function swap(array, a, b) {
    const x = array[b];
    array[b] = array[a];
    array[a] = x;
  }

  // https://en.cppreference.com/w/cpp/algorithm/partition
  function partition(array, compare, left = 0, right = array.length) {
    while (left !== right) {
      while (compare(array[left])) {
        left++;
        if (left === right) {
          return left;
        }
      }
      do {
        right--;
        if (left === right) {
          return left;
        }
      } while (!compare(array[right]));

      swap(array, left, right);
      left++;
    }

    return left;
  }

  // https://en.cppreference.com/w/cpp/algorithm/nth_element
  function nthElement(array, compare, left = 0, right = array.length, k = Math.floor((left + right) / 2)) {
    for (let i = left; i <= k; i++) {
      let minIndex = i;
      let minValue = array[i];
      for (let j = i + 1; j < right; j++) {
        if (!compare(minValue, array[j])) {
          minIndex = j;
          minValue = array[j];
          swap(array, i, minIndex);
        }
      }
    }
  }

  // Create a bounding volume hierarchy of scene geometry

  const size = new THREE$1.Vector3;

  function maximumExtent(box3) {
    box3.getSize(size);
    if (size.x > size.z) {
      return size.x > size.y ? 'x' : 'y';
    } else {
      return size.z > size.y ? 'z' : 'y';
    }
  }

  function boxOffset(box3, dim, v) {
    let offset = v[dim] - box3.min[dim];

    if (box3.max[dim] > box3.min[dim]){
      offset /= box3.max[dim] - box3.min[dim];
    }

    return offset;
  }

  function surfaceArea(box3) {
    box3.getSize(size);
    return 2 * (size.x * size.z + size.x * size.y + size.z * size.y);
  }

  function makePrimitiveInfo(geometry, materialIndices) {
    const primitiveInfo = [];
    const indices = geometry.getIndex().array;
    const position = geometry.getAttribute('position');
    const v0 = new THREE$1.Vector3();
    const v1 = new THREE$1.Vector3();
    const v2 = new THREE$1.Vector3();
    const e0 = new THREE$1.Vector3();
    const e1 = new THREE$1.Vector3();

    for (let i = 0; i < indices.length; i += 3) {
      const bounds = new THREE$1.Box3();

      v0.fromBufferAttribute(position, indices[i]);
      v1.fromBufferAttribute(position, indices[i + 1]);
      v2.fromBufferAttribute(position, indices[i + 2]);
      e0.subVectors(v2, v0);
      e1.subVectors(v1, v0);

      bounds.expandByPoint(v0);
      bounds.expandByPoint(v1);
      bounds.expandByPoint(v2);

      const info = {
        bounds: bounds,
        center: bounds.getCenter(new THREE$1.Vector3()),
        indices: [indices[i], indices[i + 1], indices[i + 2]],
        faceNormal: new THREE$1.Vector3().crossVectors(e1, e0).normalize(),
        materialIndex: materialIndices[i / 3]
      };

      primitiveInfo.push(info);
    }

    return primitiveInfo;
  }

  function makeLeafNode(primitives, bounds) {
    return {
      primitives,
      bounds
    };
  }

  function makeInteriorNode(splitAxis, child0, child1) {
    return {
      child0,
      child1,
      bounds: new THREE$1.Box3().union(child0.bounds).union(child1.bounds),
      splitAxis,
    };
  }

  function recursiveBuild(primitiveInfo, start, end) {
    const bounds = new THREE$1.Box3();
    for (let i = start; i < end; i++) {
      bounds.union(primitiveInfo[i].bounds);
    }

    const nPrimitives = end - start;

    if (nPrimitives === 1) {
      return makeLeafNode(primitiveInfo.slice(start, end), bounds);
    } else {
      const centroidBounds = new THREE$1.Box3();
      for (let i = start; i < end; i++) {
        centroidBounds.expandByPoint(primitiveInfo[i].center);
      }
      const dim = maximumExtent(centroidBounds);

      let mid = Math.floor((start + end) / 2);

      // middle split method
      // const dimMid = (centroidBounds.max[dim] + centroidBounds.min[dim]) / 2;
      // mid = partition(primitiveInfo, p => p.center[dim] < dimMid, start, end);

      // if (mid === start || mid === end) {
      //   mid = Math.floor((start + end) / 2);
      //   nthElement(primitiveInfo, (a, b) => a.center[dim] < b.center[dim], start, end, mid);
      // }

      // surface area heuristic method
      if (nPrimitives <= 4) {
        nthElement(primitiveInfo, (a, b) => a.center[dim] < b.center[dim], start, end, mid);
      } else {
        const buckets = [];
        for (let i = 0; i < 12; i++) {
          buckets.push({
            bounds: new THREE$1.Box3(),
            count: 0,
          });
        }

        for (let i = start; i < end; i++) {
          let b = Math.floor(buckets.length * boxOffset(centroidBounds, dim, primitiveInfo[i].center));
          if (b === buckets.length) {
            b = buckets.length - 1;
          }
          buckets[b].count++;
          buckets[b].bounds.union(primitiveInfo[i].bounds);
        }

        const cost = [];

        for (let i = 0; i < buckets.length - 1; i++) {
          const b0 = new THREE$1.Box3();
          const b1 = new THREE$1.Box3();
          let count0 = 0;
          let count1 = 0;
          for (let j = 0; j <= i; j++) {
            b0.union(buckets[j].bounds);
            count0 += buckets[j].count;
          }
          for (let j = i + 1; j < buckets.length; j++) {
            b1.union(buckets[j].bounds);
            count1 += buckets[j].count;
          }
          cost.push(0.1 + (count0 * surfaceArea(b0) + count1 * surfaceArea(b1)) / surfaceArea(bounds));
        }

        let minCost = cost[0];
        let minCostSplitBucket = 0;
        for (let i = 1; i < cost.length; i++) {
          if (cost[i] < minCost) {
            minCost = cost[i];
            minCostSplitBucket = i;
          }
        }

        mid = partition(primitiveInfo, p => {
          let b = Math.floor(buckets.length * boxOffset(centroidBounds, dim, p.center));
          if (b === buckets.length) {
            b = buckets.length - 1;
          }
          return b <= minCostSplitBucket;
        }, start, end);
      }

      return makeInteriorNode(
        dim,
        recursiveBuild(primitiveInfo, start, mid),
        recursiveBuild(primitiveInfo, mid, end),
      );
    }
  }

  function bvhAccel(geometry, materialIndices) {
    const primitiveInfo = makePrimitiveInfo(geometry, materialIndices);
    const node = recursiveBuild(primitiveInfo, 0, primitiveInfo.length);

    return node;
  }

  function flattenBvh(bvh) {
    const flat = [];
    const isBounds = [];

    const splitAxisMap = {
      x: 0,
      y: 1,
      z: 2
    };

    let maxDepth = 1;
    const traverse = (node, depth = 1) => {

      maxDepth = Math.max(depth, maxDepth);

      if (node.primitives) {
        for (let i = 0; i < node.primitives.length; i++) {
          const p = node.primitives[i];
          flat.push(
            p.indices[0], p.indices[1], p.indices[2], node.primitives.length,
            p.faceNormal.x, p.faceNormal.y, p.faceNormal.z, p.materialIndex
          );
          isBounds.push(false);
        }
      } else {
        const bounds = node.bounds;

        flat.push(
          bounds.min.x, bounds.min.y, bounds.min.z, splitAxisMap[node.splitAxis],
          bounds.max.x, bounds.max.y, bounds.max.z, null // pointer to second shild
        );

        const i = flat.length - 1;
        isBounds.push(true);

        traverse(node.child0, depth + 1);
        flat[i] = flat.length / 4; // pointer to second child
        traverse(node.child1, depth + 1);
      }
    };

    traverse(bvh);

    const buffer = new ArrayBuffer(4 * flat.length);
    const floatView = new Float32Array(buffer);
    const intView = new Int32Array(buffer);

    for (let i = 0; i < isBounds.length; i++) {
      let k = 8 * i;

      if (isBounds[i]) {
        floatView[k] = flat[k];
        floatView[k + 1] = flat[k + 1];
        floatView[k + 2] = flat[k + 2];
        intView[k + 3] = flat[k + 3];
      } else {
        intView[k] = flat[k];
        intView[k + 1] = flat[k + 1];
        intView[k + 2] = flat[k + 2];
        intView[k + 3] = -flat[k + 3]; // negative signals to shader that this node is a triangle
      }

      floatView[k + 4] = flat[k + 4];
      floatView[k + 5] = flat[k + 5];
      floatView[k + 6] = flat[k + 6];
      intView[k + 7] = flat[k + 7];
    }

    return {
      maxDepth,
      count: flat.length / 4,
      buffer: floatView
    };
  }

  // Create a piecewise 2D cumulative distribution function of light intensity from an envmap
  // http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#Piecewise-Constant2DDistributions

  function makeTextureArray(width, height, channels) {
    const array = new Float32Array(channels * width * height);

    return {
      set(x, y, channel, val) {
        array[channels * (y * width + x) + channel] = val;
      },
      get(x, y, channel) {
        return array[channels * (y * width + x) + channel];
      },
      width,
      height,
      channels,
      array
    };
  }

  function envmapDistribution(image) {
    const data = image.data;

    const cdfImage = {
      width: image.width + 2,
      height: image.height + 1
    };

    const cdf = makeTextureArray(cdfImage.width, cdfImage.height, 2);

    for (let y = 0; y < image.height; y++) {
      const sinTheta = Math.sin(Math.PI * (y + 0.5) / image.height);
      for (let x = 0; x < image.width; x++) {
        const i = 3 * (y * image.width + x);
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        let luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        luminance *= sinTheta;
        cdf.set(x + 2, y, 0, cdf.get(x + 1, y, 0) + luminance / image.width);
        cdf.set(x + 1, y, 1, luminance);
      }

      const rowIntegral = cdf.get(cdfImage.width - 1, y, 0);

      for (let x = 1; x < cdf.width; x++) {
        cdf.set(x, y, 0, cdf.get(x, y, 0) / rowIntegral);
        cdf.set(x, y, 1, cdf.get(x, y, 1) / rowIntegral);
      }

      cdf.set(0, y + 1, 0, cdf.get(0, y, 0) + rowIntegral / image.height);
      cdf.set(0, y, 1, rowIntegral);
    }

    const integral = cdf.get(0, cdf.height - 1, 0);

    for (let y = 0; y < cdf.height; y++) {
      cdf.set(0, y, 0, cdf.get(0, y, 0) / integral);
      cdf.set(0, y, 1, cdf.get(0, y, 1) / integral);
    }
    cdfImage.data = cdf.array;

    return cdfImage;
  }

  // Convert image data from the RGBE format to a 32-bit floating point format
  // See https://www.cg.tuwien.ac.at/research/theses/matkovic/node84.html for a description of the RGBE format
  function rgbeToFloat(buffer) {
    const texels = buffer.length / 4;
    const floatBuffer = new Float32Array(texels * 3);

    for (let i = 0; i < texels; i++) {
      const r = buffer[4 * i];
      const g = buffer[4 * i + 1];
      const b = buffer[4 * i + 2];
      const a = buffer[4 * i + 3];
      const e = 2 ** (a - 128);
      floatBuffer[3 * i] = r * e / 255;
      floatBuffer[3 * i + 1] = g * e / 255;
      floatBuffer[3 * i + 2] = b * e / 255;
    }

    return floatBuffer;
  }

  function clamp(x, min, max) {
    return Math.min(Math.max(x, min), max);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const x = arr[i];
      arr[i] = arr[j];
      arr[j] = x;
    }
    return arr;
  }

  function numberArraysEqual(a, b, eps = 1e-4) {
    for (let i = 0; i < a.length; i++) {
      if (Math.abs(a[i] - b[i]) > eps) {
        return false;
      }
    }

    return true;
  }

  // Tools for generating and modify env maps for lighting from scene component data
  function generateEnvMapFromSceneComponents(background, directionalLights){
    let envImage;
    if(background && background.encoding === THREE.LinearEncoding) {
      // background is an HDR image
      const image = background.image;
      envImage = {
        width: image.width,
        height: image.height,
        data: image.data
      };
      envImage.data = rgbeToFloat(envImage.data);
      directionalLights.forEach( light => { envImage.data = addDirectionalLightToEnvMap(light, envImage); });
    } else {
      // background is a single color
      let color = background;

      if (!(color instanceof THREE.Color)) {
        if (color) {
          // color is defined and set to something other than THREE.Color
          console.warn('scene.background should be an HDR image or a THREE.Color');
        }

        color = new THREE.Color(0xffffff);
      }

      envImage = {
        width: 1,
        height: 1,
        data: new Float32Array(color.toArray())
      };
    }
    return envImage;
  }

  function addDirectionalLightToEnvMap(light, image) {
    const sphericalCoords = new THREE$1.Spherical();
    const lightDirection = light.position.clone().sub(light.target.position);
    sphericalCoords.setFromVector3(lightDirection);
    sphericalCoords.theta = (Math.PI / 2) - sphericalCoords.theta;
    sphericalCoords.makeSafe();
    return addLightAtCoordinates(light, image, sphericalCoords);
  }

  // Perform modifications on env map to match input scene
  function addLightAtCoordinates(light, image, originSphericalCoords) {
    const floatBuffer = image.data;
    const width = image.width;
    const height = image.height;

    const texels = floatBuffer.length / 3;
    const xTexels = (floatBuffer.length / (3 * height));
    const yTexels = (floatBuffer.length / (3 * width));
    // default softness for standard directional lights is 0.95
    const softness = ("softness" in light && light.softness !== null) ? light.softness : 0.45;
    for (let i = 0; i < xTexels; i++) {
      for (let j = 0; j < yTexels; j++) {
        const bufferIndex = j * width + i;
        const currentSphericalCoords = equirectangularToSpherical(i, j, width, height);
        const falloff = getIntensityFromAngleDifferential(originSphericalCoords, currentSphericalCoords, softness);
        const intensity = light.intensity * falloff;

        floatBuffer[bufferIndex * 3] += intensity * light.color.r;
        floatBuffer[bufferIndex * 3 + 1] += intensity * light.color.g;
        floatBuffer[bufferIndex * 3 + 2] += intensity * light.color.b;
      }
    }
    return floatBuffer;
  }

  function getIntensityFromAngleDifferential(originCoords, currentCoords, softness) {
    const angle = angleBetweenSphericals(originCoords, currentCoords);
    const falloffCoeficient = getFalloffAtAngle(angle, softness);
    return falloffCoeficient;
  }

  function angleBetweenSphericals(originCoords, currentCoords) {
    const originVector = new THREE.Vector3();
    originVector.setFromSpherical(originCoords);
    const currentVector = new THREE.Vector3();
    currentVector.setFromSpherical(currentCoords);
    return originVector.angleTo(currentVector);
  }

  function getFalloffAtAngle(angle, softness) {
    const softnessCoeficient = Math.pow(2, 14.5 * Math.max(0.001, (1.0 - clamp(softness, 0.0, 1.0))));
    const falloff = Math.pow(softnessCoeficient, 1.1) * Math.pow(8, softnessCoeficient * -1 * (Math.pow(angle, 1.8)));
    return falloff;
  }

  function equirectangularToSpherical(x, y, width, height) {
    const TWOPI = 2.0 * Math.PI;
    const theta = (TWOPI * x) / width;
    const phi = (Math.PI * y) / height;
    const sphericalCoords = new THREE$1.Spherical(1.0, phi, theta);
    return sphericalCoords;
  }

  // Stratified Sampling

  function makeStratifiedRandom(strataCount, dimensions) {
    const samples = [];
    const l = strataCount ** dimensions;
    for (let i = 0; i < l; i++) {
      samples[i] = i;
    }

    let index = samples.length;

    const randomNums = [];

    function reset() {
      index = 0;
      shuffle(samples);
    }

    function next() {
      if (index >= samples.length) {
        reset();
      }
      let sample = samples[index++];

      for (let i = 0; i < dimensions; i++) {
        randomNums[i] = (sample % strataCount) / strataCount;
        sample = Math.floor(sample / strataCount);
      }

      return randomNums;
    }

    return Object.freeze({
      reset,
      next,
      strataCount
    });
  }

  // Stratified Sampling

  function makeStratifiedRandomCombined(strataCount, listOfDimensions) {
    const strataObjs = [];
    for (const dim of listOfDimensions) {
      strataObjs.push(makeStratifiedRandom(strataCount, dim));
    }

    const randomNums = [];

    function reset() {
      for (const strata of strataObjs) {
        strata.reset();
      }
    }

    function next() {
      let i = 0;

      for (const strata of strataObjs) {
        const nums = strata.next();

        for (const num of nums) {
          randomNums[i++] = num;
        }
      }

      return randomNums;
    }

    return Object.freeze({
      next,
      reset,
      strataCount
    });
  }

  function texturesFromMaterials(materials, textureName, textures) {
    const indices = [];

    for (const material of materials) {
      if (!material[textureName]) {
        indices.push(-1);
      } else {
        let index = textures.length;
        for (let i = 0; i < textures.length; i++) {
          if (textures[i] === material[textureName]) {
            // Reuse existing duplicate texture.
            index = i;
            break;
          }
        }
        if (index === textures.length) {
          // New texture. Add texture to list.
          textures.push(material[textureName]);
        }
        indices.push(index);
      }
    }

    return indices;
  }

  // retrieve textures used by meshes, grouping textures from meshes shared by *the same* mesh property
  function getTexturesFromMaterials(meshes, textureNames) {
    const textureMap = {};

    for (const name of textureNames) {
      const textures = [];
      textureMap[name] = {
        indices: texturesFromMaterials(meshes, name, textures),
        textures
      };
    }

    return textureMap;
  }

  // retrieve textures used by meshes, grouping textures from meshes shared *across all* mesh properties
  function mergeTexturesFromMaterials(meshes, textureNames) {
    const textureMap = {
      textures: [],
      indices: {}
    };

    for (const name of textureNames) {
      textureMap.indices[name] = texturesFromMaterials(meshes, name, textureMap.textures);
    }

    return textureMap;
  }

  function makeTexture(gl, params) {
    let {
      wrapS = gl.REPEAT,
      wrapT = gl.REPEAT,
      minFilter = gl.LINEAR,
      magFilter = gl.LINEAR,
      gammaCorrection = false,
      width = null,
      height = null,
      channels = null,
      storage = null,
      data = null
    } = params;

    width = width || data.width || 0;
    height = height || data.height || 0;

    const texture = gl.createTexture();

    let target;
    let dataArray;

    // if data is a JS array but not a TypedArray, assume data is an array of TypedArrays and create a GL Array Texture
    if (Array.isArray(data)) {
      dataArray = data;
      data = dataArray[0];
      target = gl.TEXTURE_2D_ARRAY;
    } else {
      target = gl.TEXTURE_2D;
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(target, texture);

    gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT);
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter);

    if (!channels) {
      channels = data.length / (width * height) || 4; // infer number of channels from data size
    }

    channels = clamp(channels, 1, 4);

    const format = [
      gl.R,
      gl.RG,
      gl.RGB,
      gl.RGBA
    ][channels - 1];

    const isByteArray =
      storage === 'byte' ||
      data instanceof Uint8Array ||
      data instanceof HTMLImageElement ||
      data instanceof HTMLCanvasElement ||
      data instanceof ImageData;

    const isFloatArray =
      storage === 'float' ||
      data instanceof Float32Array;

    let type;
    let internalFormat;
    if (isByteArray) {
      type = gl.UNSIGNED_BYTE;
      internalFormat = [
        gl.R8,
        gl.RG8,
        gammaCorrection ? gl.SRGB8 : gl.RGB8,
        gammaCorrection ? gl.SRGB8_ALPHA8 : gl.RGBA8
      ][channels - 1];
    } else if (isFloatArray) {
      type = gl.FLOAT;
      internalFormat = [
        gl.R32F,
        gl.RG32F,
        gl.RGB32F,
        gl.RGBA32F
      ][channels - 1];
    } else {
      console.error('Texture of unknown type:', data);
    }

    if (dataArray) {
      gl.texStorage3D(target, 1, internalFormat, width, height, dataArray.length);
      for (let i = 0; i < dataArray.length; i++) {
        // if layer is an HTMLImageElement, use the .width and .height properties of each layer
        // otherwise use the max size of the array texture
        const layerWidth = dataArray[i].width || width;
        const layerHeight = dataArray[i].height || height;
        gl.texSubImage3D(target, 0, 0, 0, i, layerWidth, layerHeight, 1, format, type, dataArray[i]);
      }
    } else {
      gl.texImage2D(target, 0, internalFormat, width, height, 0, format, type, data);
    }

    return Object.freeze({
      target,
      texture
    });
  }

  function interleave(...arrays) {
    const maxLength = arrays.reduce((m, a) => {
      return Math.max(m, a.data.length / a.channels);
    }, 0);

    const interleaved = [];
    for (let i = 0; i < maxLength; i++) {
      for (let j = 0; j < arrays.length; j++) {
        const { data, channels } = arrays[j];
        for (let c = 0; c < channels; c++) {
          interleaved.push(data[i * channels + c]);
        }
      }
    }

    return interleaved;
  }

  function uploadBuffers(gl, program, bufferData) {
    const materialBuffer = makeUniformBuffer(gl, program, 'Materials');

    const {
      color = [],
      roughness = [],
      metalness = [],
      normalScale = [],
      type = [],
      diffuseMapIndex = [],
      diffuseMapSize = [],
      normalMapIndex = [],
      normalMapSize = [],
      roughnessMapIndex = [],
      metalnessMapIndex = [],
      pbrMapSize = [],
    } = bufferData;

    materialBuffer.set('Materials.colorAndMaterialType[0]', interleave(
      { data: [].concat(...color.map(d => d.toArray())), channels: 3 },
      { data: type, channels: 1}
    ));

    materialBuffer.set('Materials.roughnessMetalnessNormalScale[0]', interleave(
      { data: roughness, channels: 1 },
      { data: metalness, channels: 1 },
      { data: [].concat(...normalScale.map(d => d.toArray())), channels: 2 }
    ));

    materialBuffer.set('Materials.diffuseNormalRoughnessMetalnessMapIndex[0]', interleave(
      { data: diffuseMapIndex, channels: 1 },
      { data: normalMapIndex, channels: 1 },
      { data: roughnessMapIndex, channels: 1 },
      { data: metalnessMapIndex, channels: 1 }
    ));

    materialBuffer.set('Materials.diffuseNormalMapSize[0]', interleave(
      { data: diffuseMapSize, channels: 2 },
      { data: normalMapSize, channels: 2 }
    ));

    materialBuffer.set('Materials.pbrMapSize[0]', pbrMapSize);

    materialBuffer.bind(0);
  }

  function textureDimensionsFromArray(count) {
    const columnsLog = Math.round(Math.log2(Math.sqrt(count)));
    const columns = 2 ** columnsLog;
    const rows = Math.ceil(count / columns);
    return {
      columnsLog,
      columns,
      rows,
      size: rows * columns,
    };
  }

  function maxImageSize(images) {
    const maxSize = {
      width: 0,
      height: 0
    };

    for (const image of images) {
      maxSize.width = Math.max(maxSize.width, image.width);
      maxSize.height = Math.max(maxSize.height, image.height);
    }

    const relativeSizes = [];
    for (const image of images) {
      relativeSizes.push(image.width / maxSize.width);
      relativeSizes.push(image.height / maxSize.height);
    }

    return { maxSize, relativeSizes };
  }

  // expand array to the given length
  function padArray(typedArray, length) {
    const newArray = new typedArray.constructor(length);
    newArray.set(typedArray);
    return newArray;
  }

  function decomposeScene(scene) {
    const meshes = [];
    const directionalLights = [];

    scene.traverse(child => {
      if (child instanceof THREE$1.Mesh) {
        if (!child.geometry || !child.geometry.getAttribute('position')) {
          console.log(child, 'must have a geometry property with a position attribute');
        }
        else if (!(child.material instanceof THREE$1.MeshStandardMaterial)) {
          console.log(child, 'must use MeshStandardMaterial in order to be rendered.');
        } else {
          meshes.push(child);
        }
      }
      if (child instanceof THREE$1.DirectionalLight) {
        directionalLights.push(child);
      }
    });

    return {
      meshes, directionalLights
    };
  }

  function makeRayTracingShader(gl, optionalExtensions, fullscreenQuad, textureAllocator, scene) {

    const { OES_texture_float_linear } = optionalExtensions;

    // Number of ray bounces per sample
    const bounces = 3;

    // Use stratified sampling for random variables to reduce clustering of samples thus improving rendering quality.
    // Each element of this array specifies how many dimensions belong to each set of stratified samples
    const strataDimensions = [];
    strataDimensions.push(2, 2); // anti-aliasing, depth-of-field
    for (let i = 0; i < bounces; i++) {
      // specular or diffuse reflection, light importance sampling, material importance sampling, next path direction
      strataDimensions.push(2, 2, 2, 2);
      if (i >= 1) {
        strataDimensions.push(1); // russian roulette sampling
      }
    }

    function initScene() {
      const { meshes, directionalLights } = decomposeScene(scene);
      if (meshes.length === 0) {
        throw 'RayTracingRenderer: Scene contains no renderable meshes.';
      }

      // merge meshes in scene to a single, static geometry
      const { geometry, materials, materialIndices } = mergeMeshesToGeometry(meshes);

      // extract textures shared by meshes in scene
      const maps = getTexturesFromMaterials(materials, ['map', 'normalMap']);
      const pbrMap = mergeTexturesFromMaterials(materials, ['roughnessMap', 'metalnessMap']);

      // create bounding volume hierarchy from a static scene
      const bvh = bvhAccel(geometry, materialIndices);
      const flattenedBvh = flattenBvh(bvh);
      const numTris = geometry.index.count / 3;

      // describes optimal dimensions used to pack 1-dimensional data into a 2-dimensional array
      const indexDim = textureDimensionsFromArray(numTris);
      const bvhDim = textureDimensionsFromArray(flattenedBvh.count);
      const vertexDim = textureDimensionsFromArray(geometry.attributes.position.count);

      const useGlass = materials.some(m => m.transparent);
      const useShadowCatcher = materials.some(m => m.shadowCatcher);

      const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragString({
        OES_texture_float_linear,
        bvhColumnsLog: bvhDim.columnsLog,
        indexColumnsLog: indexDim.columnsLog,
        vertexColumnsLog: vertexDim.columnsLog,
        maxBvhDepth: flattenedBvh.maxDepth,
        numTris: numTris,
        numMaterials: materials.length,
        numDiffuseMaps: maps.map.textures.length,
        numNormalMaps: maps.normalMap.textures.length,
        numPbrMaps: pbrMap.textures.length,
        bounces,
        useGlass,
        useShadowCatcher,
        strataDimensions: strataDimensions.reduce((a, b) => a + b)
      }));

      const program = createProgram(gl, fullscreenQuad.vertexShader, fragmentShader);
      gl.useProgram(program);

      const uniforms = getUniforms(gl, program);

      const bufferData = {};

      bufferData.color = materials.map(m => m.color);
      bufferData.roughness = materials.map(m => m.roughness);
      bufferData.metalness = materials.map(m => m.metalness);
      bufferData.normalScale = materials.map(m => m.normalScale);

      bufferData.type = materials.map(m => {
        if (m.shadowCatcher) {
          return ShadowCatcherMaterial;
        }
        if (m.transparent) {
          return m.solid ? ThickMaterial : ThinMaterial;
        }
      });

      if (maps.map.textures.length > 0) {
        const images = maps.map.textures.map(t => t.image);
        const { maxSize, relativeSizes } = maxImageSize(images);
        // create GL Array Texture from individual textures
        textureAllocator.bind(uniforms.diffuseMap, makeTexture(gl, {
          width: maxSize.width,
          height: maxSize.height,
          channels: 3,
          gammaCorrection: true,
          data: images
        }));
        bufferData.diffuseMapSize = relativeSizes;
        bufferData.diffuseMapIndex = maps.map.indices;
      }

      if (maps.normalMap.textures.length > 0) {
        const images = maps.normalMap.textures.map(t => t.image);
        const { maxSize, relativeSizes } = maxImageSize(images);
        // create GL Array Texture from individual textures
        textureAllocator.bind(uniforms.normalMap, makeTexture(gl, {
          width: maxSize.width,
          height: maxSize.height,
          channels: 3,
          data: images
        }));
        bufferData.normalMapSize = relativeSizes;
        bufferData.normalMapIndex = maps.normalMap.indices;
      }

      if (pbrMap.textures.length > 0) {
        const images = pbrMap.textures.map(t => t.image);
        const { maxSize, relativeSizes } = maxImageSize(images);
        // create GL Array Texture from individual textures
        textureAllocator.bind(uniforms.pbrMap, makeTexture(gl, {
          width: maxSize.width,
          height: maxSize.height,
          channels: 3,
          data: images
        }));
        bufferData.pbrMapSize = relativeSizes;
        bufferData.roughnessMapIndex = pbrMap.indices.roughnessMap;
        bufferData.metalnessMapIndex = pbrMap.indices.metalnessMap;
      }

      uploadBuffers(gl, program, bufferData);

      textureAllocator.bind(uniforms.positions,  makeTexture(gl, {
        data: padArray(geometry.getAttribute('position').array, 3 * vertexDim.size),
        minFilter: gl.NEAREST,
        magFilter: gl.NEAREST,
        width: vertexDim.columns,
        height: vertexDim.rows
      }));

      textureAllocator.bind(uniforms.normals,  makeTexture(gl, {
        data: padArray(geometry.getAttribute('normal').array, 3 * vertexDim.size),
        minFilter: gl.NEAREST,
        magFilter: gl.NEAREST,
        width: vertexDim.columns,
        height: vertexDim.rows
      }));

      textureAllocator.bind(uniforms.uvs,  makeTexture(gl, {
        data: padArray(geometry.getAttribute('uv').array, 2 * vertexDim.size),
        minFilter: gl.NEAREST,
        magFilter: gl.NEAREST,
        width: vertexDim.columns,
        height: vertexDim.rows
      }));

      textureAllocator.bind(uniforms.bvh, makeTexture(gl, {
        data: padArray(flattenedBvh.buffer, 4 * bvhDim.size),
        minFilter: gl.NEAREST,
        magFilter: gl.NEAREST,
        width: bvhDim.columns,
        height: bvhDim.rows,
      }));

      const background = scene.background;
      const envImage = generateEnvMapFromSceneComponents(background, directionalLights);

      textureAllocator.bind(uniforms.envmap, makeTexture(gl, {
        data: envImage.data,
        minFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
        magFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
        width: envImage.width,
        height: envImage.height,
      }));

      const distribution = envmapDistribution(envImage);
      textureAllocator.bind(uniforms.envmapDistribution, makeTexture(gl, {
        data: distribution.data,
        minFilter: gl.NEAREST,
        magFilter: gl.NEAREST,
        width: distribution.width,
        height: distribution.height,
      }));

      return {
        program,
        uniforms,
      };
    }

    const { program, uniforms } = initScene();

    let random = null;

    function setSize(width, height) {
      gl.useProgram(program);
      gl.uniform2f(uniforms.pixelSize, 1 / width, 1 / height);
    }

    function setCamera(camera) {
      gl.useProgram(program);
      gl.uniformMatrix4fv(uniforms['camera.transform'], false, camera.matrixWorld.elements);
      gl.uniform1f(uniforms['camera.aspect'], camera.aspect);
      gl.uniform1f(uniforms['camera.fov'], 0.5 / Math.tan(0.5 * Math.PI * camera.fov / 180));
      gl.uniform1f(uniforms['camera.focus'], camera.focus || 0);
      gl.uniform1f(uniforms['camera.aperture'], camera.aperture || 0);
    }

    function setStrataCount(count) {
      random = makeStratifiedRandomCombined(count, strataDimensions);
    }

    function updateSeed() {
      gl.useProgram(program);
      gl.uniform1f(uniforms.strataSize, 1.0 / random.strataCount);
      gl.uniform1fv(uniforms['strataStart[0]'], random.next());
      gl.uniform1f(uniforms.seed, Math.random());
    }

    function draw() {
      gl.useProgram(program);
      fullscreenQuad.draw();
    }

    return Object.freeze({
      setSize,
      setCamera,
      setStrataCount,
      updateSeed,
      draw
    });
  }

  function fragString$1(params) {
    return `#version 300 es

precision mediump float;
precision mediump int;

in vec2 vCoord;

out vec4 fragColor;

uniform sampler2D image;

${textureLinear(params)}

// Tonemapping functions from THREE.js

vec3 linear(vec3 color) {
  return color;
}
// https://www.cs.utah.edu/~reinhard/cdrom/
vec3 reinhard(vec3 color) {
  return clamp(color / (vec3(1.0 ) + color), vec3(0.0), vec3(1.0));
}
// http://filmicworlds.com/blog/filmic-tonemapping-operators/
#define uncharted2Helper(x) max(((x * (0.15 * x + 0.10 * 0.50) + 0.20 * 0.02) / (x * (0.15 * x + 0.50) + 0.20 * 0.30)) - 0.02 / 0.30, vec3(0.0))
const vec3 uncharted2WhitePoint = 1.0 / uncharted2Helper(vec3(${params.whitePoint}));
vec3 uncharted2( vec3 color ) {
  // John Hable's filmic operator from Uncharted 2 video game
  return clamp(uncharted2Helper(color) * uncharted2WhitePoint, vec3(0.0), vec3(1.0));
}
// http://filmicworlds.com/blog/filmic-tonemapping-operators/
vec3 cineon( vec3 color ) {
  // optimized filmic operator by Jim Hejl and Richard Burgess-Dawson
  color = max(vec3( 0.0 ), color - 0.004);
  return pow((color * (6.2 * color + 0.5)) / (color * (6.2 * color + 1.7) + 0.06), vec3(2.2));
}
// https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
vec3 acesFilmic( vec3 color ) {
  return clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), vec3(0.0), vec3(1.0));
}

void main() {
  vec4 tex = textureLinear(image, vCoord);

  vec3 light = tex.rgb / tex.a;
  // alpha channel stores the number of samples progressively rendered
  // divide the sum of light by alpha to obtain average contribution of light

  // in addition, alpha contains a scale factor for the shadow catcher material
  // dividing by alpha normalizes the brightness of the shadow catcher to match the background envmap.

  light *= ${params.exposure}; // exposure

  light = ${params.toneMapping}(light); // tone mapping

  light = pow(light, vec3(1.0 / 2.2)); // gamma correction

  fragColor = vec4(light, 1.0);
}

`;
  }

  const toneMapFunctions = {
    [THREE$1.LinearToneMapping]: 'linear',
    [THREE$1.ReinhardToneMapping]: 'reinhard',
    [THREE$1.Uncharted2ToneMapping]: 'uncharted2',
    [THREE$1.CineonToneMapping]: 'cineon',
    [THREE$1.ACESFilmicToneMapping]: 'acesFilmic'
  };

  function makeToneMapShader(gl, optionalExtensions, fullscreenQuad, textureAllocator, toneMapParams) {

    const { OES_texture_float_linear } = optionalExtensions;
    const { toneMapping, whitePoint, exposure } = toneMapParams;

    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragString$1({
      OES_texture_float_linear,
      toneMapping: toneMapFunctions[toneMapping] || 'linear',
      whitePoint: whitePoint.toExponential(), // toExponential allows integers to be represented as GLSL floats
      exposure: exposure.toExponential()
    }));
    const program = createProgram(gl, fullscreenQuad.vertexShader, fragmentShader);

    const uniforms = getUniforms(gl, program);
    const bindFramebuffer = textureAllocator.reserveSlot();

    function draw({ texture }) {
      gl.useProgram(program);

      bindFramebuffer(uniforms.image, texture);

      fullscreenQuad.draw();
    }

    return Object.freeze({
      draw
    });
  }

  function makeRenderTarget(gl, storage, linearFiltering) {
    const framebuffer = gl.createFramebuffer();
    let texture;
    let width = 0;
    let height = 0;

    function setSize(w, h) {
      width = Math.floor(w);
      height = Math.floor(h);
      texture = makeTexture(gl, {
        width,
        height,
        storage,
        minFilter: linearFiltering ? gl.LINEAR : gl.NEAREST,
        magFilter: linearFiltering ? gl.LINEAR : gl.NEAREST,
        channels: 4
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, texture.target, texture.texture, 0);
    }

    function bind() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    }

    function unbind() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function copyToScreen() {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      gl.blitFramebuffer(0, 0, width, height, 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    }

    return Object.freeze({
      setSize,
      bind,
      unbind,
      copyToScreen,
      get texture() {
        return texture;
      },
      get width() {
        return width;
      },
      get height() {
        return height;
      },
    });
  }

  function makeRenderTargetFloat(gl, linearFiltering) {
    return makeRenderTarget(gl, 'float', linearFiltering);
  }

  // TileRender is based on the concept of a compute shader's work group.

  // Sampling the scene with the RayTracingRenderer can be very slow (<1 fps).
  // This overworks the GPU and tends to lock up the OS, making it unresponsive.

  // To fix this, we can split the screen into smaller tiles, and sample the scene one tile at a time
  // The tile size is set such that each tile takes approximatly a constant amount of time to render.

  // Since the render time of a tile is dependent on the device, we find the desired tile dimensions by measuring
  // the time it takes to render an arbitrarily-set tile size and adjusting the size according to the benchmark.

  function pixelsPerTileEstimate(gl) {
    const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);

    if (maxRenderbufferSize <= 8192) {
      return 25000;
    } else if (maxRenderbufferSize === 16384 && maxViewportDims[0] <= 16384) {
      return 50000;
    } else if (maxRenderbufferSize === 16384 && maxViewportDims[0] >= 32768) {
      return 100000;
    } else if (maxRenderbufferSize >= 32768) {
      return 200000;
    } else {
      return 50000;
    }
  }

  function makeTileRender(gl) {
    let currentTile = -1;
    let numTiles = 1;
    let tileWidth;
    let tileHeight;
    let columns;
    let rows;

    let firstTileTime = 0;

    let width = 0;
    let height = 0;

    // initial number of pixels per rendered tile
    // based on correlation between system performance and max supported render buffer size
    // adjusted dynamically according to system performance
    let pixelsPerTile = pixelsPerTileEstimate(gl);

    let pixelsPerTileQuantized = pixelsPerTile;

    let desiredTimePerTile = 22; // 45 fps

    let timePerPixelSum = desiredTimePerTile / pixelsPerTile;
    let samples = 1;
    let resetSum = true;

    function addToTimePerPixel(t) {
      if (resetSum) {
        timePerPixelSum = 0;
        samples = 0;
        resetSum = false;
      }

      timePerPixelSum += t;
      samples++;
    }

    function getTimePerPixel() {
      return timePerPixelSum / samples;
    }

    function reset() {
      currentTile = -1;
      firstTileTime = 0;
      resetSum = true;
    }

    function setSize(w, h) {
      width = w;
      height = h;
      reset();
    }

    function setTileDimensions(pixelsPerTile) {
      const aspectRatio = width / height;

      // quantize the width of the tile so that it evenly divides the entire window
      tileWidth = Math.ceil(width / Math.round(width / Math.sqrt(pixelsPerTile * aspectRatio)));
      tileHeight = Math.ceil(tileWidth / aspectRatio);
      pixelsPerTileQuantized = tileWidth * tileHeight;

      columns = Math.ceil(width / tileWidth);
      rows = Math.ceil(height / tileHeight);
      numTiles = columns * rows;
    }

    function initTiles() {
      if (firstTileTime) {
        const timeElapsed = Date.now() - firstTileTime;
        const timePerTile = timeElapsed / numTiles;
        const error = desiredTimePerTile - timePerTile;

        // higher number means framerate converges to targetRenderTime faster
        // if set too high, the framerate fluctuates rapidly with small variations in frame-by-frame performance
        const convergenceStrength = 1000;

        pixelsPerTile = pixelsPerTile + convergenceStrength * error;
        addToTimePerPixel(timePerTile / pixelsPerTileQuantized);
      }

      firstTileTime = Date.now();

      pixelsPerTile = clamp(pixelsPerTile, 8192, width * height);

      setTileDimensions(pixelsPerTile);
    }

    function nextTile() {
      currentTile++;

      if (currentTile % numTiles === 0) {
        initTiles();
        currentTile = 0;
      }

      const x = currentTile % columns;
      const y = Math.floor(currentTile / columns) % rows;

      return {
        x: x * tileWidth,
        y: y * tileHeight,
        tileWidth,
        tileHeight,
        isFirstTile: currentTile === 0,
        isLastTile: currentTile === numTiles - 1
      };
    }

    return Object.freeze({
      setSize,
      reset,
      nextTile,
      getTimePerPixel,
      restartTimer() {
        firstTileTime = 0;
      },
      setRenderTime(time) {
        desiredTimePerTile = time;
      },
    });
  }

  function makeTextureAllocator(gl) {
    // texture unit 0 reserved for setting parameters on new textures
    let nextUnit = 1;

    function bindGl(uniform, { target, texture }, unit) {
      if (!uniform) {
        // uniform location does not exist
        return;
      }

      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(target, texture);
      gl.uniform1i(uniform, unit);
    }

    function bind(uniform, textureObj) {
      bindGl(uniform, textureObj, nextUnit++);
    }

    function reserveSlot() {
      const unit = nextUnit++;
      return (uniform, textureObj) => {
        bindGl(uniform, textureObj, unit);
      };
    }

    return Object.freeze({
      bind,
      reserveSlot
    });
  }

  function makeSceneSampler(gl, optionalExtensions, scene, toneMappingParams) {
    const fullscreenQuad = makeFullscreenQuad(gl);
    const textureAllocator = makeTextureAllocator(gl);
    const rayTracingShader = makeRayTracingShader(gl, optionalExtensions, fullscreenQuad, textureAllocator, scene);
    const toneMapShader = makeToneMapShader(gl, optionalExtensions, fullscreenQuad, textureAllocator, toneMappingParams);

    const useLinearFiltering = optionalExtensions.OES_texture_float_linear;

    const hdrBuffer = makeRenderTargetFloat(gl); // full resolution buffer representing the rendered scene with HDR lighting
    const hdrPreviewBuffer = makeRenderTargetFloat(gl, useLinearFiltering); // lower resolution buffer used for the first frame

    // used to sample only a portion of the scene to the HDR Buffer to prevent the GPU from locking up from excessive computation
    const tileRender = makeTileRender(gl);

    const lastCamera = new LensCamera();

    // how many samples to render with simple noise before switching to stratified noise
    const numSimpleSamples = 4;

    // how many partitions of stratified noise should be created
    const strataSize = 6;

    let sampleCount = 0;

    let sampleRenderedCallback = () => {};

    function clear() {
      hdrBuffer.bind();
      gl.clear(gl.COLOR_BUFFER_BIT);
      hdrBuffer.unbind();

      sampleCount = 0;
      tileRender.reset();
      rayTracingShader.setStrataCount(1);
      rayTracingShader.updateSeed();
    }

    function initFirstSample(camera) {
      lastCamera.copy(camera);
      rayTracingShader.setCamera(camera);
      clear();
    }

    function setPreviewBufferDimensions() {
      const aspectRatio = hdrBuffer.width / hdrBuffer.height;
      const desiredTimeForPreview = 16; // 60 fps
      const numPixelsForPreview = desiredTimeForPreview / tileRender.getTimePerPixel();
      const previewWidth = clamp(Math.sqrt(numPixelsForPreview * aspectRatio), 1, hdrBuffer.width);
      const previewHeight = clamp(previewWidth / aspectRatio, 1, hdrBuffer.height);
      if (previewWidth !== hdrPreviewBuffer.width) {
        hdrPreviewBuffer.setSize(previewWidth, previewHeight);
      }
    }

    function camerasEqual(cam1, cam2) {
      return numberArraysEqual(cam1.matrixWorld.elements, cam2.matrixWorld.elements) &&
        cam1.aspect === cam2.aspect &&
        cam1.fov === cam2.fov &&
        cam1.focus === cam2.focus &&
        cam1.aperture === cam2.aperture;
    }

    function addSampleToBuffer(buffer) {
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.enable(gl.BLEND);
      buffer.bind();
      gl.viewport(0, 0, buffer.width, buffer.height);
      rayTracingShader.draw();
      buffer.unbind();
      gl.disable(gl.BLEND);
    }

    function newSampleToBuffer(buffer) {
      buffer.bind();
      gl.viewport(0, 0, buffer.width, buffer.height);
      rayTracingShader.draw();
      buffer.unbind();
    }

    function renderPreview() {
      newSampleToBuffer(hdrPreviewBuffer);

      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      toneMapShader.draw({
        texture: hdrPreviewBuffer.texture,
      });
    }

    function renderTile(x, y, width, height) {
      gl.scissor(x, y, width, height);
      gl.enable(gl.SCISSOR_TEST);
      addSampleToBuffer(hdrBuffer);
      gl.disable(gl.SCISSOR_TEST);
    }

    function hdrBufferToScreen() {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      toneMapShader.draw({
        texture: hdrBuffer.texture,
      });
    }

    function drawTile(camera) {
      if (!camerasEqual(camera, lastCamera)) {
        initFirstSample(camera);
        setPreviewBufferDimensions();
        renderPreview();
      } else {
        const { x, y, tileWidth, tileHeight, isFirstTile, isLastTile } = tileRender.nextTile();

        if (isFirstTile) {
          sampleCount++;
          rayTracingShader.updateSeed();

          if (sampleCount === numSimpleSamples) {
            rayTracingShader.setStrataCount(strataSize);
          }
        }

        renderTile(x, y, tileWidth, tileHeight);

        if (isLastTile) {
          hdrBufferToScreen();
          sampleRenderedCallback(sampleCount);
        }
      }
    }

    function drawOffscreenTile(camera) {
      if (!camerasEqual(camera, lastCamera)) {
        initFirstSample(camera);
      }

      const { x, y, tileWidth, tileHeight, isFirstTile, isLastTile } = tileRender.nextTile();

      if (isFirstTile) {
        sampleCount++;
        rayTracingShader.updateSeed();


        if (sampleCount === numSimpleSamples) {
          rayTracingShader.setStrataCount(strataSize);
        }
      }

      renderTile(x, y, tileWidth, tileHeight);

      if (isLastTile) {
        sampleRenderedCallback(sampleCount);
      }
    }

    function drawFull(camera) {
      if (!camerasEqual(camera, lastCamera)) {
        initFirstSample(camera);
      }

      if (sampleCount === numSimpleSamples) {
        rayTracingShader.setStrataCount(strataSize);
      }

      sampleCount++;

      rayTracingShader.updateSeed();
      addSampleToBuffer(hdrBuffer);
      hdrBufferToScreen();
    }

    function setSize(width, height) {
      rayTracingShader.setSize(width, height);
      hdrBuffer.setSize(width, height);
      tileRender.setSize(width, height);
      clear();
    }

    return Object.freeze({
      drawTile,
      drawOffscreenTile,
      drawFull,
      restartTimer: tileRender.restartTimer,
      setRenderTime: tileRender.setRenderTime,
      setSize,
      hdrBufferToScreen,
      getTotalSamplesRendered() {
        return sampleCount;
      },
      set onSampleRendered(cb) {
        sampleRenderedCallback = cb;
      },
      get onSampleRendered() {
        return sampleRenderedCallback;
      }
    });
  }

  const glRequiredExtensions = [
    'EXT_color_buffer_float', // enables rendering to float buffers
  ];

  const glOptionalExtensions = [
    'OES_texture_float_linear', // enables gl.LINEAR texture filtering for float textures,
  ];

  function RayTracingRenderer(params = {}) {
    const canvas = params.canvas || document.createElement('canvas');

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: true
    });
    loadExtensions(gl, glRequiredExtensions);
    const optionalExtensions = loadExtensions(gl, glOptionalExtensions);

    // private properties
    let sceneSampler = null;
    const size = new THREE$1.Vector2();
    let renderTime = 22;
    let pixelRatio = 1;
    let lastFocus = false;

    const module = {
      domElement: canvas,
      needsUpdate: true,
      onSampleRendered: null,
      renderWhenOffFocus: true,
      renderToScreen: true,
      toneMappingExposure: 1,
      toneMappingWhitePoint: 1,
      toneMapping: THREE$1.LinearToneMapping,
    };

    function initScene(scene) {
      scene.updateMatrixWorld();

      const toneMappingParams = {
        exposure: module.toneMappingExposure,
        whitePoint: module.toneMappingWhitePoint,
        toneMapping: module.toneMapping
      };

      sceneSampler = makeSceneSampler(gl, optionalExtensions, scene, toneMappingParams);

      sceneSampler.onSampleRendered = (...args) => {
        if (module.onSampleRendered) {
          module.onSampleRendered(...args);
        }
      };

      module.setRenderTime(renderTime);
      module.setSize(size.width, size.height);
      module.needsUpdate = false;
    }

    function restartTimer() {
      if (sceneSampler) {
        sceneSampler.restartTimer();
      }
    }

    module.setSize = (width, height, updateStyle = true) => {
      size.set(width, height);
      canvas.width = size.width * pixelRatio;
      canvas.height = size.height * pixelRatio;

      if (updateStyle) {
        canvas.style.width = `${ size.width }px`;
        canvas.style.height = `${ size.height }px`;
      }

      if (sceneSampler) {
        sceneSampler.setSize(size.width * pixelRatio, size.height * pixelRatio);
      }
    };

    module.getSize = (target) => {
      if (!target) {
        target = new THREE$1.Vector2();
      }

      return target.copy(size);
    };

    module.setPixelRatio = (x) => {
      if (!x) {
        return;
      }
      pixelRatio = x;
      module.setSize(size.width, size.height, false);
    };

    module.getPixelRatio = () => pixelRatio;

    module.setRenderTime = (time) => {
      renderTime = time;
      if (sceneSampler) {
        sceneSampler.setRenderTime(time);
      }
    };

    module.getRenderTime = () => {
      return renderTime;
    };

    module.getTotalSamplesRendered = () => {
      if (sceneSampler) {
        return sceneSampler.getTotalSamplesRendered();
      }
    };

    module.sendToScreen = () => {
      if (sceneSampler) {
        sceneSampler.hdrBufferToScreen();
      }
    };

    module.render = (scene, camera) => {
      if (!module.renderWhenOffFocus) {
        const hasFocus = document.hasFocus();
        if (!hasFocus) {
          lastFocus = hasFocus;
          return;
        } else if (hasFocus && !lastFocus) {
          lastFocus = hasFocus;
          restartTimer();
        }
      }

      if (module.needsUpdate) {
        initScene(scene);
      }

      camera.updateMatrixWorld();

      if (module.renderToScreen) {
        sceneSampler.drawTile(camera);
      } else {
        sceneSampler.drawOffscreenTile(camera);
      }

      // sceneSampler.drawFull(camera);
    };

    // Assume module.render is called using requestAnimationFrame.
    // This means that when the user is on a different browser tab, module.render won't be called.
    // Since the timer should not measure time when module.render is inactive,
    // the timer should be reset when the user switches browser tabs
    document.addEventListener('visibilitychange', restartTimer);

    module.dispose = () => {
      document.removeEventListener('visibilitychange', restartTimer);
      sceneSampler = false;
    };

    return module;
  }

  RayTracingRenderer.isSupported = () => {
    const gl = document.createElement('canvas')
      .getContext('webgl2', {
        failIfMajorPerformanceCaveat: true
      });

    if (!gl) {
      return false;
    }

    const extensions = loadExtensions(gl, glRequiredExtensions);
    for (let e in extensions) {
      if (!extensions[e]) {
        return false;
      }
    }

    return true;
  };

  /* global THREE */
  if (THREE) {
    THREE.LensCamera = LensCamera;
    THREE.SoftDirectionalLight = SoftDirectionalLight;
    THREE.RayTracingMaterial = RayTracingMaterial;
    THREE.RayTracingRenderer = RayTracingRenderer;
    THREE.ThickMaterial = ThickMaterial;
    THREE.ThinMaterial = ThinMaterial;
  }

  exports.constants = constants;
  exports.LensCamera = LensCamera;
  exports.SoftDirectionalLight = SoftDirectionalLight;
  exports.RayTracingMaterial = RayTracingMaterial;
  exports.RayTracingRenderer = RayTracingRenderer;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
