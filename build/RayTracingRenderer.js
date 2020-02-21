(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('three')) :
  typeof define === 'function' && define.amd ? define(['exports', 'three'], factory) :
  (global = global || self, factory(global.RayTracingRenderer = {}, global.THREE));
}(this, function (exports, THREE$1) { 'use strict';

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
    constructor(color, intensity, softness = 0) {
      super(color, intensity);
      this.softness = softness;
    }

    copy(source) {
      super.copy(source);
      this.softness = source.softness;
    }
  }

  class EnvironmentLight extends THREE$1.Light {
    constructor(map, ...args) {
      super(...args);
      this.map = map;
      this.isEnvironmentLight = true;
    }

    copy(source) {
      super.copy(source);
      this.map = source.map;
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

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if (success) {
      return shader;
    }

    const output = source.split('\n').map((x, i) => `${i + 1}: ${x}`).join('\n');
    console.log(output);

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
      const { name, type } = gl.getActiveUniform(program, i);
      const location = gl.getUniformLocation(program, name);
      if (location) {
        uniforms[name] = {
          type, location
        };
      }
    }

    return uniforms;
  }

  function getAttributes(gl, program) {
    const attributes = {};

    const count = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < count; i++) {
      const { name } = gl.getActiveAttrib(program, i);
      if (name) {
        attributes[name] = gl.getAttribLocation(program, name);
      }
    }

    return attributes;
  }

  function decomposeScene(scene) {
    const meshes = [];
    const directionalLights = [];
    const ambientLights = [];
    const environmentLights = [];

    scene.traverse(child => {
      if (child.isMesh) {
        if (!child.geometry || !child.geometry.getAttribute('position')) {
          console.warn(child, 'must have a geometry property with a position attribute');
        }
        else if (!(child.material.isMeshStandardMaterial)) {
          console.warn(child, 'must use MeshStandardMaterial in order to be rendered.');
        } else {
          meshes.push(child);
        }
      }
      if (child.isDirectionalLight) {
        directionalLights.push(child);
      }
      if (child.isAmbientLight) {
        ambientLights.push(child);
      }
      if (child.isEnvironmentLight) {
        if (environmentLights.length > 1) {
          console.warn(environmentLights, 'only one environment light can be used per scene');
        }
        // Valid lights have HDR texture map in RGBEEncoding
        if (isHDRTexture(child)) {
          environmentLights.push(child);
        } else {
          console.warn(child, 'environment light does not use color value or map with THREE.RGBEEncoding');
        }
      }
    });

    const background = scene.background;

    return {
      background, meshes, directionalLights, ambientLights, environmentLights
    };
  }

  function isHDRTexture(texture) {
    return texture.map
      && texture.map.image
      && (texture.map.encoding === THREE$1.RGBEEncoding || texture.map.encoding === THREE$1.LinearEncoding);
  }

  function makeFramebuffer(gl, { color, depth }) {

    const framebuffer = gl.createFramebuffer();

    function bind() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    }

    function unbind() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function init() {
      bind();

      const drawBuffers = [];

      for (let location in color) {
        location = Number(location);

        if (location === undefined) {
          console.error('invalid location');
        }

        const tex = color[location];
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + location, tex.target, tex.texture, 0);
        drawBuffers.push(gl.COLOR_ATTACHMENT0 + location);
      }

      gl.drawBuffers(drawBuffers);

      if (depth) {
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, depth.target, depth.texture);
      }

      unbind();
    }

    init();

    return {
      color,
      bind,
      unbind
    };
  }

  var vertex = {
  source: `
  layout(location = 0) in vec2 a_position;

  out vec2 vCoord;

  void main() {
    vCoord = a_position;
    gl_Position = vec4(2. * a_position - 1., 0, 1);
  }
`
  };

  let typeMap;

  function makeUniformSetter(gl, program) {
    const uniformInfo = getUniforms(gl, program);
    const uniforms = {};
    const needsUpload = [];

    for (let name in uniformInfo) {
      const { type, location } = uniformInfo[name];

      const uniform = {
        type,
        location,
        v0: 0,
        v1: 0,
        v2: 0,
        v3: 0
      };

      uniforms[name] = uniform;
    }

    function setUniform(name, v0, v1, v2, v3) {
      // v0 - v4 are the values to be passed to the uniform
      // v0 can either be a number or an array, and v1-v3 are optional
      const uni = uniforms[name];

      if (!uni) {
        // if (!failedUnis.has(name)) {
        //   console.warn(`Uniform "${name}" does not exist in shader`);
        //   failedUnis.add(name);
        // }

        return;
      }

      uni.v0 = v0;
      uni.v1 = v1;
      uni.v2 = v2;
      uni.v3 = v3;
      needsUpload.push(uni);
    }

    typeMap = typeMap || initTypeMap(gl);

    function upload() {
      while (needsUpload.length > 0) {

        const { type, location, v0, v1, v2, v3 } = needsUpload.pop();
        const glMethod = typeMap[type];

        if (v0.length) {
          if (glMethod.matrix) {
            const array = v0;
            const transpose = v1 || false;
            gl[glMethod.matrix](location, transpose, array);
          } else {
            gl[glMethod.array](location, v0);
          }
        } else {
          gl[glMethod.values](location, v0, v1, v2, v3);
        }
      }
    }

    return {
      setUniform,
      upload,
    };
  }

  function initTypeMap(gl) {
    return {
      [gl.FLOAT]: glName(1, 'f'),
      [gl.FLOAT_VEC2]: glName(2, 'f'),
      [gl.FLOAT_VEC3]: glName(3, 'f'),
      [gl.FLOAT_VEC4]: glName(4, 'f'),
      [gl.INT]: glName(1, 'i'),
      [gl.INT_VEC2]: glName(2, 'i'),
      [gl.INT_VEC3]: glName(3, 'i'),
      [gl.INT_VEC4]: glName(4, 'i'),
      [gl.SAMPLER_2D]: glName(1, 'i'),
      [gl.SAMPLER_2D_ARRAY]: glName(1, 'i'),
      [gl.FLOAT_MAT2]: glNameMatrix(2, 2),
      [gl.FLOAT_MAT3]: glNameMatrix(3, 3),
      [gl.FLOAT_MAT4]: glNameMatrix(4, 4)
    };
  }

  function glName(numComponents, type) {
    return {
      values: `uniform${numComponents}${type}`,
      array: `uniform${numComponents}${type}v`
    };
  }

  function glNameMatrix(rows, columns) {
    return {
      matrix: rows === columns ?
        `uniformMatrix${rows}fv` :
        `uniformMatrix${rows}x${columns}fv`
    };
  }

  function makeRenderPass(gl, params) {
    const {
      defines,
      fragment,
      vertex,
    } = params;

    const vertexCompiled = vertex instanceof WebGLShader ? vertex : makeVertexShader(gl, params);

    const fragmentCompiled = fragment instanceof WebGLShader ? fragment : makeFragmentShader(gl, params);

    const program = createProgram(gl, vertexCompiled, fragmentCompiled);

    return {
      ...makeRenderPassFromProgram(gl, program),
      outputLocs: fragment.outputs ? getOutputLocations(fragment.outputs) : {}
    };
  }

  function makeVertexShader(gl, { defines, vertex }) {
    return makeShaderStage(gl, gl.VERTEX_SHADER, vertex, defines);
  }

  function makeFragmentShader(gl, { defines, fragment }) {
    return makeShaderStage(gl, gl.FRAGMENT_SHADER, fragment, defines);
  }

  function makeRenderPassFromProgram(gl, program) {

    const uniformSetter = makeUniformSetter(gl, program);

    const textures = {};

    let nextTexUnit = 1;

    function setTexture(name, texture) {
      if (!texture) {
        return;
      }

      if (!textures[name]) {
        const unit = nextTexUnit++;

        uniformSetter.setUniform(name, unit);

        textures[name] = {
          unit,
          tex: texture
        };
      } else {
        textures[name].tex = texture;
      }
    }

    function bindTextures() {
      for (let name in textures) {
        const { tex, unit } = textures[name];
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(tex.target, tex.texture);
      }
    }

    function useProgram(autoBindTextures = true) {
      gl.useProgram(program);
      uniformSetter.upload();
      if (autoBindTextures) {
        bindTextures();
      }
    }

    return {
      attribLocs: getAttributes(gl, program),
      bindTextures,
      program,
      setTexture,
      setUniform: uniformSetter.setUniform,
      textures,
      useProgram,
    };
  }

  function makeShaderStage(gl, type, shader, defines) {
    let str = '#version 300 es\nprecision mediump float;\nprecision mediump int;\n';

    if (defines) {
      str += addDefines(defines);
    }

    if (type === gl.FRAGMENT_SHADER && shader.outputs) {
      str += addOutputs(shader.outputs);
    }

    if (shader.includes) {
      str += addIncludes(shader.includes, defines);
    }

    if (typeof shader.source === 'function') {
      str += shader.source(defines);
    } else {
      str += shader.source;
    }

    return compileShader(gl, type, str);
  }

  function addDefines(defines) {
    let str = '';

    for (const name in defines) {
      const value = defines[name];

      // don't define falsy values such as false, 0, and ''.
      // this adds support for #ifdef on falsy values
      if (value) {
        str += `#define ${name} ${value}\n`;
      }
    }

    return str;
  }

  function addOutputs(outputs) {
    let str = '';

    const locations = getOutputLocations(outputs);

    for (let name in locations) {
      const location = locations[name];
      str += `layout(location = ${location}) out vec4 out_${name};\n`;
    }

    return str;
  }

  function addIncludes(includes, defines) {
    let str = '';

    for (let include of includes) {
      if (typeof include === 'function') {
        str += include(defines);
      } else {
        str += include;
      }
    }

    return str;
  }

  function getOutputLocations(outputs) {
    let locations = {};

    for (let i = 0; i < outputs.length; i++) {
      locations[outputs[i]] = i;
    }

    return locations;
  }

  function makeFullscreenQuad(gl) {
    const vao = gl.createVertexArray();

    gl.bindVertexArray(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);

    // vertex shader should set layout(location = 0) on position attribute
    const posLoc = 0;

    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);

    const vertexShader = makeVertexShader(gl, { vertex });

    function draw() {
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    return {
      draw,
      vertexShader
    };
  }

  var vertex$1 = {

  source: `
  in vec3 aPosition;
  in vec3 aNormal;
  in vec2 aUv;
  in ivec2 aMaterialMeshIndex;

  uniform mat4 projView;

  out vec3 vPosition;
  out vec3 vNormal;
  out vec2 vUv;
  flat out ivec2 vMaterialMeshIndex;

  void main() {
    vPosition = aPosition;
    vNormal = aNormal;
    vUv = aUv;
    vMaterialMeshIndex = aMaterialMeshIndex;
    gl_Position = projView * vec4(aPosition, 1);
  }
`
  };

  var constants$1 = `
  #define PI 3.14159265359
  #define TWOPI 6.28318530718
  #define INVPI 0.31830988618
  #define INVPI2 0.10132118364
  #define EPS 0.0005
  #define INF 1.0e999

  #define ROUGHNESS_MIN 0.03
`;

  var materialBuffer = `

uniform Materials {
  vec4 colorAndMaterialType[NUM_MATERIALS];
  vec4 roughnessMetalnessNormalScale[NUM_MATERIALS];

  #if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS) || defined(NUM_PBR_MAPS)
    ivec4 diffuseNormalRoughnessMetalnessMapIndex[NUM_MATERIALS];
  #endif

  #if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS)
    vec4 diffuseNormalMapSize[NUM_DIFFUSE_NORMAL_MAPS];
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
  return materials.colorAndMaterialType[materialIndex].w;
}

vec3 getMatColor(int materialIndex, vec2 uv) {
  vec3 color = materials.colorAndMaterialType[materialIndex].rgb;

  #ifdef NUM_DIFFUSE_MAPS
    int diffuseMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].x;
    if (diffuseMapIndex >= 0) {
      color *= texture(diffuseMap, vec3(uv * materials.diffuseNormalMapSize[diffuseMapIndex].xy, diffuseMapIndex)).rgb;
    }
  #endif

  return color;
}

float getMatRoughness(int materialIndex, vec2 uv) {
  float roughness = materials.roughnessMetalnessNormalScale[materialIndex].x;

  #ifdef NUM_PBR_MAPS
    int roughnessMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].z;
    if (roughnessMapIndex >= 0) {
      roughness *= texture(pbrMap, vec3(uv * materials.pbrMapSize[roughnessMapIndex].xy, roughnessMapIndex)).g;
    }
  #endif

  return roughness;
}

float getMatMetalness(int materialIndex, vec2 uv) {
  float metalness = materials.roughnessMetalnessNormalScale[materialIndex].y;

  #ifdef NUM_PBR_MAPS
    int metalnessMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].w;
    if (metalnessMapIndex >= 0) {
      metalness *= texture(pbrMap, vec3(uv * materials.pbrMapSize[metalnessMapIndex].xy, metalnessMapIndex)).b;
    }
  #endif

  return metalness;
}

#ifdef NUM_NORMAL_MAPS
vec3 getMatNormal(int materialIndex, vec2 uv, vec3 normal, vec3 dp1, vec3 dp2, vec2 duv1, vec2 duv2) {
  int normalMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].y;
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

    vec3 n = 2.0 * texture(normalMap, vec3(uv * materials.diffuseNormalMapSize[normalMapIndex].zw, normalMapIndex)).rgb - 1.0;
    n.xy *= materials.roughnessMetalnessNormalScale[materialIndex].zw;

    mat3 tbn = mat3(dpdu, dpdv, normal);

    return normalize(tbn * n);
  } else {
    return normal;
  }
}
#endif
`;

  var fragment = {

  outputs: ['position', 'normal', 'faceNormal', 'color', 'matProps'],
  includes: [
    constants$1,
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

  };

  function makeGBufferPass(gl, { materialBuffer, mergedMesh }) {
    const renderPass = makeRenderPass(gl, {
      defines: materialBuffer.defines,
      vertex: vertex$1,
      fragment
    });

    renderPass.setTexture('diffuseMap', materialBuffer.textures.diffuseMap);
    renderPass.setTexture('normalMap', materialBuffer.textures.normalMap);
    renderPass.setTexture('pbrMap', materialBuffer.textures.pbrMap);

    const geometry = mergedMesh.geometry;

    const elementCount = geometry.getIndex().count;

    const vao = gl.createVertexArray();

    gl.bindVertexArray(vao);
    uploadAttributes(gl, renderPass, geometry);
    gl.bindVertexArray(null);

    let jitterX = 0;
    let jitterY = 0;
    function setJitter(x, y) {
      jitterX = x;
      jitterY = y;
    }

    let currentCamera;
    function setCamera(camera) {
      currentCamera = camera;
    }

    function calcCamera() {
      projView.copy(currentCamera.projectionMatrix);

      projView.elements[8] += 2 * jitterX;
      projView.elements[9] += 2 * jitterY;

      projView.multiply(currentCamera.matrixWorldInverse);
      renderPass.setUniform('projView', projView.elements);
    }

    let projView = new THREE$1.Matrix4();

    function draw() {
      calcCamera();
      gl.bindVertexArray(vao);
      renderPass.useProgram();
      gl.enable(gl.DEPTH_TEST);
      gl.drawElements(gl.TRIANGLES, elementCount, gl.UNSIGNED_INT, 0);
      gl.disable(gl.DEPTH_TEST);
    }

    return {
      draw,
      outputLocs: renderPass.outputLocs,
      setCamera,
      setJitter
    };
  }

  function uploadAttributes(gl, renderPass, geometry) {
    setAttribute(gl, renderPass.attribLocs.aPosition, geometry.getAttribute('position'));
    setAttribute(gl, renderPass.attribLocs.aNormal, geometry.getAttribute('normal'));
    setAttribute(gl, renderPass.attribLocs.aUv, geometry.getAttribute('uv'));
    setAttribute(gl, renderPass.attribLocs.aMaterialMeshIndex, geometry.getAttribute('materialMeshIndex'));

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.getIndex().array, gl.STATIC_DRAW);
  }

  function setAttribute(gl, location, bufferAttribute) {
    if (location === undefined) {
      return;
    }

    const { itemSize, array } = bufferAttribute;

    gl.enableVertexAttribArray(location);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);

    if (array instanceof Float32Array) {
      gl.vertexAttribPointer(location, itemSize, gl.FLOAT, false, 0, 0);
    } else if (array instanceof Int32Array) {
      gl.vertexAttribIPointer(location, itemSize, gl.INT, 0, 0);
    } else {
      throw 'Unsupported buffer type';
    }
  }

  function makeUniformBuffer(gl, program, blockName) {
    const blockIndex = gl.getUniformBlockIndex(program, blockName);
    const blockSize = gl.getActiveUniformBlockParameter(program, blockIndex, gl.UNIFORM_BLOCK_DATA_SIZE);

    const uniforms = getUniformBlockInfo(gl, program, blockIndex);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
    gl.bufferData(gl.UNIFORM_BUFFER, blockSize, gl.STATIC_DRAW);

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
      gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data);
      gl.bindBufferBase(gl.UNIFORM_BUFFER, index, buffer);
    }

    return {
      set,
      bind
    };
  }

  function getUniformBlockInfo(gl, program, blockIndex) {
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

  function setData(dataView, setter, size, offset, stride, components, value) {
    const l = Math.min(value.length / components, size);
    for (let i = 0; i < l; i++) {
      for (let k = 0; k < components; k++) {
        dataView[setter](offset + i * stride + k * 4, value[components * i + k], true);
      }
    }
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

  function makeTexture(gl, params) {
    let {
      width = null,
      height = null,

      // A single HTMLImageElement, ImageData, or TypedArray,
      // Or an array of any of these objects. In this case an Array Texture will be created
      data = null,

      // If greater than 1, create an Array Texture of this length
      length = 1,

      // Number of channels, [1-4]. If left blank, the the function will decide the number of channels automatically from the data
      channels = null,

      // Either 'byte' or 'float'
      // If left empty, the function will decide the format automatically from the data
      storage = null,

      // Reverse the texture across the y-axis.
      flipY = false,

      // sampling properties
      gammaCorrection = false,
      wrapS = gl.CLAMP_TO_EDGE,
      wrapT = gl.CLAMP_TO_EDGE,
      minFilter = gl.NEAREST,
      magFilter = gl.NEAREST,
    } = params;

    width = width || data.width || 0;
    height = height || data.height || 0;

    const texture = gl.createTexture();

    let target;
    let dataArray;

    // if data is a JS array but not a TypedArray, assume data is an array of images and create a GL Array Texture
    if (Array.isArray(data)) {
      dataArray = data;
      data = dataArray[0];
    }

    target = dataArray || length > 1 ? gl.TEXTURE_2D_ARRAY : gl.TEXTURE_2D;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(target, texture);

    gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT);
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter);

    if (!channels) {
      if (data && data.length) {
        channels = data.length / (width * height); // infer number of channels from data size
      } else {
        channels = 4;
      }
    }

    channels = clamp(channels, 1, 4);

    const { type, format, internalFormat } = getTextureFormat(gl, channels, storage, data, gammaCorrection);

    if (dataArray) {
      gl.texStorage3D(target, 1, internalFormat, width, height, dataArray.length);
      for (let i = 0; i < dataArray.length; i++) {
        // if layer is an HTMLImageElement, use the .width and .height properties of each layer
        // otherwise use the max size of the array texture
        const layerWidth = dataArray[i].width || width;
        const layerHeight = dataArray[i].height || height;

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, Array.isArray(flipY) ? flipY[i] : flipY);

        gl.texSubImage3D(target, 0, 0, 0, i, layerWidth, layerHeight, 1, format, type, dataArray[i]);
      }
    } else if (length > 1) {
      // create empty array texture
      gl.texStorage3D(target, 1, internalFormat, width, height, length);
    } else {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
      gl.texStorage2D(target, 1, internalFormat, width, height);
      if (data) {
        gl.texSubImage2D(target, 0, 0, 0, width, height, format, type, data);
      }
    }

    // return state to default
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    return {
      target,
      texture
    };
  }

  function makeDepthTarget(gl, width, height) {
    const texture = gl.createRenderbuffer();
    const target = gl.RENDERBUFFER;

    gl.bindRenderbuffer(target, texture);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
    gl.bindRenderbuffer(target, null);

    return {
      target,
      texture
    };
  }

  function getTextureFormat(gl, channels, storage, data, gammaCorrection) {
    let type;
    let internalFormat;

    const isByteArray =
      data instanceof Uint8Array ||
      data instanceof HTMLImageElement ||
      data instanceof HTMLCanvasElement ||
      data instanceof ImageData;

    const isFloatArray = data instanceof Float32Array;

    if (storage === 'byte' || (!storage && isByteArray)) {
      internalFormat = {
        1: gl.R8,
        2: gl.RG8,
        3: gammaCorrection ? gl.SRGB8 : gl.RGB8,
        4: gammaCorrection ? gl.SRGB8_ALPHA8 : gl.RGBA8
      }[channels];

      type = gl.UNSIGNED_BYTE;
    } else if (storage === 'float' || (!storage && isFloatArray)) {
      internalFormat = {
        1: gl.R32F,
        2: gl.RG32F,
        3: gl.RGB32F,
        4: gl.RGBA32F
      }[channels];

      type = gl.FLOAT;
    } else if (storage === 'halfFloat') {
      internalFormat = {
        1: gl.R16F,
        2: gl.RG16F,
        3: gl.RGB16F,
        4: gl.RGBA16F
      }[channels];

      type = gl.FLOAT;
    } else if (storage === 'snorm') {
      internalFormat = {
        1: gl.R8_SNORM,
        2: gl.RG8_SNORM,
        3: gl.RGB8_SNORM,
        4: gl.RGBA8_SNORM,
      }[channels];

      type = gl.UNSIGNED_BYTE;
    }

    const format = {
      1: gl.RED,
      2: gl.RG,
      3: gl.RGB,
      4: gl.RGBA
    }[channels];

    return {
      format,
      internalFormat,
      type
    };
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

  function makeMaterialBuffer(gl, materials) {
    const maps = getTexturesFromMaterials(materials, ['map', 'normalMap']);
    const pbrMap = mergeTexturesFromMaterials(materials, ['roughnessMap', 'metalnessMap']);

    const textures = {};

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
      const { relativeSizes, texture } = makeTextureArray(gl, maps.map.textures, true);
      textures.diffuseMap = texture;
      bufferData.diffuseMapSize = relativeSizes;
      bufferData.diffuseMapIndex = maps.map.indices;
    }

    if (maps.normalMap.textures.length > 0) {
      const { relativeSizes, texture } = makeTextureArray(gl, maps.normalMap.textures, false);
      textures.normalMap = texture;
      bufferData.normalMapSize = relativeSizes;
      bufferData.normalMapIndex = maps.normalMap.indices;
    }

    if (pbrMap.textures.length > 0) {
      const { relativeSizes, texture } = makeTextureArray(gl, pbrMap.textures, false);
      textures.pbrMap = texture;
      bufferData.pbrMapSize = relativeSizes;
      bufferData.roughnessMapIndex = pbrMap.indices.roughnessMap;
      bufferData.metalnessMapIndex = pbrMap.indices.metalnessMap;
    }

    const defines = {
      NUM_MATERIALS: materials.length,
      NUM_DIFFUSE_MAPS: maps.map.textures.length,
      NUM_NORMAL_MAPS: maps.normalMap.textures.length,
      NUM_DIFFUSE_NORMAL_MAPS: Math.max(maps.map.textures.length, maps.normalMap.textures.length),
      NUM_PBR_MAPS: pbrMap.textures.length,
    };

    // create temporary shader program including the Material uniform buffer
    // used to query the compiled structure of the uniform buffer
    const renderPass = makeRenderPass(gl, {
      vertex: {
        source: `void main() {}`
      },
      fragment: {
        includes: [ materialBuffer ],
        source: `void main() {}`
      },
      defines
    });

    uploadToUniformBuffer(gl, renderPass.program, bufferData);

    return { defines, textures };
  }

  function makeTextureArray(gl, textures, gammaCorrection = false) {
    const images = textures.map(t => t.image);
    const flipY = textures.map(t => t.flipY);
    const { maxSize, relativeSizes } = maxImageSize(images);

    // create GL Array Texture from individual textures
    const texture = makeTexture(gl, {
      width: maxSize.width,
      height: maxSize.height,
      gammaCorrection,
      data: images,
      flipY,
      channels: 3,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
    });

    return {
     texture,
     relativeSizes
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


  // Upload arrays to uniform buffer objects
  // Packs different arrays into vec4's to take advantage of GLSL's std140 memory layout

  function uploadToUniformBuffer(gl, program, bufferData) {
    const materialBuffer = makeUniformBuffer(gl, program, 'Materials');

    materialBuffer.set('Materials.colorAndMaterialType[0]', interleave(
      { data: [].concat(...bufferData.color.map(d => d.toArray())), channels: 3 },
      { data: bufferData.type, channels: 1}
    ));

    materialBuffer.set('Materials.roughnessMetalnessNormalScale[0]', interleave(
      { data: bufferData.roughness, channels: 1 },
      { data: bufferData.metalness, channels: 1 },
      { data: [].concat(...bufferData.normalScale.map(d => d.toArray())), channels: 2 }
    ));

    materialBuffer.set('Materials.diffuseNormalRoughnessMetalnessMapIndex[0]', interleave(
      { data: bufferData.diffuseMapIndex, channels: 1 },
      { data: bufferData.normalMapIndex, channels: 1 },
      { data: bufferData.roughnessMapIndex, channels: 1 },
      { data: bufferData.metalnessMapIndex, channels: 1 }
    ));

    materialBuffer.set('Materials.diffuseNormalMapSize[0]', interleave(
      { data: bufferData.diffuseMapSize, channels: 2 },
      { data: bufferData.normalMapSize, channels: 2 }
    ));

    materialBuffer.set('Materials.pbrMapSize[0]', bufferData.pbrMapSize);

    materialBuffer.bind(0);
  }

  function interleave(...arrays) {
    let maxLength = 0;
    for (let i = 0; i < arrays.length; i++) {
      const a = arrays[i];
      const l = a.data ? a.data.length / a.channels : 0;
      maxLength = Math.max(maxLength, l);
    }

    const interleaved = [];
    for (let i = 0; i < maxLength; i++) {
      for (let j = 0; j < arrays.length; j++) {
        const { data = [], channels } = arrays[j];
        for (let c = 0; c < channels; c++) {
          interleaved.push(data[i * channels + c]);
        }
      }
    }

    return interleaved;
  }

  function mergeMeshesToGeometry(meshes) {

    let vertexCount = 0;
    let indexCount = 0;

    const geometryAndMaterialIndex = [];
    const materialIndexMap = new Map();

    for (const mesh of meshes) {
      const geometry = cloneBufferGeometry(mesh.geometry, ['position', 'normal', 'uv']);

      const index = geometry.getIndex();
      if (!index) {
        addFlatGeometryIndices(geometry);
      }

      geometry.applyMatrix(mesh.matrixWorld);

      if (!geometry.getAttribute('normal')) {
        geometry.computeVertexNormals();
      } else {
        geometry.normalizeNormals();
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

    const geometry = mergeGeometry(geometryAndMaterialIndex, vertexCount, indexCount);

    return {
      geometry,
      materials: Array.from(materialIndexMap.keys())
    };
  }

  function mergeGeometry(geometryAndMaterialIndex, vertexCount, indexCount) {
    const positionAttrib = new THREE$1.BufferAttribute(new Float32Array(3 * vertexCount), 3, false);
    const normalAttrib = new THREE$1.BufferAttribute(new Float32Array(3 * vertexCount), 3, false);
    const uvAttrib = new THREE$1.BufferAttribute(new Float32Array(2 * vertexCount), 2, false);
    const materialMeshIndexAttrib = new THREE$1.BufferAttribute(new Int32Array(2 * vertexCount), 2, false);
    const indexAttrib = new THREE$1.BufferAttribute(new Uint32Array(indexCount), 1, false);

    const mergedGeometry = new THREE$1.BufferGeometry();
    mergedGeometry.addAttribute('position', positionAttrib);
    mergedGeometry.addAttribute('normal', normalAttrib);
    mergedGeometry.addAttribute('uv', uvAttrib);
    mergedGeometry.addAttribute('materialMeshIndex', materialMeshIndexAttrib);
    mergedGeometry.setIndex(indexAttrib);

    let currentVertex = 0;
    let currentIndex = 0;
    let currentMesh = 1;

    for (const { geometry, materialIndex } of geometryAndMaterialIndex) {
      const vertexCount = geometry.getAttribute('position').count;
      mergedGeometry.merge(geometry, currentVertex);

      const meshIndex = geometry.getIndex();
      for (let i = 0; i < meshIndex.count; i++) {
        indexAttrib.setX(currentIndex + i, currentVertex + meshIndex.getX(i));
      }

      for (let i = 0; i < vertexCount; i++) {
        materialMeshIndexAttrib.setXY(currentVertex + i, materialIndex, currentMesh);
      }

      currentVertex += vertexCount;
      currentIndex += meshIndex.count;
      currentMesh++;
    }

    return mergedGeometry;
  }

  // Similar to buffergeometry.clone(), except we only copy
  // specific attributes instead of everything
  function cloneBufferGeometry(bufferGeometry, attributes) {
    const newGeometry = new THREE$1.BufferGeometry();

    for (const name of attributes) {
      const attrib = bufferGeometry.getAttribute(name);
      if (attrib) {
        newGeometry.addAttribute(name, attrib.clone());
      }
    }

    const index = bufferGeometry.getIndex();
    if (index) {
      newGeometry.setIndex(index);
    }

    return newGeometry;
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

  // Reorders the elements in the range [first, last) in such a way that
  // all elements for which the comparator c returns true
  // precede the elements for which comparator c returns false.
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

  // nth_element is a partial sorting algorithm that rearranges elements in [first, last) such that:
  // The element pointed at by nth is changed to whatever element would occur in that position if [first, last) were sorted.
  // All of the elements before this new nth element compare to true with elements after the nth element
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

  function swap(array, a, b) {
    const x = array[b];
    array[b] = array[a];
    array[a] = x;
  }

  // Create a bounding volume hierarchy of scene geometry

  const size = new THREE$1.Vector3();

  function bvhAccel(geometry) {
    const primitiveInfo = makePrimitiveInfo(geometry);
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

  function makePrimitiveInfo(geometry) {
    const primitiveInfo = [];
    const indices = geometry.getIndex().array;
    const position = geometry.getAttribute('position');
    const materialMeshIndex = geometry.getAttribute('materialMeshIndex');

    const v0 = new THREE$1.Vector3();
    const v1 = new THREE$1.Vector3();
    const v2 = new THREE$1.Vector3();
    const e0 = new THREE$1.Vector3();
    const e1 = new THREE$1.Vector3();

    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];

      const bounds = new THREE$1.Box3();

      v0.fromBufferAttribute(position, i0);
      v1.fromBufferAttribute(position, i1);
      v2.fromBufferAttribute(position, i2);
      e0.subVectors(v2, v0);
      e1.subVectors(v1, v0);

      bounds.expandByPoint(v0);
      bounds.expandByPoint(v1);
      bounds.expandByPoint(v2);

      const info = {
        bounds: bounds,
        center: bounds.getCenter(new THREE$1.Vector3()),
        indices: [i0, i1, i2],
        faceNormal: new THREE$1.Vector3().crossVectors(e1, e0).normalize(),
        materialIndex: materialMeshIndex.getX(i0)
      };

      primitiveInfo.push(info);
    }

    return primitiveInfo;
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

  // Convert image data from the RGBE format to a 32-bit floating point format
  // See https://www.cg.tuwien.ac.at/research/theses/matkovic/node84.html for a description of the RGBE format
  // Optional multiplier argument for performance optimization
  function rgbeToFloat(buffer, intensity = 1) {
    const texels = buffer.length / 4;
    const floatBuffer = new Float32Array(texels * 3);

    const expTable = [];
    for (let i = 0; i < 255; i++) {
      expTable[i] = intensity * Math.pow(2, i - 128) / 255;
    }

    for (let i = 0; i < texels; i++) {

      const r = buffer[4 * i];
      const g = buffer[4 * i + 1];
      const b = buffer[4 * i + 2];
      const a = buffer[4 * i + 3];
      const e = expTable[a];

      floatBuffer[3 * i] = r * e;
      floatBuffer[3 * i + 1] = g * e;
      floatBuffer[3 * i + 2] = b * e;
    }

    return floatBuffer;
  }

  // Convert image data from the RGBE format to a 32-bit floating point format

  const DEFAULT_MAP_RESOLUTION = {
    width: 2048,
    height: 1024,
  };

  // Tools for generating and modify env maps for lighting from scene component data

  function generateBackgroundMapFromSceneBackground(background) {
    let backgroundImage;

    if (background.isColor) {
      backgroundImage = generateSolidMap(1, 1, background);
    } else if (background.encoding === THREE$1.RGBEEncoding) {
        backgroundImage = {
          width: background.image.width,
          height: background.image.height,
          data: background.image.data,
        };
        backgroundImage.data = rgbeToFloat(backgroundImage.data);
    }
    return backgroundImage;
  }

  function generateEnvMapFromSceneComponents(directionalLights, ambientLights, environmentLights) {
    let envImage = initializeEnvMap(environmentLights);
    ambientLights.forEach( light => { addAmbientLightToEnvMap(light, envImage); });
    directionalLights.forEach( light => { envImage.data = addDirectionalLightToEnvMap(light, envImage); });

    return envImage;
  }

  function initializeEnvMap(environmentLights) {
    let envImage;

    // Initialize map from environment light if present
    if (environmentLights.length > 0) {
      // TODO: support multiple environment lights (what if they have different resolutions?)
      const environmentLight = environmentLights[0];
      envImage = {
        width: environmentLight.map.image.width,
        height: environmentLight.map.image.height,
        data: environmentLight.map.image.data,
      };
      envImage.data = rgbeToFloat(envImage.data, environmentLight.intensity);
    } else {
      // initialize blank map
      envImage = generateSolidMap(DEFAULT_MAP_RESOLUTION.width, DEFAULT_MAP_RESOLUTION.height);
    }

    return envImage;
  }

  function generateSolidMap(width, height, color, intensity) {
    const texels = width * height;
    const floatBuffer = new Float32Array(texels * 3);
    if (color && color.isColor) {
      setBufferToColor(floatBuffer, color, intensity);
    }
    return {
      width: width,
      height: height,
      data: floatBuffer,
    };
  }

  function setBufferToColor(buffer, color, intensity = 1) {
    buffer.forEach(function(part, index) {
      const component = index % 3;
      if (component === 0) {
        buffer[index] = color.r * intensity;
      }
      else if (component === 1) {
        buffer[index] = color.g * intensity;
      }
      else if (component === 2) {
        buffer[index] = color.b * intensity;
      }
    });
    return buffer;
  }

  function addAmbientLightToEnvMap(light, image) {
    const color = light.color;
    image.data.forEach(function(part, index) {
      const component = index % 3;
      if (component === 0) {
        image.data[index] += color.r * light.intensity;
      }
      else if (component === 1) {
        image.data[index] += color.g * light.intensity;
      }
      else if (component === 2) {
        image.data[index] += color.b * light.intensity;
      }
    });
  }

  function addDirectionalLightToEnvMap(light, image) {
    const sphericalCoords = new THREE$1.Spherical();
    const lightDirection = light.position.clone().sub(light.target.position);

    sphericalCoords.setFromVector3(lightDirection);
    sphericalCoords.theta = (Math.PI * 3 / 2) - sphericalCoords.theta;
    sphericalCoords.makeSafe();

    return addLightAtCoordinates(light, image, sphericalCoords);
  }

  // Perform modifications on env map to match input scene
  function addLightAtCoordinates(light, image, originCoords) {
    const floatBuffer = image.data;
    const width = image.width;
    const height = image.height;
    const xTexels = floatBuffer.length / (3 * height);
    const yTexels = floatBuffer.length / (3 * width);

    // default softness for standard directional lights is 0.01, i.e. a hard shadow
    const softness = light.softness || 0.01;

    // angle from center of light at which no more contributions are projected
    const threshold = findThreshold(softness);

    // if too few texels are rejected by the threshold then the time to evaluate it is no longer worth it
    const useThreshold = threshold < Math.PI / 5;

    // functional trick to keep the conditional check out of the main loop
    const intensityFromAngleFunction = useThreshold ? getIntensityFromAngleDifferentialThresholded : getIntensityFromAngleDifferential;

    let begunAddingContributions = false;
    let currentCoords = new THREE$1.Spherical();

    // Iterates over each row from top to bottom
    for (let i = 0; i < xTexels; i++) {

      let encounteredInThisRow = false;

      // Iterates over each texel in row
      for (let j = 0; j < yTexels; j++) {
        const bufferIndex = j * width + i;
        currentCoords = equirectangularToSpherical(i, j, width, height, currentCoords);
        const falloff = intensityFromAngleFunction(originCoords, currentCoords, softness, threshold);

        if(falloff > 0) {
          encounteredInThisRow = true;
          begunAddingContributions = true;
        }

        const intensity = light.intensity * falloff;

        floatBuffer[bufferIndex * 3] += intensity * light.color.r;
        floatBuffer[bufferIndex * 3 + 1] += intensity * light.color.g;
        floatBuffer[bufferIndex * 3 + 2] += intensity * light.color.b;
      }

      // First row to not add a contribution since adding began
      // This means the entire light has been added and we can exit early
      if(!encounteredInThisRow && begunAddingContributions) {
        return floatBuffer;
      }
    }

    return floatBuffer;
  }

  function findThreshold(softness) {
    const step = Math.PI / 128;
    const maxSteps = (2.0 * Math.PI) / step;

    for (let i = 0; i < maxSteps; i++) {
      const angle = i * step;
      const falloff = getFalloffAtAngle(angle, softness);
      if (falloff <= 0.0001) {
        return angle;
      }
    }
  }

  function getIntensityFromAngleDifferentialThresholded(originCoords, currentCoords, softness, threshold) {
    const deltaPhi = getAngleDelta(originCoords.phi, currentCoords.phi);
    const deltaTheta =  getAngleDelta(originCoords.theta, currentCoords.theta);

    if(deltaTheta > threshold && deltaPhi > threshold) {
      return 0;
    }

    const angle = angleBetweenSphericals(originCoords, currentCoords);
    return getFalloffAtAngle(angle, softness);
  }

  function getIntensityFromAngleDifferential(originCoords, currentCoords, softness) {
    const angle = angleBetweenSphericals(originCoords, currentCoords);
    return getFalloffAtAngle(angle, softness);
  }

  function getAngleDelta(angleA, angleB) {
    const diff = Math.abs(angleA - angleB) % (2 * Math.PI);
    return diff > Math.PI ? (2 * Math.PI - diff) : diff;
  }

  const angleBetweenSphericals = function() {
    const originVector = new THREE$1.Vector3();
    const currentVector = new THREE$1.Vector3();

    return (originCoords, currentCoords) => {
      originVector.setFromSpherical(originCoords);
      currentVector.setFromSpherical(currentCoords);
      return originVector.angleTo(currentVector);
    };
  }();

    // TODO: possibly clean this up and optimize it
    //
    // This function was arrived at through experimentation, it provides good
    // looking results with percieved softness that scale relatively linearly with
    //  the softness value in the 0 - 1 range
    //
    // For now it doesn't incur too much of a performance penalty because for most of our use cases (lights without too much softness)
    // the threshold cutoff in getIntensityFromAngleDifferential stops us from running it too many times
  function getFalloffAtAngle(angle, softness) {
    const softnessCoefficient = Math.pow(2, 14.5 * Math.max(0.001, 1.0 - clamp(softness, 0.0, 1.0)));
    const falloff = Math.pow(softnessCoefficient, 1.1) * Math.pow(8, -softnessCoefficient * Math.pow(angle, 1.8));
    return falloff;
  }

  function equirectangularToSpherical(x, y, width, height, target) {
    target.phi = (Math.PI * y) / height;
    target.theta = (2.0 * Math.PI * x) / width;
    return target;
  }

  // Create a piecewise 2D cumulative distribution function of light intensity from an envmap
  // http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#Piecewise-Constant2DDistributions

  function envmapDistribution(image) {
    const data = image.data;

    const cdfImage = {
      width: image.width + 2,
      height: image.height + 1
    };

    const cdf = makeTextureArray$1(cdfImage.width, cdfImage.height, 2);

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


  function makeTextureArray$1(width, height, channels) {
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

  function unrollLoop(indexName, start, limit, step, code) {
    let unrolled = `int ${indexName};\n`;

    for (let i = start; (step > 0 && i < limit) || (step < 0 && i > limit); i += step) {
      unrolled += `${indexName} = ${i};\n`;
      unrolled += code;
    }

    return unrolled;
  }

  var rayTraceCore = `
  #define STANDARD 0
  #define THIN_GLASS 1
  #define THICK_GLASS 2
  #define SHADOW_CATCHER 3

  const float IOR = 1.5;
  const float INV_IOR = 1.0 / IOR;

  const float IOR_THIN = 1.015;
  const float INV_IOR_THIN = 1.0 / IOR_THIN;

  const float R0 = (1.0 - IOR) * (1.0 - IOR)  / ((1.0 + IOR) * (1.0 + IOR));

  // https://www.w3.org/WAI/GL/wiki/Relative_luminance
  const vec3 luminance = vec3(0.2126, 0.7152, 0.0722);

  #define RAY_MAX_DISTANCE 9999.0

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

  struct Path {
    Ray ray;
    vec3 li;
    float alpha;
    vec3 beta;
    bool specularBounce;
    bool abort;
    float misWeight;
  };

  uniform Camera camera;
  uniform vec2 pixelSize; // 1 / screenResolution
  uniform vec2 jitter;

  in vec2 vCoord;
`;

  // Manually performs linear filtering if the extension OES_texture_float_linear is not supported

  var textureLinear = `
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

  var intersect = `

uniform sampler2D positions;
uniform sampler2D normals;
uniform sampler2D uvs;
uniform sampler2D bvh;

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

  vec3 n0 = texelFetch(normals, i0, 0).xyz;
  vec3 n1 = texelFetch(normals, i1, 0).xyz;
  vec3 n2 = texelFetch(normals, i2, 0).xyz;
  vec3 normal = normalize(barycentric.x * n0 + barycentric.y * n1 + barycentric.z * n2);

  #if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS) || defined(NUM_PBR_MAPS)
    vec2 uv0 = texelFetch(uvs, i0, 0).xy;
    vec2 uv1 = texelFetch(uvs, i1, 0).xy;
    vec2 uv2 = texelFetch(uvs, i2, 0).xy;
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

  var surfaceInteractionDirect = `

  uniform sampler2D gPosition;
  uniform sampler2D gNormal;
  uniform sampler2D gFaceNormal;
  uniform sampler2D gColor;
  uniform sampler2D gMatProps;

  void surfaceInteractionDirect(vec2 coord, inout SurfaceInteraction si) {
    vec4 positionAndMeshIndex = texture(gPosition, coord);

    si.position = positionAndMeshIndex.xyz;

    float meshIndex = positionAndMeshIndex.w;

    vec4 normalMaterialType = texture(gNormal, coord);

    si.normal = normalize(normalMaterialType.xyz);
    si.materialType = int(normalMaterialType.w);

    si.faceNormal = normalize(texture(gFaceNormal, coord).xyz);

    si.color = texture(gColor, coord).rgb;

    vec4 matProps = texture(gMatProps, coord);
    si.roughness = matProps.x;
    si.metalness = matProps.y;

    si.hit = meshIndex > 0.0 ? true : false;
  }
`;

  var random = `

// Noise texture used to generate a different random number for each pixel.
// We use blue noise in particular, but any type of noise will work.
uniform sampler2D noise;

uniform float stratifiedSamples[SAMPLING_DIMENSIONS];
uniform float strataSize;

// Every time we call randomSample() in the shader, and for every call to render,
// we want that specific bit of the shader to fetch a sample from the same position in stratifiedSamples
// This allows us to use stratified sampling for each random variable in our path tracing
int sampleIndex = 0;

float pixelSeed;

void initRandom() {
  vec2 noiseSize = vec2(textureSize(noise, 0));

  // tile the small noise texture across the entire screen
  pixelSeed = texture(noise, vCoord / (pixelSize * noiseSize)).r;
}

float randomSample() {
  float stratifiedSample = stratifiedSamples[sampleIndex++];

  float random = fract((stratifiedSample + pixelSeed) * strataSize); // blue noise + stratified samples

  // transform random number between [0, 1] to (0, 1)
  return EPS + (1.0 - 2.0 * EPS) * random;
}

vec2 randomSampleVec2() {
  return vec2(randomSample(), randomSample());
}

struct MaterialSamples {
  vec2 s1;
  vec2 s2;
  vec2 s3;
};

MaterialSamples getRandomMaterialSamples() {
  MaterialSamples samples;

  samples.s1 = randomSampleVec2();
  samples.s2 = randomSampleVec2();
  samples.s3 = randomSampleVec2();

  return samples;
}
`;

  // Sample the environment map using a cumulative distribution function as described in
  // http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Sampling_Light_Sources.html#InfiniteAreaLights

  var envmap = `

uniform sampler2D envmap;
uniform sampler2D envmapDistribution;
uniform sampler2D backgroundMap;

vec2 cartesianToEquirect(vec3 pointOnSphere) {
  float phi = mod(atan(-pointOnSphere.z, -pointOnSphere.x), TWOPI);
  float theta = acos(pointOnSphere.y);
  return vec2(phi * 0.5 * INVPI, theta * INVPI);
}

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

  // x channel is cumulative distribution of envmap luminance
  // y channel is partial probability density of envmap luminance
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

  // x channel is cumulative distribution of envmap luminance
  // y channel is partial probability density of envmap luminance
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

  vec3 dir = vec3(-sinTheta * cosPhi, cosTheta, -sinTheta * sinPhi);

  pdf = partialPdf.x * partialPdf.y * INVPI2 / (2.0 * sinTheta);

  return dir;
}

float envmapPdf(vec2 uv) {
  vec2 size = vec2(textureSize(envmap, 0));

  float sinTheta = sin(uv.y * PI);

  uv *= size;

  float partialX = texelFetch(envmapDistribution, ivec2(1.0 + uv.x, uv.y), 0).y;
  float partialY = texelFetch(envmapDistribution, ivec2(0, uv.y), 0).y;

  return partialX * partialY * INVPI2 / (2.0 * sinTheta);
}

vec3 sampleEnvmapFromDirection(vec3 d) {
  vec2 uv = cartesianToEquirect(d);
  return textureLinear(envmap, uv).rgb;
}

vec3 sampleBackgroundFromDirection(vec3 d) {
  vec2 uv = cartesianToEquirect(d);
  return textureLinear(backgroundMap, uv).rgb;
}

`;

  var bsdf = `

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

  return mix(si.color * diffuse + specular, si.color * specular, si.metalness);
}

`;

  var sample = `

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

  // Estimate the direct lighting integral using multiple importance sampling
  // http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Direct_Lighting.html#EstimatingtheDirectLightingIntegral

  var sampleMaterial = `

void sampleMaterial(SurfaceInteraction si, int bounce, inout Path path) {
  bool lastBounce = bounce == BOUNCES;
  mat3 basis = orthonormalBasis(si.normal);
  vec3 viewDir = -path.ray.d;

  MaterialSamples samples = getRandomMaterialSamples();

  vec2 diffuseOrSpecular = samples.s1;
  vec2 lightDirSample = samples.s2;
  vec2 bounceDirSample = samples.s3;

  // Step 1: Add direct illumination of the light source (the hdr map)
  // On every bounce but the last, importance sample the light source
  // On the last bounce, multiple importance sample the brdf AND the light source, determined by random var

  vec3 lightDir;
  vec2 uv;
  float lightPdf;
  bool brdfSample = false;

  if (lastBounce && diffuseOrSpecular.x < 0.5) {
    // reuse this sample by multiplying by 2 to bring sample from [0, 0.5), to [0, 1)
    lightDir = 2.0 * diffuseOrSpecular.x < mix(0.5, 0.0, si.metalness) ?
      lightDirDiffuse(si.faceNormal, viewDir, basis, lightDirSample) :
      lightDirSpecular(si.faceNormal, viewDir, basis, si.roughness, lightDirSample);

    uv = cartesianToEquirect(lightDir);
    lightPdf = envmapPdf(uv);
    brdfSample = true;
  } else {
    lightDir = sampleEnvmap(lightDirSample, uv, lightPdf);
  }

  float cosThetaL = dot(si.normal, lightDir);

  float occluded = 1.0;

  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  if (orientation < 0.0) {
    // light dir points towards surface. invalid dir.
    occluded = 0.0;
  }

  float diffuseWeight = 1.0;

  initRay(path.ray, si.position + EPS * lightDir, lightDir);
  if (intersectSceneShadow(path.ray)) {
    if (lastBounce) {
      diffuseWeight = 0.0;
    } else {
      occluded = 0.0;
    }
  }

  vec3 irr = textureLinear(envmap, uv).rgb;

  float scatteringPdf;
  vec3 brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, diffuseWeight, scatteringPdf);

  float weight;
  if (lastBounce) {
    weight = brdfSample ?
      2.0 * powerHeuristic(scatteringPdf, lightPdf) / scatteringPdf :
      2.0 * powerHeuristic(lightPdf, scatteringPdf) / lightPdf;
  } else {
    weight = powerHeuristic(lightPdf, scatteringPdf) / lightPdf;
  }

  path.li += path.beta * occluded * brdf * irr * abs(cosThetaL) * weight;;

  // Step 2: Setup ray direction for next bounce by importance sampling the BRDF

  if (lastBounce) {
    return;
  }

  lightDir = diffuseOrSpecular.y < mix(0.5, 0.0, si.metalness) ?
    lightDirDiffuse(si.faceNormal, viewDir, basis, bounceDirSample) :
    lightDirSpecular(si.faceNormal, viewDir, basis, si.roughness, bounceDirSample);

  cosThetaL = dot(si.normal, lightDir);

  orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  path.abort = orientation < 0.0;

  if (path.abort) {
    return;
  }

  brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, 1.0, scatteringPdf);

  uv = cartesianToEquirect(lightDir);
  lightPdf = envmapPdf(uv);

  path.misWeight = powerHeuristic(scatteringPdf, lightPdf);

  path.beta *= abs(cosThetaL) * brdf / scatteringPdf;

  path.specularBounce = false;

  initRay(path.ray, si.position + EPS * lightDir, lightDir);
}
`;

  var sampleShadowCatcher = `

#ifdef USE_SHADOW_CATCHER

void sampleShadowCatcher(SurfaceInteraction si, int bounce, inout Path path) {
  bool lastBounce = bounce == BOUNCES;
  mat3 basis = orthonormalBasis(si.normal);
  vec3 viewDir = -path.ray.d;
  vec3 color = bounce == 1  || path.specularBounce ? sampleBackgroundFromDirection(-viewDir) : sampleEnvmapFromDirection(-viewDir);

  si.color = vec3(1, 1, 1);

  MaterialSamples samples = getRandomMaterialSamples();

  vec2 diffuseOrSpecular = samples.s1;
  vec2 lightDirSample = samples.s2;
  vec2 bounceDirSample = samples.s3;

  vec3 lightDir;
  vec2 uv;
  float lightPdf;
  bool brdfSample = false;

  if (diffuseOrSpecular.x < 0.5) {
    lightDir = 2.0 * diffuseOrSpecular.x < mix(0.5, 0.0, si.metalness) ?
      lightDirDiffuse(si.faceNormal, viewDir, basis, lightDirSample) :
      lightDirSpecular(si.faceNormal, viewDir, basis, si.roughness, lightDirSample);
    uv = cartesianToEquirect(lightDir);
    lightPdf = envmapPdf(uv);
    brdfSample = true;
  } else {
    lightDir = sampleEnvmap(lightDirSample, uv, lightPdf);
  }

  float cosThetaL = dot(si.normal, lightDir);

  float liContrib = 1.0;

  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  if (orientation < 0.0) {
    liContrib = 0.0;
  }

  float occluded = 1.0;
  initRay(path.ray, si.position + EPS * lightDir, lightDir);
  if (intersectSceneShadow(path.ray)) {
    occluded = 0.0;
  }

  float irr = dot(luminance, textureLinear(envmap, uv).rgb);

  float scatteringPdf;
  vec3 brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, 1.0, scatteringPdf);

  float weight = brdfSample ?
    2.0 * powerHeuristic(scatteringPdf, lightPdf) / scatteringPdf :
    2.0 * powerHeuristic(lightPdf, scatteringPdf) / lightPdf;

  float liEq = liContrib * brdf.r * irr * abs(cosThetaL) * weight;

  float alpha = liEq;
  path.alpha *= alpha;
  path.li *= alpha;

  path.li += occluded * path.beta * color * liEq;

  if (lastBounce) {
    return;
  }

  lightDir = diffuseOrSpecular.y < mix(0.5, 0.0, si.metalness) ?
    lightDirDiffuse(si.faceNormal, viewDir, basis, bounceDirSample) :
    lightDirSpecular(si.faceNormal, viewDir, basis, si.roughness, bounceDirSample);

  cosThetaL = dot(si.normal, lightDir);

  orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  path.abort = orientation < 0.0;

  if (path.abort) {
    return;
  }

  brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, 1.0, scatteringPdf);

  uv = cartesianToEquirect(lightDir);
  lightPdf = envmapPdf(uv);

  path.misWeight = 0.0;

  path.beta = color * abs(cosThetaL) * brdf.r / scatteringPdf;

  path.specularBounce = false;

  initRay(path.ray, si.position + EPS * lightDir, lightDir);
}

#endif

`;

  var sampleGlass = `

#ifdef USE_GLASS

void sampleGlassSpecular(SurfaceInteraction si, int bounce, inout Path path) {
  bool lastBounce = bounce == BOUNCES;
  vec3 viewDir = -path.ray.d;
  float cosTheta = dot(si.normal, viewDir);

  MaterialSamples samples = getRandomMaterialSamples();

  float reflectionOrRefraction = samples.s1.x;

  float F = si.materialType == THIN_GLASS ?
    fresnelSchlick(abs(cosTheta), R0) : // thin glass
    fresnelSchlickTIR(cosTheta, R0, IOR); // thick glass

  vec3 lightDir;

  if (reflectionOrRefraction < F) {
    lightDir = reflect(-viewDir, si.normal);
  } else {
    lightDir = si.materialType == THIN_GLASS ?
      refract(-viewDir, sign(cosTheta) * si.normal, INV_IOR_THIN) : // thin glass
      refract(-viewDir, sign(cosTheta) * si.normal, cosTheta < 0.0 ? IOR : INV_IOR); // thick glass
    path.beta *= si.color;
  }

  path.misWeight = 1.0;

  initRay(path.ray, si.position + EPS * lightDir, lightDir);

  path.li += lastBounce ? path.beta * sampleBackgroundFromDirection(lightDir) : vec3(0.0);

  path.specularBounce = true;
}

#endif

`;

  var fragment$1 = {
  includes: [
    constants$1,
    rayTraceCore,
    textureLinear,
    materialBuffer,
    intersect,
    surfaceInteractionDirect,
    random,
    envmap,
    bsdf,
    sample,
    sampleMaterial,
    sampleGlass,
    sampleShadowCatcher,
  ],
  outputs: ['light'],
  source: (defines) => `
  void bounce(inout Path path, int i, inout SurfaceInteraction si) {

    if (!si.hit) {
      vec3 irr = path.specularBounce ? sampleBackgroundFromDirection(path.ray.d) : sampleEnvmapFromDirection(path.ray.d);

      // hit a light source (the hdr map)
      // add contribution from light source
      // path.misWeight is the multiple importance sampled weight of this light source
      path.li += path.misWeight * path.beta * irr;
      path.abort = true;
      return;
    }

    #ifdef USE_GLASS
      if (si.materialType == THIN_GLASS || si.materialType == THICK_GLASS) {
        sampleGlassSpecular(si, i, path);
      }
    #endif
    #ifdef USE_SHADOW_CATCHER
      if (si.materialType == SHADOW_CATCHER) {
        sampleShadowCatcher(si, i, path);
      }
    #endif
    if (si.materialType == STANDARD) {
      sampleMaterial(si, i, path);
    }

    // Russian Roulette sampling
    if (i >= 2) {
      float q = 1.0 - dot(path.beta, luminance);
      if (randomSample() < q) {
        path.abort = true;
      }
      path.beta /= 1.0 - q;
    }

  }

  // Path tracing integrator as described in
  // http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Path_Tracing.html#
  vec4 integrator(inout Ray ray) {
    Path path;
    path.ray = ray;
    path.li = vec3(0);
    path.alpha = 1.0;
    path.beta = vec3(1.0);
    path.specularBounce = true;
    path.abort = false;
    path.misWeight = 1.0;

    SurfaceInteraction si;

    // first surface interaction from g-buffer
    surfaceInteractionDirect(vCoord, si);

    // first surface interaction from ray interesction
    // intersectScene(path.ray, si);

    bounce(path, 1, si);

    // Manually unroll for loop.
    // Some hardware fails to iterate over a GLSL loop, so we provide this workaround
    // for (int i = 1; i < defines.bounces + 1, i += 1)
    // equivelant to
    ${unrollLoop('i', 2, defines.BOUNCES + 1, 1, `
      if (path.abort) {
        return vec4(path.li, path.alpha);
      }
      intersectScene(path.ray, si);
      bounce(path, i, si);
    `)}

    return vec4(path.li, path.alpha);
  }

  void main() {
    initRandom();

    vec2 vCoordAntiAlias = vCoord + jitter;

    vec3 direction = normalize(vec3(vCoordAntiAlias - 0.5, -1.0) * vec3(camera.aspect, 1.0, camera.fov));

    // Thin lens model with depth-of-field
    // http://www.pbr-book.org/3ed-2018/Camera_Models/Projective_Camera_Models.html#TheThinLensModelandDepthofField
    // vec2 lensPoint = camera.aperture * sampleCircle(randomSampleVec2());
    // vec3 focusPoint = -direction * camera.focus / direction.z; // intersect ray direction with focus plane

    // vec3 origin = vec3(lensPoint, 0.0);
    // direction = normalize(focusPoint - origin);

    // origin = vec3(camera.transform * vec4(origin, 1.0));
    // direction = mat3(camera.transform) * direction;

    vec3 origin = camera.transform[3].xyz;
    direction = mat3(camera.transform) * direction;

    Ray cam;
    initRay(cam, origin, direction);

    vec4 liAndAlpha = integrator(cam);

    if (!(liAndAlpha.x < INF && liAndAlpha.x > -EPS)) {
      liAndAlpha = vec4(0, 0, 0, 1);
    }

    out_light = liAndAlpha;

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

    // out_light = vec4(0, 0, 0, 1);
    // if (sampleIndex == SAMPLING_DIMENSIONS) {
    //   out_light = vec4(1, 1, 1, 1);
    // } else if (sampleIndex > SAMPLING_DIMENSIONS) {
    //   out_light = vec4(1, 0, 0, 1);
    // }
}
`
  };

  /*
  Stratified Sampling
  http://www.pbr-book.org/3ed-2018/Sampling_and_Reconstruction/Stratified_Sampling.html

  Repeatedly sampling random numbers between [0, 1) has the effect of producing numbers that are coincidentally clustered together,
  instead of being evenly spaced across the domain.
  This produces low quality results for the path tracer since clustered samples send too many rays in similar directions.

  We can reduce the amount of clustering of random numbers by using stratified sampling.
  Stratification divides the [0, 1) range into partitions, or stratum, of equal size.
  Each invocation of the stratified sampler draws one uniform random number from one stratum from a shuffled sequence of stratums.
  When every stratum has been sampled once, this sequence is shuffled again and the process repeats.

  The returned sample ranges between [0, numberOfStratum).
  The integer part ideintifies the stratum (the first stratum being 0).
  The fractional part is the random number.

  To obtain the stratified sample between [0, 1), divide the returned sample by the stratum count.
  */

  function makeStratifiedSampler(strataCount, dimensions) {
    const strata = [];
    const l = strataCount ** dimensions;
    for (let i = 0; i < l; i++) {
      strata[i] = i;
    }

    let index = strata.length;

    const sample = [];

    function restart() {
      index = 0;
    }

    function next() {
      if (index >= strata.length) {
        shuffle(strata);
        restart();
      }
      let stratum = strata[index++];

      for (let i = 0; i < dimensions; i++) {
        sample[i] = stratum % strataCount + Math.random();
        stratum = Math.floor(stratum / strataCount);
      }

      return sample;
    }

    return {
      next,
      restart,
      strataCount
    };
  }

  /*
  Stratified Sampling
  http://www.pbr-book.org/3ed-2018/Sampling_and_Reconstruction/Stratified_Sampling.html

  It is computationally unfeasible to compute stratified sampling for large dimensions (>2)
  Instead, we can compute stratified sampling for lower dimensional patterns that sum to the high dimension
  e.g. instead of sampling a 6D domain, we sample a 2D + 2D + 2D domain.
  This reaps many benefits of stratification while still allowing for small strata sizes.
  */

  function makeStratifiedSamplerCombined(strataCount, listOfDimensions) {
    const strataObjs = [];

    for (const dim of listOfDimensions) {
      strataObjs.push(makeStratifiedSampler(strataCount, dim));
    }

    const combined = [];

    function next() {
      let i = 0;

      for (const strata of strataObjs) {
        const nums = strata.next();

        for (const num of nums) {
          combined[i++] = num;
        }
      }

      return combined;
    }

    function restart() {
      for (const strata of strataObjs) {
        strata.restart();
      }
    }

    return {
      next,
      restart,
      strataCount
    };
  }

  function makeRayTracePass(gl, {
      bounces, // number of global illumination bounces
      decomposedScene,
      fullscreenQuad,
      materialBuffer,
      mergedMesh,
      optionalExtensions,
    }) {

    bounces = clamp(bounces, 1, 6);

    const samplingDimensions = [];

    for (let i = 1; i <= bounces; i++) {
      // specular or diffuse reflection, light importance sampling, next path direction
      samplingDimensions.push(2, 2, 2);
      if (i >= 2) {
        // russian roulette sampling
        // this step is skipped on the first bounce
        samplingDimensions.push(1);
      }
    }

    let samples;

    const renderPass = makeRenderPassFromScene({
      bounces, decomposedScene, fullscreenQuad, gl, materialBuffer, mergedMesh, optionalExtensions, samplingDimensions,
    });

    function setSize(width, height) {
      renderPass.setUniform('pixelSize', 1 / width, 1 / height);
    }

    // noiseImage is a 32-bit PNG image
    function setNoise(noiseImage) {
      renderPass.setTexture('noise', makeTexture(gl, {
        data: noiseImage,
        wrapS: gl.REPEAT,
        wrapT: gl.REPEAT,
        storage: 'halfFloat',
      }));
    }

    function setCamera(camera) {
      renderPass.setUniform('camera.transform', camera.matrixWorld.elements);
      renderPass.setUniform('camera.aspect', camera.aspect);
      renderPass.setUniform('camera.fov', 0.5 / Math.tan(0.5 * Math.PI * camera.fov / 180));
    }

    function setJitter(x, y) {
      renderPass.setUniform('jitter', x, y);
    }

    function setGBuffers({ position, normal, faceNormal, color, matProps }) {
      renderPass.setTexture('gPosition', position);
      renderPass.setTexture('gNormal', normal);
      renderPass.setTexture('gFaceNormal', faceNormal);
      renderPass.setTexture('gColor', color);
      renderPass.setTexture('gMatProps', matProps);
    }

    function nextSeed() {
      renderPass.setUniform('stratifiedSamples[0]', samples.next());
    }

    function setStrataCount(strataCount) {
      if (strataCount > 1 && strataCount !== samples.strataCount) {
        // reinitailizing random has a performance cost. we can skip it if
        // * strataCount is 1, since a strataCount of 1 works with any sized StratifiedRandomCombined
        // * random already has the same strata count as desired
        samples = makeStratifiedSamplerCombined(strataCount, samplingDimensions);
      } else {
        samples.restart();
      }

      renderPass.setUniform('strataSize', 1.0 / strataCount);
      nextSeed();
    }

    function bindTextures() {
      renderPass.bindTextures();
    }

    function draw() {
      renderPass.useProgram(false);
      fullscreenQuad.draw();
    }

    samples = makeStratifiedSamplerCombined(1, samplingDimensions);

    return {
      bindTextures,
      draw,
      nextSeed,
      outputLocs: renderPass.outputLocs,
      setCamera,
      setJitter,
      setGBuffers,
      setNoise,
      setSize,
      setStrataCount,
    };
  }
  function makeRenderPassFromScene({
      bounces,
      decomposedScene,
      fullscreenQuad,
      gl,
      materialBuffer,
      mergedMesh,
      optionalExtensions,
      samplingDimensions,
    }) {
    const { OES_texture_float_linear } = optionalExtensions;

    const { background, directionalLights, ambientLights, environmentLights } = decomposedScene;

    const { geometry, materials, materialIndices } = mergedMesh;

    // create bounding volume hierarchy from a static scene
    const bvh = bvhAccel(geometry);
    const flattenedBvh = flattenBvh(bvh);
    const numTris = geometry.index.count / 3;

    const renderPass = makeRenderPass(gl, {
      defines: {
        OES_texture_float_linear,
        BVH_COLUMNS: textureDimensionsFromArray(flattenedBvh.count).columnsLog,
        INDEX_COLUMNS: textureDimensionsFromArray(numTris).columnsLog,
        VERTEX_COLUMNS: textureDimensionsFromArray(geometry.attributes.position.count).columnsLog,
        STACK_SIZE: flattenedBvh.maxDepth,
        BOUNCES: bounces,
        USE_GLASS: materials.some(m => m.transparent),
        USE_SHADOW_CATCHER: materials.some(m => m.shadowCatcher),
        SAMPLING_DIMENSIONS: samplingDimensions.reduce((a, b) => a + b),
        ...materialBuffer.defines
      },
      fragment: fragment$1,
      vertex: fullscreenQuad.vertexShader
    });

    renderPass.setTexture('diffuseMap', materialBuffer.textures.diffuseMap);
    renderPass.setTexture('normalMap', materialBuffer.textures.normalMap);
    renderPass.setTexture('pbrMap', materialBuffer.textures.pbrMap);

    renderPass.setTexture('positions', makeDataTexture(gl, geometry.getAttribute('position').array, 3));

    renderPass.setTexture('normals', makeDataTexture(gl, geometry.getAttribute('normal').array, 3));

    renderPass.setTexture('uvs', makeDataTexture(gl, geometry.getAttribute('uv').array, 2));

    renderPass.setTexture('bvh', makeDataTexture(gl, flattenedBvh.buffer, 4));

    const envImage = generateEnvMapFromSceneComponents(directionalLights, ambientLights, environmentLights);
    const envImageTextureObject = makeTexture(gl, {
      data: envImage.data,
      storage: 'halfFloat',
      minFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
      magFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
      width: envImage.width,
      height: envImage.height,
    });

    renderPass.setTexture('envmap', envImageTextureObject);

    let backgroundImageTextureObject;
    if (background) {
      const backgroundImage = generateBackgroundMapFromSceneBackground(background);
      backgroundImageTextureObject = makeTexture(gl, {
        data: backgroundImage.data,
        storage: 'halfFloat',
        minFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
        magFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
        width: backgroundImage.width,
        height: backgroundImage.height,
      });
    } else {
      backgroundImageTextureObject = envImageTextureObject;
    }

    renderPass.setTexture('backgroundMap', backgroundImageTextureObject);

    const distribution = envmapDistribution(envImage);

    renderPass.setTexture('envmapDistribution', makeTexture(gl, {
      data: distribution.data,
      storage: 'halfFloat',
      width: distribution.width,
      height: distribution.height,
    }));

    return renderPass;
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

  function makeDataTexture(gl, dataArray, channels) {
    const textureDim = textureDimensionsFromArray(dataArray.length / channels);
    return makeTexture(gl, {
      data: padArray(dataArray, channels * textureDim.size),
      width: textureDim.columns,
      height: textureDim.rows,
    });
  }

  // expand array to the given length
  function padArray(typedArray, length) {
    const newArray = new typedArray.constructor(length);
    newArray.set(typedArray);
    return newArray;
  }

  var fragment$2 = {
  outputs: ['light'],
  includes: [textureLinear],
  source: `
  in vec2 vCoord;

  uniform mediump sampler2D light;
  uniform mediump sampler2D position;
  uniform vec2 lightScale;
  uniform vec2 previousLightScale;

  uniform mediump sampler2D previousLight;
  uniform mediump sampler2D previousPosition;

  uniform mat4 historyCamera;
  uniform float blendAmount;
  uniform vec2 jitter;

  vec2 reproject(vec3 position) {
    vec4 historyCoord = historyCamera * vec4(position, 1.0);
    return 0.5 * historyCoord.xy / historyCoord.w + 0.5;
  }

  float getMeshId(sampler2D meshIdTex, vec2 vCoord) {
    return floor(texture(meshIdTex, vCoord).w);
  }

  void main() {
    vec3 currentPosition = textureLinear(position, vCoord).xyz;
    float currentMeshId = getMeshId(position, vCoord);

    vec4 currentLight = texture(light, lightScale * vCoord);

    if (currentMeshId == 0.0) {
      out_light = currentLight;
      return;
    }

    vec2 hCoord = reproject(currentPosition) - jitter;

    vec2 hSizef = previousLightScale * vec2(textureSize(previousLight, 0));
    vec2 hSizeInv = 1.0 / hSizef;
    ivec2 hSize = ivec2(hSizef);

    vec2 hTexelf = hCoord * hSizef - 0.5;
    ivec2 hTexel = ivec2(hTexelf);
    vec2 f = fract(hTexelf);

    ivec2 texel[] = ivec2[](
      hTexel + ivec2(0, 0),
      hTexel + ivec2(1, 0),
      hTexel + ivec2(0, 1),
      hTexel + ivec2(1, 1)
    );

    float weights[] = float[](
      (1.0 - f.x) * (1.0 - f.y),
      f.x * (1.0 - f.y),
      (1.0 - f.x) * f.y,
      f.x * f.y
    );

    vec4 history;
    float sum;

    // bilinear sampling, rejecting samples that don't have a matching mesh id
    for (int i = 0; i < 4; i++) {
      vec2 gCoord = (vec2(texel[i]) + 0.5) * hSizeInv;

      float histMeshId = getMeshId(previousPosition, gCoord);

      float isValid = histMeshId != currentMeshId || any(greaterThanEqual(texel[i], hSize)) ? 0.0 : 1.0;

      float weight = isValid * weights[i];
      history += weight * texelFetch(previousLight, texel[i], 0);
      sum += weight;
    }

    if (sum > 0.0) {
      history /= sum;
    } else {
      // If all samples of bilinear fail, try a 3x3 box filter
      hTexel = ivec2(hTexelf + 0.5);

      for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
          ivec2 texel = hTexel + ivec2(x, y);
          vec2 gCoord = (vec2(texel) + 0.5) * hSizeInv;

          float histMeshId = getMeshId(previousPosition, gCoord);

          float isValid = histMeshId != currentMeshId || any(greaterThanEqual(texel, hSize)) ? 0.0 : 1.0;

          float weight = isValid;
          vec4 h = texelFetch(previousLight, texel, 0);
          history += weight * h;
          sum += weight;
        }
      }
      history = sum > 0.0 ? history / sum : history;
    }

    if (history.w > MAX_SAMPLES) {
      history.xyz *= MAX_SAMPLES / history.w;
      history.w = MAX_SAMPLES;
    }

    out_light = blendAmount * history + currentLight;
  }
`
  };

  function makeReprojectPass(gl, params) {
    const {
      fullscreenQuad,
      maxReprojectedSamples,
    } = params;

    const renderPass = makeRenderPass(gl, {
        defines: {
          MAX_SAMPLES: maxReprojectedSamples.toFixed(1)
        },
        vertex: fullscreenQuad.vertexShader,
        fragment: fragment$2
      });

    const historyCamera = new THREE$1.Matrix4();

    function setPreviousCamera(camera) {
      historyCamera.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

      renderPass.setUniform('historyCamera', historyCamera.elements);
    }

    function setJitter(x, y) {
      renderPass.setUniform('jitter', x, y);
    }

    function draw(params) {
      const {
        blendAmount,
        light,
        lightScale,
        position,
        previousLight,
        previousLightScale,
        previousPosition,
      } = params;

      renderPass.setUniform('blendAmount', blendAmount);
      renderPass.setUniform('lightScale', lightScale.x, lightScale.y);
      renderPass.setUniform('previousLightScale', previousLightScale.x, previousLightScale.y);

      renderPass.setTexture('light', light);
      renderPass.setTexture('position', position);
      renderPass.setTexture('previousLight', previousLight);
      renderPass.setTexture('previousPosition', previousPosition);

      renderPass.useProgram();
      fullscreenQuad.draw();
    }

    return {
      draw,
      setJitter,
      setPreviousCamera,
    };
  }

  var fragment$3 = {
  includes: [textureLinear],
  outputs: ['color'],
  source: `
  in vec2 vCoord;

  uniform sampler2D light;
  uniform sampler2D position;

  uniform vec2 lightScale;

  // Tonemapping functions from THREE.js

  vec3 linear(vec3 color) {
    return color;
  }
  // https://www.cs.utah.edu/~reinhard/cdrom/
  vec3 reinhard(vec3 color) {
    return clamp(color / (vec3(1.0) + color), vec3(0.0), vec3(1.0));
  }
  // http://filmicworlds.com/blog/filmic-tonemapping-operators/
  #define uncharted2Helper(x) max(((x * (0.15 * x + 0.10 * 0.50) + 0.20 * 0.02) / (x * (0.15 * x + 0.50) + 0.20 * 0.30)) - 0.02 / 0.30, vec3(0.0))
  const vec3 uncharted2WhitePoint = 1.0 / uncharted2Helper(vec3(WHITE_POINT));
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

  #ifdef EDGE_PRESERVING_UPSCALE

  float getMeshId(sampler2D meshIdTex, vec2 vCoord) {
    return floor(texture(meshIdTex, vCoord).w);
  }

  vec4 getUpscaledLight(vec2 coord) {
    float meshId = getMeshId(position, coord);

    vec2 sizef = lightScale * vec2(textureSize(position, 0));
    vec2 texelf = coord * sizef - 0.5;
    ivec2 texel = ivec2(texelf);
    vec2 f = fract(texelf);

    ivec2 texels[] = ivec2[](
      texel + ivec2(0, 0),
      texel + ivec2(1, 0),
      texel + ivec2(0, 1),
      texel + ivec2(1, 1)
    );

    float weights[] = float[](
      (1.0 - f.x) * (1.0 - f.y),
      f.x * (1.0 - f.y),
      (1.0 - f.x) * f.y,
      f.x * f.y
    );

    vec4 upscaledLight;
    float sum;
    for (int i = 0; i < 4; i++) {
      vec2 pCoord = (vec2(texels[i]) + 0.5) / sizef;
      float isValid = getMeshId(position, pCoord) == meshId ? 1.0 : 0.0;
      float weight = isValid * weights[i];
      upscaledLight += weight * texelFetch(light, texels[i], 0);
      sum += weight;
    }

    if (sum > 0.0) {
      upscaledLight /= sum;
    } else {
      upscaledLight = texture(light, lightScale * coord);
    }

    return upscaledLight;
  }
  #endif

  void main() {
    #ifdef EDGE_PRESERVING_UPSCALE
      vec4 upscaledLight = getUpscaledLight(vCoord);
    #else
      vec4 upscaledLight = texture(light, lightScale * vCoord);
    #endif

    // alpha channel stores the number of samples progressively rendered
    // divide the sum of light by alpha to obtain average contribution of light

    // in addition, alpha contains a scale factor for the shadow catcher material
    // dividing by alpha normalizes the brightness of the shadow catcher to match the background envmap.
    vec3 light = upscaledLight.rgb / upscaledLight.a;

    light *= EXPOSURE;

    light = TONE_MAPPING(light);

    light = pow(light, vec3(1.0 / 2.2)); // gamma correction

    out_color = vec4(light, 1.0);
  }
`
  };

  const toneMapFunctions = {
    [THREE$1.LinearToneMapping]: 'linear',
    [THREE$1.ReinhardToneMapping]: 'reinhard',
    [THREE$1.Uncharted2ToneMapping]: 'uncharted2',
    [THREE$1.CineonToneMapping]: 'cineon',
    [THREE$1.ACESFilmicToneMapping]: 'acesFilmic'
  };

  function makeToneMapPass(gl, params) {
    const {
      fullscreenQuad,
      toneMappingParams
    } = params;

    const renderPassConfig = {
      gl,
      defines: {
        TONE_MAPPING: toneMapFunctions[toneMappingParams.toneMapping] || 'linear',
        WHITE_POINT: toneMappingParams.whitePoint.toExponential(), // toExponential allows integers to be represented as GLSL floats
        EXPOSURE: toneMappingParams.exposure.toExponential()
      },
      vertex: fullscreenQuad.vertexShader,
      fragment: fragment$3,
    };

    renderPassConfig.defines.EDGE_PRESERVING_UPSCALE = true;
    const renderPassUpscale = makeRenderPass(gl, renderPassConfig);

    renderPassConfig.defines.EDGE_PRESERVING_UPSCALE = false;
    const renderPassNative = makeRenderPass(gl, renderPassConfig);

    function draw(params) {
      const {
        light,
        lightScale,
        position
      } = params;

      const renderPass =
        lightScale.x !== 1 && lightScale.y !== 1 ?
        renderPassUpscale :
        renderPassNative;

      renderPass.setUniform('lightScale', lightScale.x, lightScale.y);
      renderPass.setTexture('light', light);
      renderPass.setTexture('position', position);

      renderPass.useProgram();
      fullscreenQuad.draw();
    }

    return {
      draw
    };
  }

  // TileRender is based on the concept of a compute shader's work group.

  // Sampling the scene with the RayTracingRenderer can be very slow (<1 fps).
  // This overworks the GPU and tends to lock up the OS, making it unresponsive.

  // To fix this, we can split the screen into smaller tiles, and sample the scene one tile at a time
  // The tile size is set such that each tile takes approximatly a constant amount of time to render.

  // Since the render time of a tile is dependent on the device, we find the desired tile dimensions by measuring
  // the time it takes to render an arbitrarily-set tile size and adjusting the size according to the benchmark.

  function makeTileRender(gl) {
    let currentTile = -1;
    let numTiles = 1;
    let tileWidth;
    let tileHeight;
    let columns;
    let rows;

    let width = 0;
    let height = 0;

    // initial number of pixels per rendered tile
    // based on correlation between system performance and max supported render buffer size
    // adjusted dynamically according to system performance
    let pixelsPerTile = pixelsPerTileEstimate(gl);

    let pixelsPerTileQuantized = pixelsPerTile;

    let desiredTimePerTile = 20;

    let timePerPixel = desiredTimePerTile / pixelsPerTile;

    let lastTime = 0;
    let timeElapsed = 0;

    function updateTime(time) {
      if (lastTime) {
        timeElapsed = time - lastTime;
      }

      lastTime = time;
    }

    function reset() {
      currentTile = -1;
      timeElapsed = 0;
      lastTime = 0;
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
      if (timeElapsed) {
        const timePerTile = timeElapsed / numTiles;

        const expAvg = 0.5;

        const newPixelsPerTile = pixelsPerTile * desiredTimePerTile / timePerTile;
        pixelsPerTile = expAvg * pixelsPerTile + (1 - expAvg) * newPixelsPerTile;

        const newTimePerPixel = timePerTile / pixelsPerTileQuantized;
        timePerPixel = expAvg * timePerPixel + (1 - expAvg) * newTimePerPixel;
      }

      pixelsPerTile = clamp(pixelsPerTile, 8192, width * height);

      setTileDimensions(pixelsPerTile);
    }

    function nextTile() {
      currentTile++;

      if (currentTile % numTiles === 0) {
        initTiles();
        currentTile = 0;
        timeElapsed = 0;
      }

      const isLastTile = currentTile === numTiles - 1;
      if (isLastTile) {
        requestAnimationFrame(updateTime);
      }

      const x = currentTile % columns;
      const y = Math.floor(currentTile / columns) % rows;

      return {
        x: x * tileWidth,
        y: y * tileHeight,
        tileWidth,
        tileHeight,
        isFirstTile: currentTile === 0,
        isLastTile,
      };
    }

    return {
      getTimePerPixel() {
        return timePerPixel;
      },
      nextTile,
      reset,
      setSize,
    };
  }

  function pixelsPerTileEstimate(gl) {
    const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);

    if (maxRenderbufferSize <= 8192) {
      return 200000;
    } else if (maxRenderbufferSize === 16384) {
      return 400000;
    } else if (maxRenderbufferSize >= 32768) {
      return 600000;
    }
  }

  var noiseBase64 = 'data:image/png;base64,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';

  function makeRenderingPipeline({
      gl,
      optionalExtensions,
      scene,
      toneMappingParams,
      bounces, // number of global illumination bounces
    }) {

    const maxReprojectedSamples = 20;

    // how many samples to render with uniform noise before switching to stratified noise
    const numUniformSamples = 4;

    // how many partitions of stratified noise should be created
    // higher number results in faster convergence over time, but with lower quality initial samples
    const strataCount = 6;

    const desiredTimeForPreview = 14;

    const decomposedScene = decomposeScene(scene);

    const mergedMesh = mergeMeshesToGeometry(decomposedScene.meshes);

    const materialBuffer = makeMaterialBuffer(gl, mergedMesh.materials);

    const fullscreenQuad = makeFullscreenQuad(gl);

    const rayTracePass = makeRayTracePass(gl, { bounces, decomposedScene, fullscreenQuad, materialBuffer, mergedMesh, optionalExtensions, scene });

    const reprojectPass = makeReprojectPass(gl, { fullscreenQuad, maxReprojectedSamples });

    const toneMapPass = makeToneMapPass(gl, { fullscreenQuad, toneMappingParams });

    const gBufferPass = makeGBufferPass(gl, { materialBuffer, mergedMesh });

    // used to sample only a portion of the scene to the HDR Buffer to prevent the GPU from locking up from excessive computation
    const tileRender = makeTileRender(gl);

    let ready = false;
    const noiseImage = new Image();
    noiseImage.src = noiseBase64;
    noiseImage.onload = () => {
      rayTracePass.setNoise(noiseImage);
      ready = true;
    };

    let sampleCount = 0;

    let sampleRenderedCallback = () => {};

    const lastCamera = new THREE$1.PerspectiveCamera();
    lastCamera.position.set(1, 1, 1);
    lastCamera.updateMatrixWorld();

    let screenWidth = 0;
    let screenHeight = 0;

    let previewWidth = 0;
    let previewHeight = 0;

    const previewScale = new THREE$1.Vector2(1, 1);
    const fullscreenScale = new THREE$1.Vector2(1, 1);

    let hdrBuffer;
    let hdrBackBuffer;
    let reprojectBuffer;
    let reprojectBackBuffer;

    let gBuffer;
    let gBufferBack;

    let lastToneMappedTexture;
    let lastToneMappedScale;

    function initFrameBuffers(width, height) {
      const makeHdrBuffer = () => makeFramebuffer(gl, {
        color: { 0: makeTexture(gl, { width, height, storage: 'float', magFilter: gl.LINEAR, minFilter: gl.LINEAR }) }
      });

      const makeReprojectBuffer = () => makeFramebuffer(gl, {
          color: { 0: makeTexture(gl, { width, height, storage: 'float', magFilter: gl.LINEAR, minFilter: gl.LINEAR }) }
        });

      hdrBuffer = makeHdrBuffer();
      hdrBackBuffer = makeHdrBuffer();

      reprojectBuffer = makeReprojectBuffer();
      reprojectBackBuffer = makeReprojectBuffer();

      const normalBuffer = makeTexture(gl, { width, height, storage: 'halfFloat' });
      const faceNormalBuffer = makeTexture(gl, { width, height, storage: 'halfFloat' });
      const colorBuffer = makeTexture(gl, { width, height, storage: 'byte', channels: 3 });
      const matProps = makeTexture(gl, { width, height, storage: 'byte', channels: 2 });
      const depthTarget = makeDepthTarget(gl, width, height);

      const makeGBuffer = () => makeFramebuffer(gl, {
        color: {
          [gBufferPass.outputLocs.position]: makeTexture(gl, { width, height, storage: 'float' }),
          [gBufferPass.outputLocs.normal]: normalBuffer,
          [gBufferPass.outputLocs.faceNormal]: faceNormalBuffer,
          [gBufferPass.outputLocs.color]: colorBuffer,
          [gBufferPass.outputLocs.matProps]: matProps,
        },
        depth: depthTarget
      });

      gBuffer = makeGBuffer();
      gBufferBack = makeGBuffer();

      lastToneMappedTexture = hdrBuffer.color[rayTracePass.outputLocs.light];
      lastToneMappedScale = fullscreenScale;
    }

    function swapReprojectBuffer() {
      let temp = reprojectBuffer;
      reprojectBuffer = reprojectBackBuffer;
      reprojectBackBuffer = temp;
    }

    function swapGBuffer() {
      let temp = gBuffer;
      gBuffer = gBufferBack;
      gBufferBack = temp;
    }

    function swapHdrBuffer() {
      let temp = hdrBuffer;
      hdrBuffer = hdrBackBuffer;
      hdrBackBuffer = temp;
    }

    // Shaders will read from the back buffer and draw to the front buffer
    // Buffers are swapped after every render
    function swapBuffers() {
      swapReprojectBuffer();
      swapGBuffer();
      swapHdrBuffer();
    }

    function setSize(w, h) {
      screenWidth = w;
      screenHeight = h;

      tileRender.setSize(w, h);
      initFrameBuffers(w, h);
    }

    function setPreviewBufferDimensions() {
      const numPixelsForPreview = desiredTimeForPreview / tileRender.getTimePerPixel();

      const aspectRatio = screenWidth / screenHeight;

      previewWidth = Math.round(clamp(Math.sqrt(numPixelsForPreview * aspectRatio), 1, screenWidth));
      previewHeight = Math.round(clamp(previewWidth / aspectRatio, 1, screenHeight));
      previewScale.set(previewWidth / screenWidth, previewHeight / screenHeight);
    }

    function areCamerasEqual(cam1, cam2) {
      return numberArraysEqual(cam1.matrixWorld.elements, cam2.matrixWorld.elements) &&
        cam1.aspect === cam2.aspect &&
        cam1.fov === cam2.fov &&
        cam1.focus === cam2.focus;
    }

    function updateSeed(width, height, useJitter = true) {
      rayTracePass.setSize(width, height);

      const jitterX = useJitter ? (Math.random() - 0.5) / width : 0;
      const jitterY = useJitter ? (Math.random() - 0.5) / height : 0;
      gBufferPass.setJitter(jitterX, jitterY);
      rayTracePass.setJitter(jitterX, jitterY);
      reprojectPass.setJitter(jitterX, jitterY);

      if (sampleCount === 0) {
        rayTracePass.setStrataCount(1);
      } else if (sampleCount === numUniformSamples) {
        rayTracePass.setStrataCount(strataCount);
      } else {
        rayTracePass.nextSeed();
      }
    }

    function clearBuffer(buffer) {
      buffer.bind();
      gl.clear(gl.COLOR_BUFFER_BIT);
      buffer.unbind();
    }

    function addSampleToBuffer(buffer, width, height) {
      buffer.bind();

      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.enable(gl.BLEND);

      gl.viewport(0, 0, width, height);
      rayTracePass.draw();

      gl.disable(gl.BLEND);
      buffer.unbind();
    }

    function newSampleToBuffer(buffer, width, height) {
      buffer.bind();
      gl.viewport(0, 0, width, height);
      rayTracePass.draw();
      buffer.unbind();
    }

    function toneMapToScreen(lightTexture, lightScale) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      toneMapPass.draw({
        light: lightTexture,
        lightScale,
        position: gBuffer.color[gBufferPass.outputLocs.position],
      });

      lastToneMappedTexture = lightTexture;
      lastToneMappedScale = lightScale;
    }

    function renderGBuffer() {
      gBuffer.bind();
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.viewport(0, 0, screenWidth, screenHeight);
      gBufferPass.draw();
      gBuffer.unbind();

      rayTracePass.setGBuffers({
        position: gBuffer.color[gBufferPass.outputLocs.position],
        normal: gBuffer.color[gBufferPass.outputLocs.normal],
        faceNormal: gBuffer.color[gBufferPass.outputLocs.faceNormal],
        color: gBuffer.color[gBufferPass.outputLocs.color],
        matProps: gBuffer.color[gBufferPass.outputLocs.matProps]
      });
    }

    function renderTile(buffer, x, y, width, height) {
      gl.scissor(x, y, width, height);
      gl.enable(gl.SCISSOR_TEST);
      addSampleToBuffer(buffer, screenWidth, screenHeight);
      gl.disable(gl.SCISSOR_TEST);
    }

    function drawPreview(camera, lastCamera) {
      if (sampleCount > 0) {
        swapBuffers();
      }

      sampleCount = 0;
      tileRender.reset();
      setPreviewBufferDimensions();

      updateSeed(previewWidth, previewHeight, false);

      rayTracePass.setCamera(camera);
      gBufferPass.setCamera(camera);
      reprojectPass.setPreviousCamera(lastCamera);
      lastCamera.copy(camera);

      renderGBuffer();

      rayTracePass.bindTextures();
      newSampleToBuffer(hdrBuffer, previewWidth, previewHeight);

      reprojectBuffer.bind();
      gl.viewport(0, 0, previewWidth, previewHeight);
      reprojectPass.draw({
        blendAmount: 1.0,
        light: hdrBuffer.color[0],
        lightScale: previewScale,
        position: gBuffer.color[gBufferPass.outputLocs.position],
        previousLight: lastToneMappedTexture,
        previousLightScale: lastToneMappedScale,
        previousPosition: gBufferBack.color[gBufferPass.outputLocs.position],
      });
      reprojectBuffer.unbind();

      toneMapToScreen(reprojectBuffer.color[0], previewScale);

      swapBuffers();
    }

    function drawTile() {
      const { x, y, tileWidth, tileHeight, isFirstTile, isLastTile } = tileRender.nextTile();

      if (isFirstTile) {

        if (sampleCount === 0) { // previous rendered image was a preview image
          clearBuffer(hdrBuffer);
          reprojectPass.setPreviousCamera(lastCamera);
        }

        updateSeed(screenWidth, screenHeight, true);
        renderGBuffer();
        rayTracePass.bindTextures();
      }

      renderTile(hdrBuffer, x, y, tileWidth, tileHeight);

      if (isLastTile) {
        sampleCount++;

        let blendAmount = clamp(1.0 - sampleCount / maxReprojectedSamples, 0, 1);
        blendAmount *= blendAmount;

        if (blendAmount > 0.0) {
          reprojectBuffer.bind();
          gl.viewport(0, 0, screenWidth, screenHeight);
          reprojectPass.draw({
            blendAmount,
            light: hdrBuffer.color[0],
            lightScale: fullscreenScale,
            position: gBuffer.color[gBufferPass.outputLocs.position],
            previousLight: reprojectBackBuffer.color[0],
            previousLightScale: previewScale,
            previousPosition: gBufferBack.color[gBufferPass.outputLocs.position],
          });
          reprojectBuffer.unbind();

          toneMapToScreen(reprojectBuffer.color[0], fullscreenScale);
        } else {
          toneMapToScreen(hdrBuffer.color[0], fullscreenScale);
        }

        sampleRenderedCallback(sampleCount);
      }
    }

    function draw(camera) {
      if (!ready) {
        return;
      }

      if (!areCamerasEqual(camera, lastCamera)) {
        drawPreview(camera, lastCamera);
      } else {
        drawTile();
      }
    }

    // debug draw call to measure performance
    // use full resolution buffers every frame
    // reproject every frame
    function drawFull(camera) {
      if (!ready) {
        return;
      }

      swapGBuffer();
      swapReprojectBuffer();

      if (sampleCount === 0) {
        reprojectPass.setPreviousCamera(lastCamera);
      }

      if (!areCamerasEqual(camera, lastCamera)) {
        sampleCount = 0;
        rayTracePass.setCamera(camera);
        gBufferPass.setCamera(camera);
        lastCamera.copy(camera);
        clearBuffer(hdrBuffer);
      } else {
        sampleCount++;
      }

      updateSeed(screenWidth, screenHeight, true);

      renderGBuffer();

      rayTracePass.bindTextures();
      addSampleToBuffer(hdrBuffer, screenWidth, screenHeight);

      reprojectBuffer.bind();
      gl.viewport(0, 0, screenWidth, screenHeight);
      reprojectPass.draw({
        blendAmount: 1.0,
        light: hdrBuffer.color[0],
        lightScale: fullscreenScale,
        position: gBuffer.color[gBufferPass.outputLocs.position],
        previousLight: lastToneMappedTexture,
        previousLightScale: lastToneMappedScale,
        previousPosition: gBufferBack.color[gBufferPass.outputLocs.position],
      });
      reprojectBuffer.unbind();

      toneMapToScreen(reprojectBuffer.color[0], fullscreenScale);
    }

    return {
      draw,
      drawFull,
      restartTimer: tileRender.reset,
      setSize,
      getTotalSamplesRendered() {
        return sampleCount;
      },
      set onSampleRendered(cb) {
        sampleRenderedCallback = cb;
      },
      get onSampleRendered() {
        return sampleRenderedCallback;
      }
    };
  }

  const glRequiredExtensions = [
    'EXT_color_buffer_float', // enables rendering to float buffers
    'EXT_float_blend',
  ];

  const glOptionalExtensions = [
    'OES_texture_float_linear', // enables gl.LINEAR texture filtering for float textures,
  ];

  function RayTracingRenderer(params = {}) {
    const canvas = params.canvas || document.createElement('canvas');

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      depth: true,
      stencil: false,
      antialias: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: true
    });

    loadExtensions(gl, glRequiredExtensions);
    const optionalExtensions = loadExtensions(gl, glOptionalExtensions);

    let pipeline = null;
    const size = new THREE$1.Vector2();
    let pixelRatio = 1;

    const module = {
      bounces: 2,
      domElement: canvas,
      maxHardwareUsage: false,
      needsUpdate: true,
      onSampleRendered: null,
      renderWhenOffFocus: true,
      renderToScreen: true,
      toneMapping: THREE$1.LinearToneMapping,
      toneMappingExposure: 1,
      toneMappingWhitePoint: 1,
    };

    function initScene(scene) {
      scene.updateMatrixWorld();

      const toneMappingParams = {
        exposure: module.toneMappingExposure,
        whitePoint: module.toneMappingWhitePoint,
        toneMapping: module.toneMapping
      };

      const bounces = module.bounces;

      pipeline = makeRenderingPipeline({gl, optionalExtensions, scene, toneMappingParams, bounces});

      pipeline.onSampleRendered = (...args) => {
        if (module.onSampleRendered) {
          module.onSampleRendered(...args);
        }
      };

      module.setSize(size.width, size.height);
      module.needsUpdate = false;
    }

    function restartTimer() {
      if (pipeline) {
        pipeline.restartTimer();
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

      if (pipeline) {
        pipeline.setSize(size.width * pixelRatio, size.height * pixelRatio);
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

    module.getTotalSamplesRendered = () => {
      if (pipeline) {
        return pipeline.getTotalSamplesRendered();
      }
    };

    module.sendToScreen = () => {
      if (pipeline) {
        pipeline.hdrBufferToScreen();
      }
    };

    let lastFocus = false;
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
        if(module.maxHardwareUsage) {
          // render new sample for the entire screen
          pipeline.drawFull(camera);
        } else {
          // render new sample for a tiled subset of the screen
          pipeline.draw(camera);
        }

      } else {
        pipeline.drawOffscreenTile(camera);
      }
    };

    // Assume module.render is called using requestAnimationFrame.
    // This means that when the user is on a different browser tab, module.render won't be called.
    // Since the timer should not measure time when module.render is inactive,
    // the timer should be reset when the user switches browser tabs
    document.addEventListener('visibilitychange', restartTimer);

    module.dispose = () => {
      document.removeEventListener('visibilitychange', restartTimer);
      pipeline = null;
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

  if (window.THREE) {
    /* global THREE */
    THREE.LensCamera = LensCamera;
    THREE.SoftDirectionalLight = SoftDirectionalLight;
    THREE.EnvironmentLight = EnvironmentLight;
    THREE.RayTracingMaterial = RayTracingMaterial;
    THREE.RayTracingRenderer = RayTracingRenderer;
    THREE.ThickMaterial = ThickMaterial;
    THREE.ThinMaterial = ThinMaterial;
  }

  exports.EnvironmentLight = EnvironmentLight;
  exports.LensCamera = LensCamera;
  exports.RayTracingMaterial = RayTracingMaterial;
  exports.RayTracingRenderer = RayTracingRenderer;
  exports.SoftDirectionalLight = SoftDirectionalLight;
  exports.constants = constants;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
