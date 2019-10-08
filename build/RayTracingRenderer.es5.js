(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('three')) :
  typeof define === 'function' && define.amd ? define(['exports', 'three'], factory) :
  (global = global || self, factory(global.RayTracingRenderer = {}, global.THREE));
}(this, function (exports, THREE$1) { 'use strict';

  var ThinMaterial = 1;
  var ThickMaterial = 2;
  var ShadowCatcherMaterial = 3;

  var constants = /*#__PURE__*/Object.freeze({
    ThinMaterial: ThinMaterial,
    ThickMaterial: ThickMaterial,
    ShadowCatcherMaterial: ShadowCatcherMaterial
  });

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function");
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        writable: true,
        configurable: true
      }
    });
    if (superClass) _setPrototypeOf(subClass, superClass);
  }

  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
      return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _getPrototypeOf(o);
  }

  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };

    return _setPrototypeOf(o, p);
  }

  function _assertThisInitialized(self) {
    if (self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return self;
  }

  function _possibleConstructorReturn(self, call) {
    if (call && (typeof call === "object" || typeof call === "function")) {
      return call;
    }

    return _assertThisInitialized(self);
  }

  function _superPropBase(object, property) {
    while (!Object.prototype.hasOwnProperty.call(object, property)) {
      object = _getPrototypeOf(object);
      if (object === null) break;
    }

    return object;
  }

  function _get(target, property, receiver) {
    if (typeof Reflect !== "undefined" && Reflect.get) {
      _get = Reflect.get;
    } else {
      _get = function _get(target, property, receiver) {
        var base = _superPropBase(target, property);

        if (!base) return;
        var desc = Object.getOwnPropertyDescriptor(base, property);

        if (desc.get) {
          return desc.get.call(receiver);
        }

        return desc.value;
      };
    }

    return _get(target, property, receiver || target);
  }

  function _slicedToArray(arr, i) {
    return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    }
  }

  function _arrayWithHoles(arr) {
    if (Array.isArray(arr)) return arr;
  }

  function _iterableToArray(iter) {
    if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
  }

  function _iterableToArrayLimit(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"] != null) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
  }

  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance");
  }

  var LensCamera =
  /*#__PURE__*/
  function (_PerspectiveCamera) {
    _inherits(LensCamera, _PerspectiveCamera);

    function LensCamera() {
      var _getPrototypeOf2;

      var _this;

      _classCallCheck(this, LensCamera);

      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      _this = _possibleConstructorReturn(this, (_getPrototypeOf2 = _getPrototypeOf(LensCamera)).call.apply(_getPrototypeOf2, [this].concat(args)));
      _this.aperture = 0.01;
      return _this;
    }

    _createClass(LensCamera, [{
      key: "copy",
      value: function copy(source, recursive) {
        _get(_getPrototypeOf(LensCamera.prototype), "copy", this).call(this, source, recursive);

        this.aperture = source.aperture;
      }
    }]);

    return LensCamera;
  }(THREE$1.PerspectiveCamera);

  var SoftDirectionalLight =
  /*#__PURE__*/
  function (_DirectionalLight) {
    _inherits(SoftDirectionalLight, _DirectionalLight);

    function SoftDirectionalLight() {
      var _getPrototypeOf2;

      var _this;

      _classCallCheck(this, SoftDirectionalLight);

      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      _this = _possibleConstructorReturn(this, (_getPrototypeOf2 = _getPrototypeOf(SoftDirectionalLight)).call.apply(_getPrototypeOf2, [this].concat(args)));
      _this.softness = 0.0;
      return _this;
    }

    _createClass(SoftDirectionalLight, [{
      key: "copy",
      value: function copy(source) {
        _get(_getPrototypeOf(SoftDirectionalLight.prototype), "copy", this).call(this, source);

        this.softness = source.softness;
      }
    }]);

    return SoftDirectionalLight;
  }(THREE$1.DirectionalLight);

  var EnvironmentLight =
  /*#__PURE__*/
  function (_Light) {
    _inherits(EnvironmentLight, _Light);

    function EnvironmentLight(map) {
      var _getPrototypeOf2;

      var _this;

      _classCallCheck(this, EnvironmentLight);

      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      _this = _possibleConstructorReturn(this, (_getPrototypeOf2 = _getPrototypeOf(EnvironmentLight)).call.apply(_getPrototypeOf2, [this].concat(args)));
      _this.map = map;
      return _this;
    }

    _createClass(EnvironmentLight, [{
      key: "copy",
      value: function copy(source) {
        _get(_getPrototypeOf(EnvironmentLight.prototype), "copy", this).call(this, source);

        this.map = source.map;
      }
    }]);

    return EnvironmentLight;
  }(THREE$1.Light);

  var RayTracingMaterial =
  /*#__PURE__*/
  function (_MeshStandardMaterial) {
    _inherits(RayTracingMaterial, _MeshStandardMaterial);

    function RayTracingMaterial() {
      var _getPrototypeOf2;

      var _this;

      _classCallCheck(this, RayTracingMaterial);

      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      _this = _possibleConstructorReturn(this, (_getPrototypeOf2 = _getPrototypeOf(RayTracingMaterial)).call.apply(_getPrototypeOf2, [this].concat(args)));
      _this.solid = false;
      _this.shadowCatcher = false;
      return _this;
    }

    _createClass(RayTracingMaterial, [{
      key: "copy",
      value: function copy(source) {
        _get(_getPrototypeOf(RayTracingMaterial.prototype), "copy", this).call(this, source);

        this.solid = source.solid;
        this.shadowCatcher = source.shadowCatcher;
      }
    }]);

    return RayTracingMaterial;
  }(THREE$1.MeshStandardMaterial);

  function loadExtensions(gl, extensions) {
    var supported = {};
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = extensions[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var name = _step.value;
        supported[name] = gl.getExtension(name);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator["return"] != null) {
          _iterator["return"]();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    return supported;
  }
  function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if (success) {
      return shader;
    }

    var output = source.split('\n').map(function (x, i) {
      return "".concat(i + 1, ": ").concat(x);
    }).join('\n');
    console.log(output);
    throw gl.getShaderInfoLog(shader);
  }
  function createProgram(gl, vertexShader, fragmentShader, transformVaryings, transformBufferMode) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    if (transformVaryings) {
      gl.transformFeedbackVaryings(program, transformVaryings, transformBufferMode);
    }

    gl.linkProgram(program);
    gl.detachShader(program, vertexShader);
    gl.detachShader(program, fragmentShader);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);

    if (success) {
      return program;
    }

    throw gl.getProgramInfoLog(program);
  }
  function getUniforms(gl, program) {
    var uniforms = {};
    var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

    for (var i = 0; i < count; i++) {
      var _gl$getActiveUniform = gl.getActiveUniform(program, i),
          name = _gl$getActiveUniform.name;

      var location = gl.getUniformLocation(program, name);

      if (location) {
        uniforms[name] = location;
      }
    }

    return uniforms;
  }
  function makeUniformBuffer(gl, program, blockName) {
    var blockIndex = gl.getUniformBlockIndex(program, blockName);
    var blockSize = gl.getActiveUniformBlockParameter(program, blockIndex, gl.UNIFORM_BLOCK_DATA_SIZE);
    var uniforms = getUniformBlockInfo(gl, program, blockIndex);
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
    gl.bufferData(gl.UNIFORM_BUFFER, blockSize, gl.STATIC_DRAW);
    var data = new DataView(new ArrayBuffer(blockSize));

    function set(name, value) {
      if (!uniforms[name]) {
        // console.warn('No uniform property with name ', name);
        return;
      }

      var _uniforms$name = uniforms[name],
          type = _uniforms$name.type,
          size = _uniforms$name.size,
          offset = _uniforms$name.offset,
          stride = _uniforms$name.stride;

      switch (type) {
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

    return {
      set: set,
      bind: bind
    };
  }

  function getUniformBlockInfo(gl, program, blockIndex) {
    var indices = gl.getActiveUniformBlockParameter(program, blockIndex, gl.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES);
    var offset = gl.getActiveUniforms(program, indices, gl.UNIFORM_OFFSET);
    var stride = gl.getActiveUniforms(program, indices, gl.UNIFORM_ARRAY_STRIDE);
    var uniforms = {};

    for (var i = 0; i < indices.length; i++) {
      var _gl$getActiveUniform2 = gl.getActiveUniform(program, indices[i]),
          name = _gl$getActiveUniform2.name,
          type = _gl$getActiveUniform2.type,
          size = _gl$getActiveUniform2.size;

      uniforms[name] = {
        type: type,
        size: size,
        offset: offset[i],
        stride: stride[i]
      };
    }

    return uniforms;
  }

  function setData(dataView, setter, size, offset, stride, components, value) {
    var l = Math.min(value.length / components, size);

    for (var i = 0; i < l; i++) {
      for (var k = 0; k < components; k++) {
        dataView[setter](offset + i * stride + k * 4, value[components * i + k], true);
      }
    }
  }

  function vertString (params) {
    return "#version 300 es\n\nlayout(location = 0) in vec2 position;\nout vec2 vCoord;\n\nvoid main() {\n  vCoord = position;\n  gl_Position = vec4(2. * position - 1., 0, 1);\n}\n\n";
  }

  function makeFullscreenQuad(gl) {
    // TODO: use VAOs
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW); // vertex shader should set layout(location = 0) on position attribute

    var posLoc = 0;
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertString());

    function draw() {
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    return {
      draw: draw,
      vertexShader: vertexShader
    };
  }

  // Manually performs linear filtering if the extension OES_texture_float_linear is not supported
  function textureLinear (params) {
    return "\n\n  vec4 textureLinear(sampler2D map, vec2 uv) {\n    #ifdef OES_texture_float_linear\n      return texture(map, uv);\n    #else\n      vec2 size = vec2(textureSize(map, 0));\n      vec2 texelSize = 1.0 / size;\n\n      uv = uv * size - 0.5;\n      vec2 f = fract(uv);\n      uv = floor(uv) + 0.5;\n\n      vec4 s1 = texture(map, (uv + vec2(0, 0)) * texelSize);\n      vec4 s2 = texture(map, (uv + vec2(1, 0)) * texelSize);\n      vec4 s3 = texture(map, (uv + vec2(0, 1)) * texelSize);\n      vec4 s4 = texture(map, (uv + vec2(1, 1)) * texelSize);\n\n      return mix(mix(s1, s2, f.x), mix(s3, s4, f.x), f.y);\n    #endif\n  }\n";
  }

  function intersect (params) {
    return "\n\nuniform highp isampler2D indices;\nuniform sampler2D positions;\nuniform sampler2D normals;\nuniform sampler2D uvs;\nuniform sampler2D bvh;\n\nuniform Materials {\n  vec4 colorAndMaterialType[NUM_MATERIALS];\n  vec4 roughnessMetalnessNormalScale[NUM_MATERIALS];\n\n  #if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS) || defined(NUM_PBR_MAPS)\n    ivec4 diffuseNormalRoughnessMetalnessMapIndex[NUM_MATERIALS];\n  #endif\n\n  #if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS)\n    vec4 diffuseNormalMapSize[".concat(Math.max(params.NUM_DIFFUSE_MAPS, params.NUM_NORMAL_MAPS), "];\n  #endif\n\n  #if defined(NUM_PBR_MAPS)\n    vec2 pbrMapSize[NUM_PBR_MAPS];\n  #endif\n} materials;\n\n#ifdef NUM_DIFFUSE_MAPS\n  uniform mediump sampler2DArray diffuseMap;\n#endif\n\n#ifdef NUM_NORMAL_MAPS\n  uniform mediump sampler2DArray normalMap;\n#endif\n\n#ifdef NUM_PBR_MAPS\n  uniform mediump sampler2DArray pbrMap;\n#endif\n\nstruct Triangle {\n  vec3 p0;\n  vec3 p1;\n  vec3 p2;\n};\n\nvoid surfaceInteractionFromIntersection(inout SurfaceInteraction si, Triangle tri, vec3 barycentric, ivec3 index, vec3 faceNormal, int materialIndex) {\n  si.hit = true;\n  si.faceNormal = faceNormal;\n  si.position = barycentric.x * tri.p0 + barycentric.y * tri.p1 + barycentric.z * tri.p2;\n  ivec2 i0 = unpackTexel(index.x, VERTEX_COLUMNS);\n  ivec2 i1 = unpackTexel(index.y, VERTEX_COLUMNS);\n  ivec2 i2 = unpackTexel(index.z, VERTEX_COLUMNS);\n\n  vec3 n0 = texelFetch(normals, i0, 0).xyz;\n  vec3 n1 = texelFetch(normals, i1, 0).xyz;\n  vec3 n2 = texelFetch(normals, i2, 0).xyz;\n  si.normal = normalize(barycentric.x * n0 + barycentric.y * n1 + barycentric.z * n2);\n\n  si.color = materials.colorAndMaterialType[materialIndex].xyz;\n  si.roughness = materials.roughnessMetalnessNormalScale[materialIndex].x;\n  si.metalness = materials.roughnessMetalnessNormalScale[materialIndex].y;\n\n  si.materialType = int(materials.colorAndMaterialType[materialIndex].w);\n\n  #if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS) || defined(NUM_PBR_MAPS)\n    vec2 uv0 = texelFetch(uvs, i0, 0).xy;\n    vec2 uv1 = texelFetch(uvs, i1, 0).xy;\n    vec2 uv2 = texelFetch(uvs, i2, 0).xy;\n    vec2 uv = fract(barycentric.x * uv0 + barycentric.y * uv1 + barycentric.z * uv2);\n  #endif\n\n  #ifdef NUM_DIFFUSE_MAPS\n    int diffuseMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].x;\n    if (diffuseMapIndex >= 0) {\n      si.color *= texture(diffuseMap, vec3(uv * materials.diffuseNormalMapSize[diffuseMapIndex].xy, diffuseMapIndex)).rgb;\n    }\n  #endif\n\n  #ifdef NUM_NORMAL_MAPS\n    int normalMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].y;\n    if (normalMapIndex >= 0) {\n      vec2 duv02 = uv0 - uv2;\n      vec2 duv12 = uv1 - uv2;\n      vec3 dp02 = tri.p0 - tri.p2;\n      vec3 dp12 = tri.p1 - tri.p2;\n\n      // Method One\n      // http://www.pbr-book.org/3ed-2018/Shapes/Triangle_Meshes.html#fragment-Computetrianglepartialderivatives-0\n      // Compute tangent vectors relative to the face normal. These vectors won't necessarily be orthogonal to the smoothed normal\n      // This means the TBN matrix won't be orthogonal which is technically incorrect.\n      // This is Three.js's method (https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderChunk/normalmap_pars_fragment.glsl.js)\n      // --------------\n      // float scale = sign(duv02.x * duv12.y - duv02.y * duv12.x);\n      // vec3 dpdu = normalize((duv12.y * dp02 - duv02.y * dp12) * scale);\n      // vec3 dpdv = normalize((-duv12.x * dp02 + duv02.x * dp12) * scale);\n\n      // Method Two\n      // Compute tangent vectors as in Method One but apply Gram-Schmidt process to make vectors orthogonal to smooth normal\n      // This might inadvertently flip coordinate space orientation\n      // --------------\n      // float scale = sign(duv02.x * duv12.y - duv02.y * duv12.x);\n      // vec3 dpdu = normalize((duv12.y * dp02 - duv02.y * dp12) * scale);\n      // dpdu = (dpdu - dot(dpdu, si.normal) * si.normal); // Gram-Schmidt process\n      // vec3 dpdv = cross(si.normal, dpdu) * scale;\n\n      // Method Three\n      // http://www.thetenthplanet.de/archives/1180\n      // Compute co-tangent and co-bitangent vectors\n      // These vectors are orthongal and maintain a consistent coordinate space\n      // --------------\n      vec3 dp12perp = cross(dp12, si.normal);\n      vec3 dp02perp = cross(si.normal, dp02);\n      vec3 dpdu = dp12perp * duv02.x + dp02perp * duv12.x;\n      vec3 dpdv = dp12perp * duv02.y + dp02perp * duv12.y;\n      float invmax = inversesqrt(max(dot(dpdu, dpdu), dot(dpdv, dpdv)));\n      dpdu *= invmax;\n      dpdv *= invmax;\n\n      vec3 n = 2.0 * texture(normalMap, vec3(uv * materials.diffuseNormalMapSize[normalMapIndex].zw, normalMapIndex)).rgb - 1.0;\n      n.xy *= materials.roughnessMetalnessNormalScale[materialIndex].zw;\n\n      mat3 tbn = mat3(dpdu, dpdv, si.normal);\n\n      si.normal = normalize(tbn * n);\n    }\n  #endif\n\n  #ifdef NUM_PBR_MAPS\n    int roughnessMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].z;\n    int metalnessMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].w;\n    if (roughnessMapIndex >= 0) {\n      si.roughness *= texture(pbrMap, vec3(uv * materials.pbrMapSize[roughnessMapIndex].xy, roughnessMapIndex)).g;\n    }\n    if (metalnessMapIndex >= 0) {\n      si.metalness *= texture(pbrMap, vec3(uv * materials.pbrMapSize[metalnessMapIndex].xy, metalnessMapIndex)).b;\n    }\n  #endif\n}\n\nstruct TriangleIntersect {\n  float t;\n  vec3 barycentric;\n};\n\n// Triangle-ray intersection\n// Faster than the classic M\xF6ller\u2013Trumbore intersection algorithm\n// http://www.pbr-book.org/3ed-2018/Shapes/Triangle_Meshes.html#TriangleIntersection\nTriangleIntersect intersectTriangle(Ray r, Triangle tri, int maxDim, vec3 shear) {\n  TriangleIntersect ti;\n  vec3 d = r.d;\n\n  // translate vertices based on ray origin\n  vec3 p0t = tri.p0 - r.o;\n  vec3 p1t = tri.p1 - r.o;\n  vec3 p2t = tri.p2 - r.o;\n\n  // permute components of triangle vertices\n  if (maxDim == 0) {\n    p0t = p0t.yzx;\n    p1t = p1t.yzx;\n    p2t = p2t.yzx;\n  } else if (maxDim == 1) {\n    p0t = p0t.zxy;\n    p1t = p1t.zxy;\n    p2t = p2t.zxy;\n  }\n\n  // apply shear transformation to translated vertex positions\n  p0t.xy += shear.xy * p0t.z;\n  p1t.xy += shear.xy * p1t.z;\n  p2t.xy += shear.xy * p2t.z;\n\n  // compute edge function coefficients\n  vec3 e = vec3(\n    p1t.x * p2t.y - p1t.y * p2t.x,\n    p2t.x * p0t.y - p2t.y * p0t.x,\n    p0t.x * p1t.y - p0t.y * p1t.x\n  );\n\n  // check if intersection is inside triangle\n  if (any(lessThan(e, vec3(0))) && any(greaterThan(e, vec3(0)))) {\n    return ti;\n  }\n\n  float det = e.x + e.y + e.z;\n\n  // not needed?\n  // if (det == 0.) {\n  //   return ti;\n  // }\n\n  p0t.z *= shear.z;\n  p1t.z *= shear.z;\n  p2t.z *= shear.z;\n  float tScaled = (e.x * p0t.z + e.y * p1t.z + e.z * p2t.z);\n\n  // not needed?\n  // if (sign(det) != sign(tScaled)) {\n  //   return ti;\n  // }\n\n  // check if closer intersection already exists\n  if (abs(tScaled) > abs(r.tMax * det)) {\n    return ti;\n  }\n\n  float invDet = 1. / det;\n  ti.t = tScaled * invDet;\n  ti.barycentric = e * invDet;\n\n  return ti;\n}\n\nstruct Box {\n  vec3 min;\n  vec3 max;\n};\n\n// Branchless ray/box intersection\n// https://tavianator.com/fast-branchless-raybounding-box-intersections/\nfloat intersectBox(Ray r, Box b) {\n  vec3 tBot = (b.min - r.o) * r.invD;\n  vec3 tTop = (b.max - r.o) * r.invD;\n  vec3 tNear = min(tBot, tTop);\n  vec3 tFar = max(tBot, tTop);\n  float t0 = max(tNear.x, max(tNear.y, tNear.z));\n  float t1 = min(tFar.x, min(tFar.y, tFar.z));\n\n  return (t0 > t1 || t0 > r.tMax) ? -1.0 : (t0 > 0.0 ? t0 : t1);\n}\n\nint maxDimension(vec3 v) {\n  return v.x > v.y ? (v.x > v.z ? 0 : 2) : (v.y > v.z ? 1 : 2);\n}\n\n// Traverse BVH, find closest triangle intersection, and return surface information\nSurfaceInteraction intersectScene(inout Ray ray) {\n  SurfaceInteraction si;\n\n  int maxDim = maxDimension(abs(ray.d));\n\n  // Permute space so that the z dimension is the one where the absolute value of the ray's direction is largest.\n  // Then create a shear transformation that aligns ray direction with the +z axis\n  vec3 shear;\n  if (maxDim == 0) {\n    shear = vec3(-ray.d.y, -ray.d.z, 1.0) * ray.invD.x;\n  } else if (maxDim == 1) {\n    shear = vec3(-ray.d.z, -ray.d.x, 1.0) * ray.invD.y;\n  } else {\n    shear = vec3(-ray.d.x, -ray.d.y, 1.0) * ray.invD.z;\n  }\n\n  int nodesToVisit[STACK_SIZE];\n  int stack = 0;\n\n  nodesToVisit[0] = 0;\n\n  while(stack >= 0) {\n    int i = nodesToVisit[stack--];\n\n    vec4 r1 = fetchData(bvh, i, BVH_COLUMNS);\n    vec4 r2 = fetchData(bvh, i + 1, BVH_COLUMNS);\n\n    int splitAxisOrNumPrimitives = floatBitsToInt(r1.w);\n\n    if (splitAxisOrNumPrimitives >= 0) {\n      // Intersection is a bounding box. Test for box intersection and keep traversing BVH\n      int splitAxis = splitAxisOrNumPrimitives;\n\n      Box bbox = Box(r1.xyz, r2.xyz);\n\n      if (intersectBox(ray, bbox) > 0.0) {\n        // traverse near node to ray first, and far node to ray last\n        if (ray.d[splitAxis] > 0.0) {\n          nodesToVisit[++stack] = floatBitsToInt(r2.w);\n          nodesToVisit[++stack] = i + 2;\n        } else {\n          nodesToVisit[++stack] = i + 2;\n          nodesToVisit[++stack] = floatBitsToInt(r2.w);\n        }\n      }\n    } else {\n      ivec3 index = floatBitsToInt(r1.xyz);\n      Triangle tri = Triangle(\n        fetchData(positions, index.x, VERTEX_COLUMNS).xyz,\n        fetchData(positions, index.y, VERTEX_COLUMNS).xyz,\n        fetchData(positions, index.z, VERTEX_COLUMNS).xyz\n      );\n      TriangleIntersect hit = intersectTriangle(ray, tri, maxDim, shear);\n\n      if (hit.t > 0.0) {\n        ray.tMax = hit.t;\n        int materialIndex = floatBitsToInt(r2.w);\n        vec3 faceNormal = r2.xyz;\n        surfaceInteractionFromIntersection(si, tri, hit.barycentric, index, faceNormal, materialIndex);\n      }\n    }\n  }\n\n  // Values must be clamped outside of intersection loop. Clamping inside the loop produces incorrect numbers on some devices.\n  si.roughness = clamp(si.roughness, 0.03, 1.0);\n  si.metalness = clamp(si.metalness, 0.0, 1.0);\n\n  return si;\n}\n\nbool intersectSceneShadow(inout Ray ray) {\n  int maxDim = maxDimension(abs(ray.d));\n\n  // Permute space so that the z dimension is the one where the absolute value of the ray's direction is largest.\n  // Then create a shear transformation that aligns ray direction with the +z axis\n  vec3 shear;\n  if (maxDim == 0) {\n    shear = vec3(-ray.d.y, -ray.d.z, 1.0) * ray.invD.x;\n  } else if (maxDim == 1) {\n    shear = vec3(-ray.d.z, -ray.d.x, 1.0) * ray.invD.y;\n  } else {\n    shear = vec3(-ray.d.x, -ray.d.y, 1.0) * ray.invD.z;\n  }\n\n  int nodesToVisit[STACK_SIZE];\n  int stack = 0;\n\n  nodesToVisit[0] = 0;\n\n  while(stack >= 0) {\n    int i = nodesToVisit[stack--];\n\n    vec4 r1 = fetchData(bvh, i, BVH_COLUMNS);\n    vec4 r2 = fetchData(bvh, i + 1, BVH_COLUMNS);\n\n    int splitAxisOrNumPrimitives = floatBitsToInt(r1.w);\n\n    if (splitAxisOrNumPrimitives >= 0) {\n      int splitAxis = splitAxisOrNumPrimitives;\n\n      Box bbox = Box(r1.xyz, r2.xyz);\n\n      if (intersectBox(ray, bbox) > 0.0) {\n        if (ray.d[splitAxis] > 0.0) {\n          nodesToVisit[++stack] = floatBitsToInt(r2.w);\n          nodesToVisit[++stack] = i + 2;\n        } else {\n          nodesToVisit[++stack] = i + 2;\n          nodesToVisit[++stack] = floatBitsToInt(r2.w);\n        }\n      }\n    } else {\n      ivec3 index = floatBitsToInt(r1.xyz);\n      Triangle tri = Triangle(\n        fetchData(positions, index.x, VERTEX_COLUMNS).xyz,\n        fetchData(positions, index.y, VERTEX_COLUMNS).xyz,\n        fetchData(positions, index.z, VERTEX_COLUMNS).xyz\n      );\n\n      if (intersectTriangle(ray, tri, maxDim, shear).t > 0.0) {\n        return true;\n      }\n    }\n  }\n\n  return false;\n}\n");
  }

  function random (params) {
    return "\n\n// Noise texture used to generate a different random number for each pixel.\n// We use blue noise in particular, but any type of noise will work.\nuniform sampler2D noise;\n\nuniform float stratifiedSamples[SAMPLING_DIMENSIONS];\nuniform float strataSize;\nuniform float useStratifiedSampling;\n\n// Every time we call randomSample() in the shader, and for every call to render,\n// we want that specific bit of the shader to fetch a sample from the same position in stratifiedSamples\n// This allows us to use stratified sampling for each random variable in our path tracing\nint sampleIndex = 0;\n\nconst highp float maxUint = 1.0 / 4294967295.0;\n\nfloat pixelSeed;\nhighp uint randState;\n\n// simple integer hashing function\n// https://en.wikipedia.org/wiki/Xorshift\nuint xorshift(uint x) {\n  x ^= x << 13u;\n  x ^= x >> 17u;\n  x ^= x << 5u;\n  return x;\n}\n\nvoid initRandom() {\n  vec2 noiseSize = vec2(textureSize(noise, 0));\n\n  // tile the small noise texture across the entire screen\n  pixelSeed = texture(noise, vCoord / (pixelSize * noiseSize)).r;\n\n  // white noise used if stratified sampling is disabled\n  // produces more balanced path tracing for 1 sample-per-pixel renders\n  randState = xorshift(xorshift(floatBitsToUint(vCoord.x)) * xorshift(floatBitsToUint(vCoord.y)));\n}\n\nfloat randomSample() {\n  randState = xorshift(randState);\n\n  float stratifiedSample = stratifiedSamples[sampleIndex++];\n\n  float random = mix(\n    float(randState) * maxUint, // white noise\n    fract((stratifiedSample + pixelSeed) * strataSize), // blue noise + stratified samples\n    useStratifiedSampling\n  );\n\n  // transform random number between [0, 1] to (0, 1)\n  return EPS + (1.0 - 2.0 * EPS) * random;\n}\n\nvec2 randomSampleVec2() {\n  return vec2(randomSample(), randomSample());\n}\n";
  }

  // Sample the environment map using a cumulative distribution function as described in
  // http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Sampling_Light_Sources.html#InfiniteAreaLights
  function envmap (params) {
    return "\n\nuniform sampler2D envmap;\nuniform sampler2D envmapDistribution;\n\nvec2 cartesianToEquirect(vec3 pointOnSphere) {\n  float phi = mod(atan(-pointOnSphere.z, -pointOnSphere.x), TWOPI);\n  float theta = acos(pointOnSphere.y);\n  return vec2(phi * 0.5 * INVPI, theta * INVPI);\n}\n\nfloat getEnvmapV(float u, out int vOffset, out float pdf) {\n  ivec2 size = textureSize(envmap, 0);\n\n  int left = 0;\n  int right = size.y + 1; // cdf length is the length of the envmap + 1\n  while (left < right) {\n    int mid = (left + right) >> 1;\n    float s = texelFetch(envmapDistribution, ivec2(0, mid), 0).x;\n    if (s <= u) {\n      left = mid + 1;\n    } else {\n      right = mid;\n    }\n  }\n  vOffset = left - 1;\n\n  // x channel is cumulative distribution of envmap luminance\n  // y channel is partial probability density of envmap luminance\n  vec2 s0 = texelFetch(envmapDistribution, ivec2(0, vOffset), 0).xy;\n  vec2 s1 = texelFetch(envmapDistribution, ivec2(0, vOffset + 1), 0).xy;\n\n  pdf = s0.y;\n\n  return (float(vOffset) +  (u - s0.x) / (s1.x - s0.x)) / float(size.y);\n}\n\nfloat getEnvmapU(float u, int vOffset, out float pdf) {\n  ivec2 size = textureSize(envmap, 0);\n\n  int left = 0;\n  int right = size.x + 1; // cdf length is the length of the envmap + 1\n  while (left < right) {\n    int mid = (left + right) >> 1;\n    float s = texelFetch(envmapDistribution, ivec2(1 + mid, vOffset), 0).x;\n    if (s <= u) {\n      left = mid + 1;\n    } else {\n      right = mid;\n    }\n  }\n  int uOffset = left - 1;\n\n  // x channel is cumulative distribution of envmap luminance\n  // y channel is partial probability density of envmap luminance\n  vec2 s0 = texelFetch(envmapDistribution, ivec2(1 + uOffset, vOffset), 0).xy;\n  vec2 s1 = texelFetch(envmapDistribution, ivec2(1 + uOffset + 1, vOffset), 0).xy;\n\n  pdf = s0.y;\n\n  return (float(uOffset) + (u - s0.x) / (s1.x - s0.x)) / float(size.x);\n}\n\n// Perform two binary searches to find light direction.\nvec3 sampleEnvmap(vec2 random, out vec2 uv, out float pdf) {\n  vec2 partialPdf;\n  int vOffset;\n\n  uv.y = getEnvmapV(random.x, vOffset, partialPdf.y);\n  uv.x = getEnvmapU(random.y, vOffset, partialPdf.x);\n\n  float phi = uv.x * TWOPI;\n  float theta = uv.y * PI;\n  float cosTheta = cos(theta);\n  float sinTheta = sin(theta);\n  float cosPhi = cos(phi);\n  float sinPhi = sin(phi);\n\n  vec3 dir = vec3(-sinTheta * cosPhi, cosTheta, -sinTheta * sinPhi);\n\n  pdf = partialPdf.x * partialPdf.y * INVPI2 / (2.0 * sinTheta);\n\n  return dir;\n}\n\nfloat envmapPdf(vec2 uv) {\n  vec2 size = vec2(textureSize(envmap, 0));\n\n  float sinTheta = sin(uv.y * PI);\n\n  uv *= size;\n\n  float partialX = texelFetch(envmapDistribution, ivec2(1.0 + uv.x, uv.y), 0).y;\n  float partialY = texelFetch(envmapDistribution, ivec2(0, uv.y), 0).y;\n\n  return partialX * partialY * INVPI2 / (2.0 * sinTheta);\n}\n\nvec3 sampleEnvmapFromDirection(vec3 d) {\n  vec2 uv = cartesianToEquirect(d);\n  return textureLinear(envmap, uv).rgb;\n}\n\n";
  }

  function bsdf (params) {
    return "\n\n// Computes the exact value of the Fresnel factor\n// https://seblagarde.wordpress.com/2013/04/29/memo-on-fresnel-equations/\nfloat fresnel(float cosTheta, float eta, float invEta) {\n  eta = cosTheta > 0.0 ? eta : invEta;\n  cosTheta = abs(cosTheta);\n\n  float gSquared = eta * eta + cosTheta * cosTheta - 1.0;\n\n  if (gSquared < 0.0) {\n    return 1.0;\n  }\n\n  float g = sqrt(gSquared);\n\n  float a = (g - cosTheta) / (g + cosTheta);\n  float b = (cosTheta * (g + cosTheta) - 1.0) / (cosTheta * (g - cosTheta) + 1.0);\n\n  return 0.5 * a * a * (1.0 + b * b);\n}\n\nfloat fresnelSchlickWeight(float cosTheta) {\n  float w = 1.0 - cosTheta;\n  return (w * w) * (w * w) * w;\n}\n\n// Computes Schlick's approximation of the Fresnel factor\n// Assumes ray is moving from a less dense to a more dense medium\nfloat fresnelSchlick(float cosTheta, float r0) {\n  return mix(fresnelSchlickWeight(cosTheta), 1.0, r0);\n}\n\n// Computes Schlick's approximation of Fresnel factor\n// Accounts for total internal reflection if ray is moving from a more dense to a less dense medium\nfloat fresnelSchlickTIR(float cosTheta, float r0, float ni) {\n\n  // moving from a more dense to a less dense medium\n  if (cosTheta < 0.0) {\n    float inv_eta = ni;\n    float SinT2 = inv_eta * inv_eta * (1.0f - cosTheta * cosTheta);\n    if (SinT2 > 1.0) {\n        return 1.0; // total internal reflection\n    }\n    cosTheta = sqrt(1.0f - SinT2);\n  }\n\n  return mix(fresnelSchlickWeight(cosTheta), 1.0, r0);\n}\n\nfloat trowbridgeReitzD(float cosTheta, float alpha2) {\n  float e = cosTheta * cosTheta * (alpha2 - 1.0) + 1.0;\n  return alpha2 / (PI * e * e);\n}\n\nfloat trowbridgeReitzLambda(float cosTheta, float alpha2) {\n  float cos2Theta = cosTheta * cosTheta;\n  float tan2Theta = (1.0 - cos2Theta) / cos2Theta;\n  return 0.5 * (-1.0 + sqrt(1.0 + alpha2 * tan2Theta));\n}\n\n// An implementation of Disney's principled BRDF\n// https://disney-animation.s3.amazonaws.com/library/s2012_pbs_disney_brdf_notes_v2.pdf\nvec3 materialBrdf(SurfaceInteraction si, vec3 viewDir, vec3 lightDir, float cosThetaL, float diffuseWeight, out float pdf) {\n  vec3 halfVector = normalize(viewDir + lightDir);\n\n  cosThetaL = abs(cosThetaL);\n  float cosThetaV = abs(dot(si.normal, viewDir));\n  float cosThetaH = abs(dot(si.normal, halfVector));\n  float cosThetaD = abs(dot(lightDir, halfVector));\n\n  float alpha2 = (si.roughness * si.roughness) * (si.roughness * si.roughness);\n\n  float F = fresnelSchlick(cosThetaD, mix(R0, 0.6, si.metalness));\n  float D = trowbridgeReitzD(cosThetaH, alpha2);\n\n  float roughnessRemapped = 0.5 + 0.5 * si.roughness;\n  float alpha2Remapped = (roughnessRemapped * roughnessRemapped) * (roughnessRemapped * roughnessRemapped);\n\n  float G = 1.0 / (1.0 + trowbridgeReitzLambda(cosThetaV, alpha2Remapped) + trowbridgeReitzLambda(cosThetaL, alpha2Remapped));\n\n  float specular = F * D * G / (4.0 * cosThetaV * cosThetaL);\n  float specularPdf = D * cosThetaH / (4.0 * cosThetaD);\n\n  float f = -0.5 + 2.0 * cosThetaD * cosThetaD * si.roughness;\n  float diffuse = diffuseWeight * INVPI * (1.0 + f * fresnelSchlickWeight(cosThetaL)) * (1.0 + f * fresnelSchlickWeight(cosThetaV));\n  float diffusePdf = cosThetaL * INVPI;\n\n  pdf = mix(0.5 * (specularPdf + diffusePdf), specularPdf, si.metalness);\n\n  return mix(si.color * diffuse + specular, si.color * specular, si.metalness);\n}\n\n";
  }

  function sample (params) {
    return "\n\n// https://graphics.pixar.com/library/OrthonormalB/paper.pdf\nmat3 orthonormalBasis(vec3 n) {\n  float zsign = n.z >= 0.0 ? 1.0 : -1.0;\n  float a = -1.0 / (zsign + n.z);\n  float b = n.x * n.y * a;\n  vec3 s = vec3(1.0 + zsign * n.x * n.x * a, zsign * b, -zsign * n.x);\n  vec3 t = vec3(b, zsign + n.y * n.y * a, -n.y);\n  return mat3(s, t, n);\n}\n\n// http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#SamplingaUnitDisk\nvec2 sampleCircle(vec2 p) {\n  p = 2.0 * p - 1.0;\n\n  bool greater = abs(p.x) > abs(p.y);\n\n  float r = greater ? p.x : p.y;\n  float theta = greater ? 0.25 * PI * p.y / p.x : PI * (0.5 - 0.25 * p.x / p.y);\n\n  return r * vec2(cos(theta), sin(theta));\n}\n\n// http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#Cosine-WeightedHemisphereSampling\nvec3 cosineSampleHemisphere(vec2 p) {\n  vec2 h = sampleCircle(p);\n  float z = sqrt(max(0.0, 1.0 - h.x * h.x - h.y * h.y));\n  return vec3(h, z);\n}\n\n\n// http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Sampling_Reflection_Functions.html#MicrofacetBxDFs\n// Instead of Beckmann distrubtion, we use the GTR2 (GGX) distrubtion as covered in Disney's Principled BRDF paper\nvec3 lightDirSpecular(vec3 faceNormal, vec3 viewDir, mat3 basis, float roughness, vec2 random) {\n  float phi = TWOPI * random.y;\n  float alpha = roughness * roughness;\n  float cosTheta = sqrt((1.0 - random.x) / (1.0 + (alpha * alpha - 1.0) * random.x));\n  float sinTheta = sqrt(1.0 - cosTheta * cosTheta);\n\n  vec3 halfVector = basis * sign(dot(faceNormal, viewDir)) * vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);\n\n  vec3 lightDir = reflect(-viewDir, halfVector);\n\n  return lightDir;\n}\n\nvec3 lightDirDiffuse(vec3 faceNormal, vec3 viewDir, mat3 basis, vec2 random) {\n  return basis * sign(dot(faceNormal, viewDir)) * cosineSampleHemisphere(random);\n}\n\nfloat powerHeuristic(float f, float g) {\n  return (f * f) / (f * f + g * g);\n}\n\n";
  }

  // Estimate the direct lighting integral using multiple importance sampling
  // http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Direct_Lighting.html#EstimatingtheDirectLightingIntegral
  function sampleMaterial (params) {
    return "\n\nvec3 importanceSampleLight(SurfaceInteraction si, vec3 viewDir, bool lastBounce, vec2 random) {\n  vec3 li;\n\n  float lightPdf;\n  vec2 uv;\n  vec3 lightDir = sampleEnvmap(random, uv, lightPdf);\n\n  float cosThetaL = dot(si.normal, lightDir);\n\n  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;\n  if (orientation < 0.0) {\n    return li;\n  }\n\n  float diffuseWeight = 1.0;\n  Ray ray;\n  initRay(ray, si.position + EPS * lightDir, lightDir);\n  if (intersectSceneShadow(ray)) {\n    if (lastBounce) {\n      diffuseWeight = 0.0;\n    } else {\n      return li;\n    }\n  }\n\n  vec3 irr = textureLinear(envmap, uv).xyz;\n\n  float scatteringPdf;\n  vec3 brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, diffuseWeight, scatteringPdf);\n\n  float weight = powerHeuristic(lightPdf, scatteringPdf);\n\n  li = brdf * irr * abs(cosThetaL) * weight / lightPdf;\n\n  return li;\n}\n\nvec3 importanceSampleMaterial(SurfaceInteraction si, vec3 viewDir, bool lastBounce, vec3 lightDir) {\n  vec3 li;\n\n  float cosThetaL = dot(si.normal, lightDir);\n\n  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;\n  if (orientation < 0.0) {\n    return li;\n  }\n\n  float diffuseWeight = 1.0;\n  Ray ray;\n  initRay(ray, si.position + EPS * lightDir, lightDir);\n  if (intersectSceneShadow(ray)) {\n    if (lastBounce) {\n      diffuseWeight = 0.0;\n    } else {\n      return li;\n    }\n  }\n\n  vec2 uv = cartesianToEquirect(lightDir);\n\n  float lightPdf = envmapPdf(uv);\n\n  vec3 irr = textureLinear(envmap, uv).rgb;\n\n  float scatteringPdf;\n  vec3 brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, diffuseWeight, scatteringPdf);\n\n  float weight = powerHeuristic(scatteringPdf, lightPdf);\n\n  li += brdf * irr * abs(cosThetaL) * weight / scatteringPdf;\n\n  return li;\n}\n\nvec3 sampleMaterial(SurfaceInteraction si, int bounce, inout Ray ray, inout vec3 beta, inout bool abort) {\n  mat3 basis = orthonormalBasis(si.normal);\n  vec3 viewDir = -ray.d;\n\n  vec2 diffuseOrSpecular = randomSampleVec2();\n\n  vec3 lightDir = diffuseOrSpecular.x < mix(0.5, 0.0, si.metalness) ?\n    lightDirDiffuse(si.faceNormal, viewDir, basis, randomSampleVec2()) :\n    lightDirSpecular(si.faceNormal, viewDir, basis, si.roughness, randomSampleVec2());\n\n  bool lastBounce = bounce == BOUNCES;\n\n  // Add path contribution\n  vec3 li = beta * (\n      importanceSampleLight(si, viewDir, lastBounce, randomSampleVec2()) +\n      importanceSampleMaterial(si, viewDir, lastBounce, lightDir)\n    );\n\n  // Get new path direction\n\n  lightDir = diffuseOrSpecular.y < mix(0.5, 0.0, si.metalness) ?\n    lightDirDiffuse(si.faceNormal, viewDir, basis, randomSampleVec2()) :\n    lightDirSpecular(si.faceNormal, viewDir, basis, si.roughness, randomSampleVec2());\n\n  float cosThetaL = dot(si.normal, lightDir);\n\n  float scatteringPdf;\n  vec3 brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, 1.0, scatteringPdf);\n\n  beta *= abs(cosThetaL) * brdf / scatteringPdf;\n\n  initRay(ray, si.position + EPS * lightDir, lightDir);\n\n  // If new ray direction is pointing into the surface,\n  // the light path is physically impossible and we terminate the path.\n  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;\n  abort = orientation < 0.0;\n\n  return li;\n}\n\n";
  }

  function sampleShadowCatcher (params) {
    return "\n\n#ifdef USE_SHADOW_CATCHER\n\nfloat importanceSampleLightShadowCatcher(SurfaceInteraction si, vec3 viewDir, vec2 random, inout float alpha) {\n  float li;\n\n  float lightPdf;\n  vec2 uv;\n  vec3 lightDir = sampleEnvmap(random, uv, lightPdf);\n\n  float cosThetaL = dot(si.normal, lightDir);\n\n  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;\n  if (orientation < 0.0) {\n    return li;\n  }\n\n  float occluded = 1.0;\n\n  Ray ray;\n  initRay(ray, si.position + EPS * lightDir, lightDir);\n  if (intersectSceneShadow(ray)) {\n    occluded = 0.0;\n  }\n\n  float irr = dot(luminance, textureLinear(envmap, uv).rgb);\n\n  // lambertian BRDF\n  float brdf = INVPI;\n  float scatteringPdf = abs(cosThetaL) * INVPI;\n\n  float weight = powerHeuristic(lightPdf, scatteringPdf);\n\n  float lightEq = irr * brdf * abs(cosThetaL) * weight / lightPdf;\n\n  alpha += lightEq;\n  li += occluded * lightEq;\n\n  return li;\n}\n\nfloat importanceSampleMaterialShadowCatcher(SurfaceInteraction si, vec3 viewDir, vec3 lightDir, inout float alpha) {\n  float li;\n\n  float cosThetaL = dot(si.normal, lightDir);\n\n  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;\n  if (orientation < 0.0) {\n    return li;\n  }\n\n  float occluded = 1.0;\n\n  Ray ray;\n  initRay(ray, si.position + EPS * lightDir, lightDir);\n  if (intersectSceneShadow(ray)) {\n    occluded = 0.0;\n  }\n\n  vec2 uv = cartesianToEquirect(lightDir);\n\n  float lightPdf = envmapPdf(uv);\n\n  float irr = dot(luminance, textureLinear(envmap, uv).rgb);\n\n  // lambertian BRDF\n  float brdf = INVPI;\n  float scatteringPdf = abs(cosThetaL) * INVPI;\n\n  float weight = powerHeuristic(scatteringPdf, lightPdf);\n\n  float lightEq = irr * brdf * abs(cosThetaL) * weight / scatteringPdf;\n\n  alpha += lightEq;\n  li += occluded * lightEq;\n\n  return li;\n}\n\nvec3 sampleShadowCatcher(SurfaceInteraction si, int bounce, inout Ray ray, inout vec3 beta, inout float alpha, inout vec3 prevLi, inout bool abort) {\n  mat3 basis = orthonormalBasis(si.normal);\n  vec3 viewDir = -ray.d;\n  vec3 color = sampleEnvmapFromDirection(-viewDir);\n\n  vec3 lightDir = lightDirDiffuse(si.faceNormal, viewDir, basis, randomSampleVec2());\n\n  float alphaBounce = 0.0;\n\n  // Add path contribution\n  vec3 li = beta * color * (\n      importanceSampleLightShadowCatcher(si, viewDir, randomSampleVec2(), alphaBounce) +\n      importanceSampleMaterialShadowCatcher(si, viewDir, lightDir, alphaBounce)\n    );\n\n  // alphaBounce contains the lighting of the shadow catcher *without* shadows\n  alphaBounce = alphaBounce == 0.0 ? 1.0 : alphaBounce;\n\n  // in post processing step, we divide by alpha to obtain the percentage of light relative to shadow for the shadow catcher\n  alpha *= alphaBounce;\n\n  // we only want the alpha division to affect the shadow catcher\n  // factor in alpha to the previous light, so that dividing by alpha with the previous light cancels out this contribution\n  prevLi *= alphaBounce;\n\n  // Get new path direction\n\n  lightDir = lightDirDiffuse(si.faceNormal, viewDir, basis, randomSampleVec2());\n\n  float cosThetaL = dot(si.normal, lightDir);\n\n  // lambertian brdf with terms cancelled\n  beta *= color;\n\n  initRay(ray, si.position + EPS * lightDir, lightDir);\n\n  // If new ray direction is pointing into the surface,\n  // the light path is physically impossible and we terminate the path.\n  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;\n  abort = orientation < 0.0;\n\n  // advance dimension index by unused stratified samples\n  const int usedSamples = 6;\n  sampleIndex += SAMPLES_PER_MATERIAL - usedSamples;\n\n  return li;\n}\n\n#endif\n";
  }

  function sampleGlass (params) {
    return "\n\n#ifdef USE_GLASS\n\nvec3 sampleGlassSpecular(SurfaceInteraction si, int bounce, inout Ray ray, inout vec3 beta) {\n  vec3 viewDir = -ray.d;\n  float cosTheta = dot(si.normal, viewDir);\n\n  float F = si.materialType == THIN_GLASS ?\n    fresnelSchlick(abs(cosTheta), R0) : // thin glass\n    fresnelSchlickTIR(cosTheta, R0, IOR); // thick glass\n\n  vec3 lightDir;\n\n  float reflectionOrRefraction = randomSample();\n\n  if (reflectionOrRefraction < F) {\n    lightDir = reflect(-viewDir, si.normal);\n  } else {\n    lightDir = si.materialType == THIN_GLASS ?\n      refract(-viewDir, sign(cosTheta) * si.normal, INV_IOR_THIN) : // thin glass\n      refract(-viewDir, sign(cosTheta) * si.normal, cosTheta < 0.0 ? IOR : INV_IOR); // thick glass\n    beta *= si.color;\n  }\n\n  initRay(ray, si.position + EPS * lightDir, lightDir);\n\n  // advance sample index by unused stratified samples\n  const int usedSamples = 1;\n  sampleIndex += SAMPLES_PER_MATERIAL - usedSamples;\n\n  return bounce == BOUNCES ? beta * sampleEnvmapFromDirection(lightDir) : vec3(0.0);\n}\n\n#endif\n\n";
  }

  function unrollLoop(indexName, start, limit, step, code) {
    var unrolled = "int ".concat(indexName, ";\n");

    for (var i = start; step > 0 && i < limit || step < 0 && i > limit; i += step) {
      unrolled += "".concat(indexName, " = ").concat(i, ";\n");
      unrolled += code;
    }

    return unrolled;
  }
  function addDefines(params) {
    var defines = '';

    for (var _i = 0, _Object$entries = Object.entries(params); _i < _Object$entries.length; _i++) {
      var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
          name = _Object$entries$_i[0],
          value = _Object$entries$_i[1];

      // don't define falsy values such as false, 0, and ''.
      // this adds support for #ifdef on falsy values
      if (value) {
        defines += "#define ".concat(name, " ").concat(value, "\n");
      }
    }

    return defines;
  }

  function fragString (params) {
    return "#version 300 es\n\nprecision mediump float;\nprecision mediump int;\n\n".concat(addDefines(params), "\n\n#define PI 3.14159265359\n#define TWOPI 6.28318530718\n#define INVPI 0.31830988618\n#define INVPI2 0.10132118364\n#define EPS 0.0005\n#define INF 1.0e999\n#define RAY_MAX_DISTANCE 9999.0\n\n#define STANDARD 0\n#define THIN_GLASS 1\n#define THICK_GLASS 2\n#define SHADOW_CATCHER 3\n\n#define SAMPLES_PER_MATERIAL 8\n\nconst float IOR = 1.5;\nconst float INV_IOR = 1.0 / IOR;\n\nconst float IOR_THIN = 1.015;\nconst float INV_IOR_THIN = 1.0 / IOR_THIN;\n\nconst float R0 = (1.0 - IOR) * (1.0 - IOR)  / ((1.0 + IOR) * (1.0 + IOR));\n\n// https://www.w3.org/WAI/GL/wiki/Relative_luminance\nconst vec3 luminance = vec3(0.2126, 0.7152, 0.0722);\n\nstruct Ray {\n  vec3 o;\n  vec3 d;\n  vec3 invD;\n  float tMax;\n};\n\nstruct SurfaceInteraction {\n  bool hit;\n  vec3 position;\n  vec3 normal; // smoothed normal from the three triangle vertices\n  vec3 faceNormal; // normal of the triangle\n  vec3 color;\n  float roughness;\n  float metalness;\n  int materialType;\n};\n\nstruct Camera {\n  mat4 transform;\n  float aspect;\n  float fov;\n  float focus;\n  float aperture;\n};\n\nuniform Camera camera;\nuniform vec2 pixelSize; // 1 / screenResolution\n\nin vec2 vCoord;\n\nout vec4 fragColor;\n\nvoid initRay(inout Ray ray, vec3 origin, vec3 direction) {\n  ray.o = origin;\n  ray.d = direction;\n  ray.invD = 1.0 / ray.d;\n  ray.tMax = RAY_MAX_DISTANCE;\n}\n\n// given the index from a 1D array, retrieve corresponding position from packed 2D texture\nivec2 unpackTexel(int i, int columnsLog2) {\n  ivec2 u;\n  u.y = i >> columnsLog2; // equivalent to (i / 2^columnsLog2)\n  u.x = i - (u.y << columnsLog2); // equivalent to (i % 2^columnsLog2)\n  return u;\n}\n\nvec4 fetchData(sampler2D s, int i, int columnsLog2) {\n  return texelFetch(s, unpackTexel(i, columnsLog2), 0);\n}\n\nivec4 fetchData(isampler2D s, int i, int columnsLog2) {\n  return texelFetch(s, unpackTexel(i, columnsLog2), 0);\n}\n\n").concat(textureLinear(), "\n").concat(intersect(params), "\n").concat(random(), "\n").concat(envmap(), "\n").concat(bsdf(), "\n").concat(sample(), "\n").concat(sampleMaterial(), "\n").concat(sampleGlass(), "\n").concat(sampleShadowCatcher(), "\n\nstruct Path {\n  Ray ray;\n  vec3 li;\n  float alpha;\n  vec3 beta;\n  bool specularBounce;\n  bool abort;\n};\n\nvoid bounce(inout Path path, int i) {\n  if (path.abort) {\n    return;\n  }\n\n  SurfaceInteraction si = intersectScene(path.ray);\n\n  if (!si.hit) {\n    if (path.specularBounce) {\n      path.li += path.beta * sampleEnvmapFromDirection(path.ray.d);\n    }\n\n    path.abort = true;\n  } else {\n    #ifdef USE_GLASS\n      if (si.materialType == THIN_GLASS || si.materialType == THICK_GLASS) {\n        path.li += sampleGlassSpecular(si, i, path.ray, path.beta);\n        path.specularBounce = true;\n      }\n    #endif\n    #ifdef USE_SHADOW_CATCHER\n      if (si.materialType == SHADOW_CATCHER) {\n        path.li += sampleShadowCatcher(si, i, path.ray, path.beta, path.alpha, path.li, path.abort);\n        path.specularBounce = false;\n      }\n    #endif\n    if (si.materialType == STANDARD) {\n      path.li += sampleMaterial(si, i, path.ray, path.beta, path.abort);\n      path.specularBounce = false;\n    }\n\n    // Russian Roulette sampling\n    if (i >= 2) {\n      float q = 1.0 - dot(path.beta, luminance);\n      if (randomSample() < q) {\n        path.abort = true;\n      }\n      path.beta /= 1.0 - q;\n    }\n  }\n}\n\n// Path tracing integrator as described in\n// http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Path_Tracing.html#\nvec4 integrator(inout Ray ray) {\n  Path path;\n  path.ray = ray;\n  path.li = vec3(0);\n  path.alpha = 1.0;\n  path.beta = vec3(1.0);\n  path.specularBounce = true;\n  path.abort = false;\n\n  // Manually unroll for loop.\n  // Some hardware fails to interate over a GLSL loop, so we provide this workaround\n\n  ").concat(unrollLoop('i', 1, params.BOUNCES + 1, 1, "\n  // equivelant to\n  // for (int i = 1; i < params.bounces + 1, i += 1)\n    bounce(path, i);\n  "), "\n\n  return vec4(path.li, path.alpha);\n}\n\nvoid main() {\n  initRandom();\n\n  vec2 vCoordAntiAlias = vCoord + pixelSize * (randomSampleVec2() - 0.5);\n\n  vec3 direction = normalize(vec3(vCoordAntiAlias - 0.5, -1.0) * vec3(camera.aspect, 1.0, camera.fov));\n\n  // Thin lens model with depth-of-field\n  // http://www.pbr-book.org/3ed-2018/Camera_Models/Projective_Camera_Models.html#TheThinLensModelandDepthofField\n  vec2 lensPoint = camera.aperture * sampleCircle(randomSampleVec2());\n  vec3 focusPoint = -direction * camera.focus / direction.z; // intersect ray direction with focus plane\n\n  vec3 origin = vec3(lensPoint, 0.0);\n  direction = normalize(focusPoint - origin);\n\n  origin = vec3(camera.transform * vec4(origin, 1.0));\n  direction = mat3(camera.transform) * direction;\n\n  Ray cam;\n  initRay(cam, origin, direction);\n\n  vec4 liAndAlpha = integrator(cam);\n\n  if (!(liAndAlpha.x < INF && liAndAlpha.x > -EPS)) {\n    liAndAlpha = vec4(0, 0, 0, 1);\n  }\n\n  fragColor = liAndAlpha;\n\n  // Stratified Sampling Sample Count Test\n  // ---------------\n  // Uncomment the following code\n  // Then observe the colors of the image\n  // If:\n  // * The resulting image is pure black\n  //   Extra samples are being passed to the shader that aren't being used.\n  // * The resulting image contains red\n  //   Not enough samples are being passed to the shader\n  // * The resulting image contains only white with some black\n  //   All samples are used by the shader. Correct result!\n\n  // fragColor = vec4(0, 0, 0, 1);\n  // if (sampleIndex == SAMPLING_DIMENSIONS) {\n  //   fragColor = vec4(1, 1, 1, 1);\n  // } else if (sampleIndex > SAMPLING_DIMENSIONS) {\n  //   fragColor = vec4(1, 0, 0, 1);\n  // }\n}\n");
  }

  function addFlatGeometryIndices(geometry) {
    var position = geometry.getAttribute('position');

    if (!position) {
      console.warn('No position attribute');
      return;
    }

    var index = new Uint32Array(position.count);

    for (var i = 0; i < index.length; i++) {
      index[i] = i;
    }

    geometry.setIndex(new THREE$1.BufferAttribute(index, 1, false));
    return geometry;
  } //TODO: Add UV support

  function mergeMeshesToGeometry(meshes) {
    var vertexCount = 0;
    var indexCount = 0;
    var geometryAndMaterialIndex = [];
    var materialIndexMap = new Map();
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = meshes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var mesh = _step.value;

        var _geometry = mesh.geometry.clone();

        var index = _geometry.getIndex();

        if (!index) {
          addFlatGeometryIndices(_geometry);
        }

        _geometry.applyMatrix(mesh.matrixWorld);

        if (!_geometry.getAttribute('normal')) {
          _geometry.computeVertexNormals();
        }

        vertexCount += _geometry.getAttribute('position').count;
        indexCount += _geometry.getIndex().count;
        var material = mesh.material;
        var materialIndex = materialIndexMap.get(material);

        if (materialIndex === undefined) {
          materialIndex = materialIndexMap.size;
          materialIndexMap.set(material, materialIndex);
        }

        geometryAndMaterialIndex.push({
          geometry: _geometry,
          materialIndex: materialIndex
        });
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator["return"] != null) {
          _iterator["return"]();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    var _mergeGeometry = mergeGeometry(geometryAndMaterialIndex, vertexCount, indexCount),
        geometry = _mergeGeometry.geometry,
        materialIndices = _mergeGeometry.materialIndices;

    return {
      geometry: geometry,
      materialIndices: materialIndices,
      materials: Array.from(materialIndexMap.keys())
    };
  }

  function mergeGeometry(geometryAndMaterialIndex, vertexCount, indexCount) {
    var position = new THREE$1.BufferAttribute(new Float32Array(3 * vertexCount), 3, false);
    var normal = new THREE$1.BufferAttribute(new Float32Array(3 * vertexCount), 3, false);
    var uv = new THREE$1.BufferAttribute(new Float32Array(2 * vertexCount), 2, false);
    var index = new THREE$1.BufferAttribute(new Uint32Array(indexCount), 1, false);
    var materialIndices = [];
    var bg = new THREE$1.BufferGeometry();
    bg.addAttribute('position', position);
    bg.addAttribute('normal', normal);
    bg.addAttribute('uv', uv);
    bg.setIndex(index);
    var vertexIndex = 0;
    var indexIndex = 0;
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = geometryAndMaterialIndex[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var _step2$value = _step2.value,
            geometry = _step2$value.geometry,
            materialIndex = _step2$value.materialIndex;
        bg.merge(geometry, vertexIndex);
        var meshIndex = geometry.getIndex();

        for (var k = 0; k < meshIndex.count; k++) {
          index.setX(indexIndex + k, vertexIndex + meshIndex.getX(k));
        }

        var triangleCount = meshIndex.count / 3;

        for (var _k = 0; _k < triangleCount; _k++) {
          materialIndices.push(materialIndex);
        }

        vertexIndex += geometry.getAttribute('position').count;
        indexIndex += meshIndex.count;
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
          _iterator2["return"]();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    return {
      geometry: bg,
      materialIndices: materialIndices
    };
  }

  // Reorders the elements in the range [first, last) in such a way that
  // all elements for which the comparator c returns true
  // precede the elements for which comparator c returns false.
  function partition(array, compare) {
    var left = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    var right = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : array.length;

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
  } // nth_element is a partial sorting algorithm that rearranges elements in [first, last) such that:
  // The element pointed at by nth is changed to whatever element would occur in that position if [first, last) were sorted.
  // All of the elements before this new nth element compare to true with elements after the nth element

  function nthElement(array, compare) {
    var left = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    var right = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : array.length;
    var k = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : Math.floor((left + right) / 2);

    for (var i = left; i <= k; i++) {
      var minIndex = i;
      var minValue = array[i];

      for (var j = i + 1; j < right; j++) {
        if (!compare(minValue, array[j])) {
          minIndex = j;
          minValue = array[j];
          swap(array, i, minIndex);
        }
      }
    }
  }

  function swap(array, a, b) {
    var x = array[b];
    array[b] = array[a];
    array[a] = x;
  }

  // Create a bounding volume hierarchy of scene geometry
  var size = new THREE$1.Vector3();
  function bvhAccel(geometry, materialIndices) {
    var primitiveInfo = makePrimitiveInfo(geometry, materialIndices);
    var node = recursiveBuild(primitiveInfo, 0, primitiveInfo.length);
    return node;
  }
  function flattenBvh(bvh) {
    var flat = [];
    var isBounds = [];
    var splitAxisMap = {
      x: 0,
      y: 1,
      z: 2
    };
    var maxDepth = 1;

    var traverse = function traverse(node) {
      var depth = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      maxDepth = Math.max(depth, maxDepth);

      if (node.primitives) {
        for (var i = 0; i < node.primitives.length; i++) {
          var p = node.primitives[i];
          flat.push(p.indices[0], p.indices[1], p.indices[2], node.primitives.length, p.faceNormal.x, p.faceNormal.y, p.faceNormal.z, p.materialIndex);
          isBounds.push(false);
        }
      } else {
        var bounds = node.bounds;
        flat.push(bounds.min.x, bounds.min.y, bounds.min.z, splitAxisMap[node.splitAxis], bounds.max.x, bounds.max.y, bounds.max.z, null // pointer to second shild
        );

        var _i = flat.length - 1;

        isBounds.push(true);
        traverse(node.child0, depth + 1);
        flat[_i] = flat.length / 4; // pointer to second child

        traverse(node.child1, depth + 1);
      }
    };

    traverse(bvh);
    var buffer = new ArrayBuffer(4 * flat.length);
    var floatView = new Float32Array(buffer);
    var intView = new Int32Array(buffer);

    for (var i = 0; i < isBounds.length; i++) {
      var k = 8 * i;

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
      maxDepth: maxDepth,
      count: flat.length / 4,
      buffer: floatView
    };
  }

  function makePrimitiveInfo(geometry, materialIndices) {
    var primitiveInfo = [];
    var indices = geometry.getIndex().array;
    var position = geometry.getAttribute('position');
    var v0 = new THREE$1.Vector3();
    var v1 = new THREE$1.Vector3();
    var v2 = new THREE$1.Vector3();
    var e0 = new THREE$1.Vector3();
    var e1 = new THREE$1.Vector3();

    for (var i = 0; i < indices.length; i += 3) {
      var bounds = new THREE$1.Box3();
      v0.fromBufferAttribute(position, indices[i]);
      v1.fromBufferAttribute(position, indices[i + 1]);
      v2.fromBufferAttribute(position, indices[i + 2]);
      e0.subVectors(v2, v0);
      e1.subVectors(v1, v0);
      bounds.expandByPoint(v0);
      bounds.expandByPoint(v1);
      bounds.expandByPoint(v2);
      var info = {
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

  function recursiveBuild(primitiveInfo, start, end) {
    var bounds = new THREE$1.Box3();

    for (var i = start; i < end; i++) {
      bounds.union(primitiveInfo[i].bounds);
    }

    var nPrimitives = end - start;

    if (nPrimitives === 1) {
      return makeLeafNode(primitiveInfo.slice(start, end), bounds);
    } else {
      var centroidBounds = new THREE$1.Box3();

      for (var _i2 = start; _i2 < end; _i2++) {
        centroidBounds.expandByPoint(primitiveInfo[_i2].center);
      }

      var dim = maximumExtent(centroidBounds);
      var mid = Math.floor((start + end) / 2); // middle split method
      // const dimMid = (centroidBounds.max[dim] + centroidBounds.min[dim]) / 2;
      // mid = partition(primitiveInfo, p => p.center[dim] < dimMid, start, end);
      // if (mid === start || mid === end) {
      //   mid = Math.floor((start + end) / 2);
      //   nthElement(primitiveInfo, (a, b) => a.center[dim] < b.center[dim], start, end, mid);
      // }
      // surface area heuristic method

      if (nPrimitives <= 4) {
        nthElement(primitiveInfo, function (a, b) {
          return a.center[dim] < b.center[dim];
        }, start, end, mid);
      } else {
        var buckets = [];

        for (var _i3 = 0; _i3 < 12; _i3++) {
          buckets.push({
            bounds: new THREE$1.Box3(),
            count: 0
          });
        }

        for (var _i4 = start; _i4 < end; _i4++) {
          var b = Math.floor(buckets.length * boxOffset(centroidBounds, dim, primitiveInfo[_i4].center));

          if (b === buckets.length) {
            b = buckets.length - 1;
          }

          buckets[b].count++;
          buckets[b].bounds.union(primitiveInfo[_i4].bounds);
        }

        var cost = [];

        for (var _i5 = 0; _i5 < buckets.length - 1; _i5++) {
          var b0 = new THREE$1.Box3();
          var b1 = new THREE$1.Box3();
          var count0 = 0;
          var count1 = 0;

          for (var j = 0; j <= _i5; j++) {
            b0.union(buckets[j].bounds);
            count0 += buckets[j].count;
          }

          for (var _j = _i5 + 1; _j < buckets.length; _j++) {
            b1.union(buckets[_j].bounds);
            count1 += buckets[_j].count;
          }

          cost.push(0.1 + (count0 * surfaceArea(b0) + count1 * surfaceArea(b1)) / surfaceArea(bounds));
        }

        var minCost = cost[0];
        var minCostSplitBucket = 0;

        for (var _i6 = 1; _i6 < cost.length; _i6++) {
          if (cost[_i6] < minCost) {
            minCost = cost[_i6];
            minCostSplitBucket = _i6;
          }
        }

        mid = partition(primitiveInfo, function (p) {
          var b = Math.floor(buckets.length * boxOffset(centroidBounds, dim, p.center));

          if (b === buckets.length) {
            b = buckets.length - 1;
          }

          return b <= minCostSplitBucket;
        }, start, end);
      }

      return makeInteriorNode(dim, recursiveBuild(primitiveInfo, start, mid), recursiveBuild(primitiveInfo, mid, end));
    }
  }

  function makeLeafNode(primitives, bounds) {
    return {
      primitives: primitives,
      bounds: bounds
    };
  }

  function makeInteriorNode(splitAxis, child0, child1) {
    return {
      child0: child0,
      child1: child1,
      bounds: new THREE$1.Box3().union(child0.bounds).union(child1.bounds),
      splitAxis: splitAxis
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
    var offset = v[dim] - box3.min[dim];

    if (box3.max[dim] > box3.min[dim]) {
      offset /= box3.max[dim] - box3.min[dim];
    }

    return offset;
  }

  function surfaceArea(box3) {
    box3.getSize(size);
    return 2 * (size.x * size.z + size.x * size.y + size.z * size.y);
  }

  // Create a piecewise 2D cumulative distribution function of light intensity from an envmap
  // http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#Piecewise-Constant2DDistributions
  function envmapDistribution(image) {
    var data = image.data;
    var cdfImage = {
      width: image.width + 2,
      height: image.height + 1
    };
    var cdf = makeTextureArray(cdfImage.width, cdfImage.height, 2);

    for (var y = 0; y < image.height; y++) {
      var sinTheta = Math.sin(Math.PI * (y + 0.5) / image.height);

      for (var x = 0; x < image.width; x++) {
        var i = 3 * (y * image.width + x);
        var r = data[i];
        var g = data[i + 1];
        var b = data[i + 2];
        var luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        luminance *= sinTheta;
        cdf.set(x + 2, y, 0, cdf.get(x + 1, y, 0) + luminance / image.width);
        cdf.set(x + 1, y, 1, luminance);
      }

      var rowIntegral = cdf.get(cdfImage.width - 1, y, 0);

      for (var _x = 1; _x < cdf.width; _x++) {
        cdf.set(_x, y, 0, cdf.get(_x, y, 0) / rowIntegral);
        cdf.set(_x, y, 1, cdf.get(_x, y, 1) / rowIntegral);
      }

      cdf.set(0, y + 1, 0, cdf.get(0, y, 0) + rowIntegral / image.height);
      cdf.set(0, y, 1, rowIntegral);
    }

    var integral = cdf.get(0, cdf.height - 1, 0);

    for (var _y = 0; _y < cdf.height; _y++) {
      cdf.set(0, _y, 0, cdf.get(0, _y, 0) / integral);
      cdf.set(0, _y, 1, cdf.get(0, _y, 1) / integral);
    }

    cdfImage.data = cdf.array;
    return cdfImage;
  }

  function makeTextureArray(width, height, channels) {
    var array = new Float32Array(channels * width * height);
    return {
      set: function set(x, y, channel, val) {
        array[channels * (y * width + x) + channel] = val;
      },
      get: function get(x, y, channel) {
        return array[channels * (y * width + x) + channel];
      },
      width: width,
      height: height,
      channels: channels,
      array: array
    };
  }

  // Convert image data from the RGBE format to a 32-bit floating point format
  // See https://www.cg.tuwien.ac.at/research/theses/matkovic/node84.html for a description of the RGBE format
  function rgbeToFloat(buffer) {
    var texels = buffer.length / 4;
    var floatBuffer = new Float32Array(texels * 3);

    for (var i = 0; i < texels; i++) {
      var r = buffer[4 * i];
      var g = buffer[4 * i + 1];
      var b = buffer[4 * i + 2];
      var a = buffer[4 * i + 3];
      var e = Math.pow(2, a - 128);
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
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var x = arr[i];
      arr[i] = arr[j];
      arr[j] = x;
    }

    return arr;
  }
  function numberArraysEqual(a, b) {
    var eps = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1e-4;

    for (var i = 0; i < a.length; i++) {
      if (Math.abs(a[i] - b[i]) > eps) {
        return false;
      }
    }

    return true;
  }

  var DEFAULT_MAP_RESOLUTION = {
    width: 4096,
    height: 2048
  }; // Tools for generating and modify env maps for lighting from scene component data

  function generateEnvMapFromSceneComponents(directionalLights, environmentLights) {
    var envImage = initializeEnvMap(environmentLights);
    directionalLights.forEach(function (light) {
      envImage.data = addDirectionalLightToEnvMap(light, envImage);
    });
    return envImage;
  }
  function initializeEnvMap(environmentLights) {
    var envImage; // Initialize map from environment light if present

    if (environmentLights.length > 0) {
      // TODO: support multiple environment lights (what if they have different resolutions?)
      var environmentLight = environmentLights[0];
      envImage = {
        width: environmentLight.map.image.width,
        height: environmentLight.map.image.height,
        data: environmentLight.map.image.data
      };
      envImage.data = rgbeToFloat(envImage.data);
      envImage.data.forEach(function (datum, index, arr) {
        arr[index] = datum * environmentLight.intensity;
      });
    } else {
      // initialize blank map
      envImage = generateBlankMap(DEFAULT_MAP_RESOLUTION.width, DEFAULT_MAP_RESOLUTION.height);
    }

    return envImage;
  }
  function generateBlankMap(width, height) {
    var texels = width * height;
    var floatBuffer = new Float32Array(texels * 3);
    floatBuffer.fill(0.0);
    return {
      width: width,
      height: height,
      data: floatBuffer
    };
  }
  function addDirectionalLightToEnvMap(light, image) {
    var sphericalCoords = new THREE$1.Spherical();
    var lightDirection = light.position.clone().sub(light.target.position);
    sphericalCoords.setFromVector3(lightDirection);
    sphericalCoords.theta = Math.PI * 3 / 2 - sphericalCoords.theta;
    sphericalCoords.makeSafe();
    return addLightAtCoordinates(light, image, sphericalCoords);
  } // Perform modifications on env map to match input scene

  function addLightAtCoordinates(light, image, originSphericalCoords) {
    var floatBuffer = image.data;
    var width = image.width;
    var height = image.height;
    var xTexels = floatBuffer.length / (3 * height);
    var yTexels = floatBuffer.length / (3 * width); // default softness for standard directional lights is 0.95

    var softness = "softness" in light && light.softness !== null ? light.softness : 0.45;

    for (var i = 0; i < xTexels; i++) {
      for (var j = 0; j < yTexels; j++) {
        var bufferIndex = j * width + i;
        var currentSphericalCoords = equirectangularToSpherical(i, j, width, height);
        var falloff = getIntensityFromAngleDifferential(originSphericalCoords, currentSphericalCoords, softness);
        var intensity = light.intensity * falloff;
        floatBuffer[bufferIndex * 3] += intensity * light.color.r;
        floatBuffer[bufferIndex * 3 + 1] += intensity * light.color.g;
        floatBuffer[bufferIndex * 3 + 2] += intensity * light.color.b;
      }
    }

    return floatBuffer;
  }

  function getIntensityFromAngleDifferential(originCoords, currentCoords, softness) {
    var angle = angleBetweenSphericals(originCoords, currentCoords);
    var falloffCoeficient = getFalloffAtAngle(angle, softness);
    return falloffCoeficient;
  }

  function angleBetweenSphericals(originCoords, currentCoords) {
    var originVector = new THREE$1.Vector3();
    originVector.setFromSpherical(originCoords);
    var currentVector = new THREE$1.Vector3();
    currentVector.setFromSpherical(currentCoords);
    return originVector.angleTo(currentVector);
  }

  function getFalloffAtAngle(angle, softness) {
    var softnessCoeficient = Math.pow(2, 14.5 * Math.max(0.001, 1.0 - clamp(softness, 0.0, 1.0)));
    var falloff = Math.pow(softnessCoeficient, 1.1) * Math.pow(8, softnessCoeficient * -1 * Math.pow(angle, 1.8));
    return falloff;
  }

  function equirectangularToSpherical(x, y, width, height) {
    var TWOPI = 2.0 * Math.PI;
    var theta = TWOPI * x / width;
    var phi = Math.PI * y / height;
    var sphericalCoords = new THREE$1.Spherical(1.0, phi, theta);
    return sphericalCoords;
  }

  // retrieve textures used by meshes, grouping textures from meshes shared by *the same* mesh property
  function getTexturesFromMaterials(meshes, textureNames) {
    var textureMap = {};
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = textureNames[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var name = _step.value;
        var textures = [];
        textureMap[name] = {
          indices: texturesFromMaterials(meshes, name, textures),
          textures: textures
        };
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator["return"] != null) {
          _iterator["return"]();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    return textureMap;
  } // retrieve textures used by meshes, grouping textures from meshes shared *across all* mesh properties

  function mergeTexturesFromMaterials(meshes, textureNames) {
    var textureMap = {
      textures: [],
      indices: {}
    };
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = textureNames[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var name = _step2.value;
        textureMap.indices[name] = texturesFromMaterials(meshes, name, textureMap.textures);
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
          _iterator2["return"]();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    return textureMap;
  }

  function texturesFromMaterials(materials, textureName, textures) {
    var indices = [];
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = materials[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var material = _step3.value;

        if (!material[textureName]) {
          indices.push(-1);
        } else {
          var index = textures.length;

          for (var i = 0; i < textures.length; i++) {
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
    } catch (err) {
      _didIteratorError3 = true;
      _iteratorError3 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3["return"] != null) {
          _iterator3["return"]();
        }
      } finally {
        if (_didIteratorError3) {
          throw _iteratorError3;
        }
      }
    }

    return indices;
  }

  function makeTexture(gl, params) {
    var _params$wrapS = params.wrapS,
        wrapS = _params$wrapS === void 0 ? gl.REPEAT : _params$wrapS,
        _params$wrapT = params.wrapT,
        wrapT = _params$wrapT === void 0 ? gl.REPEAT : _params$wrapT,
        _params$minFilter = params.minFilter,
        minFilter = _params$minFilter === void 0 ? gl.LINEAR : _params$minFilter,
        _params$magFilter = params.magFilter,
        magFilter = _params$magFilter === void 0 ? gl.LINEAR : _params$magFilter,
        _params$gammaCorrecti = params.gammaCorrection,
        gammaCorrection = _params$gammaCorrecti === void 0 ? false : _params$gammaCorrecti,
        _params$width = params.width,
        width = _params$width === void 0 ? null : _params$width,
        _params$height = params.height,
        height = _params$height === void 0 ? null : _params$height,
        _params$channels = params.channels,
        channels = _params$channels === void 0 ? null : _params$channels,
        _params$storage = params.storage,
        storage = _params$storage === void 0 ? null : _params$storage,
        _params$data = params.data,
        data = _params$data === void 0 ? null : _params$data,
        _params$flipY = params.flipY,
        flipY = _params$flipY === void 0 ? false : _params$flipY;
    width = width || data.width || 0;
    height = height || data.height || 0;
    var texture = gl.createTexture();
    var target;
    var dataArray; // if data is a JS array but not a TypedArray, assume data is an array of TypedArrays and create a GL Array Texture

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
    var format = [gl.RED, gl.RG, gl.RGB, gl.RGBA][channels - 1];
    var isByteArray = storage === 'byte' || data instanceof Uint8Array || data instanceof HTMLImageElement || data instanceof HTMLCanvasElement || data instanceof ImageData;
    var isFloatArray = storage === 'float' || data instanceof Float32Array;
    var type;
    var internalFormat;

    if (isByteArray) {
      type = gl.UNSIGNED_BYTE;
      internalFormat = [gl.R8, gl.RG8, gammaCorrection ? gl.SRGB8 : gl.RGB8, gammaCorrection ? gl.SRGB8_ALPHA8 : gl.RGBA8][channels - 1];
    } else if (isFloatArray) {
      type = gl.FLOAT;
      internalFormat = [gl.R32F, gl.RG32F, gl.RGB32F, gl.RGBA32F][channels - 1];
    } else {
      console.error('Texture of unknown type:', data);
    }

    if (dataArray) {
      gl.texStorage3D(target, 1, internalFormat, width, height, dataArray.length);

      for (var i = 0; i < dataArray.length; i++) {
        // if layer is an HTMLImageElement, use the .width and .height properties of each layer
        // otherwise use the max size of the array texture
        var layerWidth = dataArray[i].width || width;
        var layerHeight = dataArray[i].height || height;
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, Array.isArray(flipY) ? flipY[i] : flipY);
        gl.texSubImage3D(target, 0, 0, 0, i, layerWidth, layerHeight, 1, format, type, dataArray[i]);
      }
    } else {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
      gl.texImage2D(target, 0, internalFormat, width, height, 0, format, type, data);
    } // return state to default


    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    return {
      target: target,
      texture: texture
    };
  }

  // Packs different arrays into vec4's to take advantage of GLSL's std140 memory layout

  function uploadBuffers(gl, program, bufferData) {
    var _ref, _ref2;

    var materialBuffer = makeUniformBuffer(gl, program, 'Materials');
    var _bufferData$color = bufferData.color,
        color = _bufferData$color === void 0 ? [] : _bufferData$color,
        _bufferData$roughness = bufferData.roughness,
        roughness = _bufferData$roughness === void 0 ? [] : _bufferData$roughness,
        _bufferData$metalness = bufferData.metalness,
        metalness = _bufferData$metalness === void 0 ? [] : _bufferData$metalness,
        _bufferData$normalSca = bufferData.normalScale,
        normalScale = _bufferData$normalSca === void 0 ? [] : _bufferData$normalSca,
        _bufferData$type = bufferData.type,
        type = _bufferData$type === void 0 ? [] : _bufferData$type,
        _bufferData$diffuseMa = bufferData.diffuseMapIndex,
        diffuseMapIndex = _bufferData$diffuseMa === void 0 ? [] : _bufferData$diffuseMa,
        _bufferData$diffuseMa2 = bufferData.diffuseMapSize,
        diffuseMapSize = _bufferData$diffuseMa2 === void 0 ? [] : _bufferData$diffuseMa2,
        _bufferData$normalMap = bufferData.normalMapIndex,
        normalMapIndex = _bufferData$normalMap === void 0 ? [] : _bufferData$normalMap,
        _bufferData$normalMap2 = bufferData.normalMapSize,
        normalMapSize = _bufferData$normalMap2 === void 0 ? [] : _bufferData$normalMap2,
        _bufferData$roughness2 = bufferData.roughnessMapIndex,
        roughnessMapIndex = _bufferData$roughness2 === void 0 ? [] : _bufferData$roughness2,
        _bufferData$metalness2 = bufferData.metalnessMapIndex,
        metalnessMapIndex = _bufferData$metalness2 === void 0 ? [] : _bufferData$metalness2,
        _bufferData$pbrMapSiz = bufferData.pbrMapSize,
        pbrMapSize = _bufferData$pbrMapSiz === void 0 ? [] : _bufferData$pbrMapSiz;
    materialBuffer.set('Materials.colorAndMaterialType[0]', interleave({
      data: (_ref = []).concat.apply(_ref, _toConsumableArray(color.map(function (d) {
        return d.toArray();
      }))),
      channels: 3
    }, {
      data: type,
      channels: 1
    }));
    materialBuffer.set('Materials.roughnessMetalnessNormalScale[0]', interleave({
      data: roughness,
      channels: 1
    }, {
      data: metalness,
      channels: 1
    }, {
      data: (_ref2 = []).concat.apply(_ref2, _toConsumableArray(normalScale.map(function (d) {
        return d.toArray();
      }))),
      channels: 2
    }));
    materialBuffer.set('Materials.diffuseNormalRoughnessMetalnessMapIndex[0]', interleave({
      data: diffuseMapIndex,
      channels: 1
    }, {
      data: normalMapIndex,
      channels: 1
    }, {
      data: roughnessMapIndex,
      channels: 1
    }, {
      data: metalnessMapIndex,
      channels: 1
    }));
    materialBuffer.set('Materials.diffuseNormalMapSize[0]', interleave({
      data: diffuseMapSize,
      channels: 2
    }, {
      data: normalMapSize,
      channels: 2
    }));
    materialBuffer.set('Materials.pbrMapSize[0]', pbrMapSize);
    materialBuffer.bind(0);
  }

  function interleave() {
    for (var _len = arguments.length, arrays = new Array(_len), _key = 0; _key < _len; _key++) {
      arrays[_key] = arguments[_key];
    }

    var maxLength = arrays.reduce(function (m, a) {
      return Math.max(m, a.data.length / a.channels);
    }, 0);
    var interleaved = [];

    for (var i = 0; i < maxLength; i++) {
      for (var j = 0; j < arrays.length; j++) {
        var _arrays$j = arrays[j],
            data = _arrays$j.data,
            channels = _arrays$j.channels;

        for (var c = 0; c < channels; c++) {
          interleaved.push(data[i * channels + c]);
        }
      }
    }

    return interleaved;
  }

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
    var strata = [];
    var l = Math.pow(strataCount, dimensions);

    for (var i = 0; i < l; i++) {
      strata[i] = i;
    }

    var index = strata.length;
    var sample = [];

    function restart() {
      index = 0;
    }

    function next() {
      if (index >= strata.length) {
        shuffle(strata);
        restart();
      }

      var stratum = strata[index++];

      for (var _i = 0; _i < dimensions; _i++) {
        sample[_i] = stratum % strataCount + Math.random();
        stratum = Math.floor(stratum / strataCount);
      }

      return sample;
    }

    return {
      next: next,
      restart: restart,
      strataCount: strataCount
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
    var strataObjs = [];
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = listOfDimensions[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var dim = _step.value;
        strataObjs.push(makeStratifiedSampler(strataCount, dim));
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator["return"] != null) {
          _iterator["return"]();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    var combined = [];

    function next() {
      var i = 0;

      for (var _i = 0, _strataObjs = strataObjs; _i < _strataObjs.length; _i++) {
        var strata = _strataObjs[_i];
        var nums = strata.next();
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = nums[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var num = _step2.value;
            combined[i++] = num;
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
              _iterator2["return"]();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }
      }

      return combined;
    }

    function restart() {
      for (var _i2 = 0, _strataObjs2 = strataObjs; _i2 < _strataObjs2.length; _i2++) {
        var strata = _strataObjs2[_i2];
        strata.restart();
      }
    }

    return {
      next: next,
      restart: restart,
      strataCount: strataCount
    };
  }

  function makeRayTracingShader(_ref) {
    var bounces = _ref.bounces,
        fullscreenQuad = _ref.fullscreenQuad,
        gl = _ref.gl,
        optionalExtensions = _ref.optionalExtensions,
        scene = _ref.scene,
        textureAllocator = _ref.textureAllocator;
    bounces = clamp(bounces, 1, 6);
    var samplingDimensions = [];
    samplingDimensions.push(2, 2); // anti aliasing, depth of field

    for (var i = 0; i < bounces; i++) {
      // specular or diffuse reflection, light importance sampling, material sampling, next path direction
      samplingDimensions.push(2, 2, 2, 2);

      if (i >= 1) {
        // russian roulette sampling
        // this step is skipped on the first bounce
        samplingDimensions.push(1);
      }
    }

    var _makeProgramFromScene = makeProgramFromScene({
      bounces: bounces,
      fullscreenQuad: fullscreenQuad,
      gl: gl,
      optionalExtensions: optionalExtensions,
      samplingDimensions: samplingDimensions,
      scene: scene,
      textureAllocator: textureAllocator
    }),
        program = _makeProgramFromScene.program,
        uniforms = _makeProgramFromScene.uniforms;

    function setSize(width, height) {
      gl.useProgram(program);
      gl.uniform2f(uniforms.pixelSize, 1 / width, 1 / height);
    } // noiseImage is a 32-bit PNG image


    function setNoise(noiseImage) {
      textureAllocator.bind(uniforms.noise, makeTexture(gl, {
        data: noiseImage,
        minFilter: gl.NEAREST,
        magFilter: gl.NEAREST,
        storage: 'float'
      }));
    }

    function setCamera(camera) {
      gl.useProgram(program);
      gl.uniformMatrix4fv(uniforms['camera.transform'], false, camera.matrixWorld.elements);
      gl.uniform1f(uniforms['camera.aspect'], camera.aspect);
      gl.uniform1f(uniforms['camera.fov'], 0.5 / Math.tan(0.5 * Math.PI * camera.fov / 180));
      gl.uniform1f(uniforms['camera.focus'], camera.focus || 0);
      gl.uniform1f(uniforms['camera.aperture'], camera.aperture || 0);
    }

    var samples;

    function nextSeed() {
      gl.useProgram(program);
      gl.uniform1fv(uniforms['stratifiedSamples[0]'], samples.next());
    }

    function setStrataCount(strataCount) {
      gl.useProgram(program);

      if (strataCount > 1 && strataCount !== samples.strataCount) {
        // reinitailizing random has a performance cost. we can skip it if
        // * strataCount is 1, since a strataCount of 1 works with any sized StratifiedRandomCombined
        // * random already has the same strata count as desired
        samples = makeStratifiedSamplerCombined(strataCount, samplingDimensions);
      } else {
        samples.restart();
      }

      gl.uniform1f(uniforms.strataSize, 1.0 / strataCount);
      nextSeed();
    }

    function useStratifiedSampling(stratifiedSampling) {
      gl.useProgram(program);
      gl.uniform1f(uniforms.useStratifiedSampling, stratifiedSampling ? 1.0 : 0.0);
    }

    function draw() {
      gl.useProgram(program);
      fullscreenQuad.draw();
    }

    samples = makeStratifiedSamplerCombined(1, samplingDimensions);
    return {
      draw: draw,
      nextSeed: nextSeed,
      setCamera: setCamera,
      setNoise: setNoise,
      setSize: setSize,
      setStrataCount: setStrataCount,
      useStratifiedSampling: useStratifiedSampling
    };
  }

  function makeProgramFromScene(_ref2) {
    var bounces = _ref2.bounces,
        fullscreenQuad = _ref2.fullscreenQuad,
        gl = _ref2.gl,
        optionalExtensions = _ref2.optionalExtensions,
        samplingDimensions = _ref2.samplingDimensions,
        scene = _ref2.scene,
        textureAllocator = _ref2.textureAllocator;
    var OES_texture_float_linear = optionalExtensions.OES_texture_float_linear;

    var _decomposeScene = decomposeScene(scene),
        meshes = _decomposeScene.meshes,
        directionalLights = _decomposeScene.directionalLights,
        environmentLights = _decomposeScene.environmentLights;

    if (meshes.length === 0) {
      throw 'RayTracingRenderer: Scene contains no renderable meshes.';
    } // merge meshes in scene to a single, static geometry


    var _mergeMeshesToGeometr = mergeMeshesToGeometry(meshes),
        geometry = _mergeMeshesToGeometr.geometry,
        materials = _mergeMeshesToGeometr.materials,
        materialIndices = _mergeMeshesToGeometr.materialIndices; // extract textures shared by meshes in scene


    var maps = getTexturesFromMaterials(materials, ['map', 'normalMap']);
    var pbrMap = mergeTexturesFromMaterials(materials, ['roughnessMap', 'metalnessMap']); // create bounding volume hierarchy from a static scene

    var bvh = bvhAccel(geometry, materialIndices);
    var flattenedBvh = flattenBvh(bvh);
    var numTris = geometry.index.count / 3;
    var useGlass = materials.some(function (m) {
      return m.transparent;
    });
    var useShadowCatcher = materials.some(function (m) {
      return m.shadowCatcher;
    });
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragString({
      OES_texture_float_linear: OES_texture_float_linear,
      BVH_COLUMNS: textureDimensionsFromArray(flattenedBvh.count).columnsLog,
      INDEX_COLUMNS: textureDimensionsFromArray(numTris).columnsLog,
      VERTEX_COLUMNS: textureDimensionsFromArray(geometry.attributes.position.count).columnsLog,
      STACK_SIZE: flattenedBvh.maxDepth,
      NUM_TRIS: numTris,
      NUM_MATERIALS: materials.length,
      NUM_DIFFUSE_MAPS: maps.map.textures.length,
      NUM_NORMAL_MAPS: maps.normalMap.textures.length,
      NUM_PBR_MAPS: pbrMap.textures.length,
      BOUNCES: bounces,
      USE_GLASS: useGlass,
      USE_SHADOW_CATCHER: useShadowCatcher,
      SAMPLING_DIMENSIONS: samplingDimensions.reduce(function (a, b) {
        return a + b;
      })
    }));
    var program = createProgram(gl, fullscreenQuad.vertexShader, fragmentShader);
    gl.useProgram(program);
    var uniforms = getUniforms(gl, program);
    var bufferData = {};
    bufferData.color = materials.map(function (m) {
      return m.color;
    });
    bufferData.roughness = materials.map(function (m) {
      return m.roughness;
    });
    bufferData.metalness = materials.map(function (m) {
      return m.metalness;
    });
    bufferData.normalScale = materials.map(function (m) {
      return m.normalScale;
    });
    bufferData.type = materials.map(function (m) {
      if (m.shadowCatcher) {
        return ShadowCatcherMaterial;
      }

      if (m.transparent) {
        return m.solid ? ThickMaterial : ThinMaterial;
      }
    });

    if (maps.map.textures.length > 0) {
      var _makeTextureArray = makeTextureArray$1(gl, maps.map.textures, true),
          relativeSizes = _makeTextureArray.relativeSizes,
          texture = _makeTextureArray.texture;

      textureAllocator.bind(uniforms.diffuseMap, texture);
      bufferData.diffuseMapSize = relativeSizes;
      bufferData.diffuseMapIndex = maps.map.indices;
    }

    if (maps.normalMap.textures.length > 0) {
      var _makeTextureArray2 = makeTextureArray$1(gl, maps.normalMap.textures, false),
          _relativeSizes = _makeTextureArray2.relativeSizes,
          _texture = _makeTextureArray2.texture;

      textureAllocator.bind(uniforms.normalMap, _texture);
      bufferData.normalMapSize = _relativeSizes;
      bufferData.normalMapIndex = maps.normalMap.indices;
    }

    if (pbrMap.textures.length > 0) {
      var _makeTextureArray3 = makeTextureArray$1(gl, pbrMap.textures, false),
          _relativeSizes2 = _makeTextureArray3.relativeSizes,
          _texture2 = _makeTextureArray3.texture;

      textureAllocator.bind(uniforms.pbrMap, _texture2);
      bufferData.pbrMapSize = _relativeSizes2;
      bufferData.roughnessMapIndex = pbrMap.indices.roughnessMap;
      bufferData.metalnessMapIndex = pbrMap.indices.metalnessMap;
    }

    uploadBuffers(gl, program, bufferData);
    textureAllocator.bind(uniforms.positions, makeDataTexture(gl, geometry.getAttribute('position').array, 3));
    textureAllocator.bind(uniforms.normals, makeDataTexture(gl, geometry.getAttribute('normal').array, 3));
    textureAllocator.bind(uniforms.uvs, makeDataTexture(gl, geometry.getAttribute('uv').array, 2));
    textureAllocator.bind(uniforms.bvh, makeDataTexture(gl, flattenedBvh.buffer, 4));
    var envImage = generateEnvMapFromSceneComponents(directionalLights, environmentLights);
    textureAllocator.bind(uniforms.envmap, makeTexture(gl, {
      data: envImage.data,
      minFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
      magFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
      width: envImage.width,
      height: envImage.height
    }));
    var distribution = envmapDistribution(envImage);
    textureAllocator.bind(uniforms.envmapDistribution, makeTexture(gl, {
      data: distribution.data,
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST,
      width: distribution.width,
      height: distribution.height
    }));
    return {
      program: program,
      uniforms: uniforms
    };
  }

  function decomposeScene(scene) {
    var meshes = [];
    var directionalLights = [];
    var environmentLights = [];
    scene.traverse(function (child) {
      if (child instanceof THREE$1.Mesh) {
        if (!child.geometry || !child.geometry.getAttribute('position')) {
          console.warn(child, 'must have a geometry property with a position attribute');
        } else if (!(child.material instanceof THREE$1.MeshStandardMaterial)) {
          console.warn(child, 'must use MeshStandardMaterial in order to be rendered.');
        } else {
          meshes.push(child);
        }
      }

      if (child instanceof THREE$1.DirectionalLight) {
        directionalLights.push(child);
      }

      if (child instanceof THREE$1.EnvironmentLight) {
        if (environmentLights.length > 1) {
          console.warn(environmentLights, 'only one environment light can be used per scene');
        } else if (isHDRTexture(child)) {
          environmentLights.push(child);
        } else {
          console.warn(child, 'environment light does not use THREE.RGBEEncoding');
        }
      }
    });
    return {
      meshes: meshes,
      directionalLights: directionalLights,
      environmentLights: environmentLights
    };
  }

  function textureDimensionsFromArray(count) {
    var columnsLog = Math.round(Math.log2(Math.sqrt(count)));
    var columns = Math.pow(2, columnsLog);
    var rows = Math.ceil(count / columns);
    return {
      columnsLog: columnsLog,
      columns: columns,
      rows: rows,
      size: rows * columns
    };
  }

  function makeDataTexture(gl, dataArray, channels) {
    var textureDim = textureDimensionsFromArray(dataArray.length / channels);
    return makeTexture(gl, {
      data: padArray(dataArray, channels * textureDim.size),
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST,
      width: textureDim.columns,
      height: textureDim.rows
    });
  }

  function makeTextureArray$1(gl, textures) {
    var gammaCorrection = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var images = textures.map(function (t) {
      return t.image;
    });
    var flipY = textures.map(function (t) {
      return t.flipY;
    });

    var _maxImageSize = maxImageSize(images),
        maxSize = _maxImageSize.maxSize,
        relativeSizes = _maxImageSize.relativeSizes; // create GL Array Texture from individual textures


    var texture = makeTexture(gl, {
      width: maxSize.width,
      height: maxSize.height,
      gammaCorrection: gammaCorrection,
      data: images,
      flipY: flipY,
      channels: 3
    });
    return {
      texture: texture,
      relativeSizes: relativeSizes
    };
  }

  function maxImageSize(images) {
    var maxSize = {
      width: 0,
      height: 0
    };
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = images[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var image = _step.value;
        maxSize.width = Math.max(maxSize.width, image.width);
        maxSize.height = Math.max(maxSize.height, image.height);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator["return"] != null) {
          _iterator["return"]();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    var relativeSizes = [];
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = images[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var _image = _step2.value;
        relativeSizes.push(_image.width / maxSize.width);
        relativeSizes.push(_image.height / maxSize.height);
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
          _iterator2["return"]();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    return {
      maxSize: maxSize,
      relativeSizes: relativeSizes
    };
  } // expand array to the given length


  function padArray(typedArray, length) {
    var newArray = new typedArray.constructor(length);
    newArray.set(typedArray);
    return newArray;
  }

  function isHDRTexture(texture) {
    return texture.map && texture.map.image && (texture.map.encoding === THREE$1.RGBEEncoding || texture.map.encoding === THREE$1.LinearEncoding);
  }

  function fragString$1 (params) {
    return "#version 300 es\n\nprecision mediump float;\nprecision mediump int;\n\nin vec2 vCoord;\n\nout vec4 fragColor;\n\nuniform sampler2D image;\n\n".concat(textureLinear(), "\n\n// Tonemapping functions from THREE.js\n\nvec3 linear(vec3 color) {\n  return color;\n}\n// https://www.cs.utah.edu/~reinhard/cdrom/\nvec3 reinhard(vec3 color) {\n  return clamp(color / (vec3(1.0) + color), vec3(0.0), vec3(1.0));\n}\n// http://filmicworlds.com/blog/filmic-tonemapping-operators/\n#define uncharted2Helper(x) max(((x * (0.15 * x + 0.10 * 0.50) + 0.20 * 0.02) / (x * (0.15 * x + 0.50) + 0.20 * 0.30)) - 0.02 / 0.30, vec3(0.0))\nconst vec3 uncharted2WhitePoint = 1.0 / uncharted2Helper(vec3(").concat(params.whitePoint, "));\nvec3 uncharted2( vec3 color ) {\n  // John Hable's filmic operator from Uncharted 2 video game\n  return clamp(uncharted2Helper(color) * uncharted2WhitePoint, vec3(0.0), vec3(1.0));\n}\n// http://filmicworlds.com/blog/filmic-tonemapping-operators/\nvec3 cineon( vec3 color ) {\n  // optimized filmic operator by Jim Hejl and Richard Burgess-Dawson\n  color = max(vec3( 0.0 ), color - 0.004);\n  return pow((color * (6.2 * color + 0.5)) / (color * (6.2 * color + 1.7) + 0.06), vec3(2.2));\n}\n// https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/\nvec3 acesFilmic( vec3 color ) {\n  return clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), vec3(0.0), vec3(1.0));\n}\n\nvoid main() {\n  vec4 tex = textureLinear(image, vCoord);\n\n  // alpha channel stores the number of samples progressively rendered\n  // divide the sum of light by alpha to obtain average contribution of light\n\n  // in addition, alpha contains a scale factor for the shadow catcher material\n  // dividing by alpha normalizes the brightness of the shadow catcher to match the background envmap.\n  vec3 light = tex.rgb / tex.a;\n\n  light *= ").concat(params.exposure, "; // exposure\n\n  light = ").concat(params.toneMapping, "(light); // tone mapping\n\n  light = pow(light, vec3(1.0 / 2.2)); // gamma correction\n\n  fragColor = vec4(light, 1.0);\n}\n\n");
  }

  var _toneMapFunctions;
  var toneMapFunctions = (_toneMapFunctions = {}, _defineProperty(_toneMapFunctions, THREE$1.LinearToneMapping, 'linear'), _defineProperty(_toneMapFunctions, THREE$1.ReinhardToneMapping, 'reinhard'), _defineProperty(_toneMapFunctions, THREE$1.Uncharted2ToneMapping, 'uncharted2'), _defineProperty(_toneMapFunctions, THREE$1.CineonToneMapping, 'cineon'), _defineProperty(_toneMapFunctions, THREE$1.ACESFilmicToneMapping, 'acesFilmic'), _toneMapFunctions);
  function makeToneMapShader(_ref) {
    var gl = _ref.gl,
        optionalExtensions = _ref.optionalExtensions,
        fullscreenQuad = _ref.fullscreenQuad,
        textureAllocator = _ref.textureAllocator,
        toneMappingParams = _ref.toneMappingParams;
    var OES_texture_float_linear = optionalExtensions.OES_texture_float_linear;
    var toneMapping = toneMappingParams.toneMapping,
        whitePoint = toneMappingParams.whitePoint,
        exposure = toneMappingParams.exposure;
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragString$1({
      OES_texture_float_linear: OES_texture_float_linear,
      toneMapping: toneMapFunctions[toneMapping] || 'linear',
      whitePoint: whitePoint.toExponential(),
      // toExponential allows integers to be represented as GLSL floats
      exposure: exposure.toExponential()
    }));
    var program = createProgram(gl, fullscreenQuad.vertexShader, fragmentShader);
    var uniforms = getUniforms(gl, program);
    var bindFramebuffer = textureAllocator.reserveSlot();

    function draw(_ref2) {
      var texture = _ref2.texture;
      gl.useProgram(program);
      bindFramebuffer(uniforms.image, texture);
      fullscreenQuad.draw();
    }

    return {
      draw: draw
    };
  }

  function makeRenderTargetFloat(gl, linearFiltering) {
    return makeRenderTarget(gl, 'float', linearFiltering);
  }
  function makeRenderTarget(gl, storage, linearFiltering) {
    var framebuffer = gl.createFramebuffer();
    var texture;
    var width = 0;
    var height = 0;

    function setSize(w, h) {
      width = Math.floor(w);
      height = Math.floor(h);
      texture = makeTexture(gl, {
        width: width,
        height: height,
        storage: storage,
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

    return {
      setSize: setSize,
      bind: bind,
      unbind: unbind,
      copyToScreen: copyToScreen,

      get texture() {
        return texture;
      },

      get width() {
        return width;
      },

      get height() {
        return height;
      }

    };
  }

  // Sampling the scene with the RayTracingRenderer can be very slow (<1 fps).
  // This overworks the GPU and tends to lock up the OS, making it unresponsive.
  // To fix this, we can split the screen into smaller tiles, and sample the scene one tile at a time
  // The tile size is set such that each tile takes approximatly a constant amount of time to render.
  // Since the render time of a tile is dependent on the device, we find the desired tile dimensions by measuring
  // the time it takes to render an arbitrarily-set tile size and adjusting the size according to the benchmark.

  function makeTileRender(gl) {
    var currentTile = -1;
    var numTiles = 1;
    var tileWidth;
    var tileHeight;
    var columns;
    var rows;
    var firstTileTime = 0;
    var width = 0;
    var height = 0; // initial number of pixels per rendered tile
    // based on correlation between system performance and max supported render buffer size
    // adjusted dynamically according to system performance

    var pixelsPerTile = pixelsPerTileEstimate(gl);
    var pixelsPerTileQuantized = pixelsPerTile;
    var desiredTimePerTile = 22; // 45 fps

    var timePerPixelSum = desiredTimePerTile / pixelsPerTile;
    var samples = 1;
    var resetSum = true;

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
      var aspectRatio = width / height; // quantize the width of the tile so that it evenly divides the entire window

      tileWidth = Math.ceil(width / Math.round(width / Math.sqrt(pixelsPerTile * aspectRatio)));
      tileHeight = Math.ceil(tileWidth / aspectRatio);
      pixelsPerTileQuantized = tileWidth * tileHeight;
      columns = Math.ceil(width / tileWidth);
      rows = Math.ceil(height / tileHeight);
      numTiles = columns * rows;
    }

    function initTiles() {
      if (firstTileTime) {
        var timeElapsed = Date.now() - firstTileTime;
        var timePerTile = timeElapsed / numTiles;
        var error = desiredTimePerTile - timePerTile; // higher number means framerate converges to targetRenderTime faster
        // if set too high, the framerate fluctuates rapidly with small variations in frame-by-frame performance

        var convergenceStrength = 1000;
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

      var x = currentTile % columns;
      var y = Math.floor(currentTile / columns) % rows;
      return {
        x: x * tileWidth,
        y: y * tileHeight,
        tileWidth: tileWidth,
        tileHeight: tileHeight,
        isFirstTile: currentTile === 0,
        isLastTile: currentTile === numTiles - 1
      };
    }

    return {
      setSize: setSize,
      reset: reset,
      nextTile: nextTile,
      getTimePerPixel: getTimePerPixel,
      restartTimer: function restartTimer() {
        firstTileTime = 0;
      },
      setRenderTime: function setRenderTime(time) {
        desiredTimePerTile = time;
      }
    };
  }

  function pixelsPerTileEstimate(gl) {
    var maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    var maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);

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

  function makeTextureAllocator(gl) {
    // texture unit 0 reserved for setting parameters on new textures
    var nextUnit = 1;

    function bindGl(uniform, _ref, unit) {
      var target = _ref.target,
          texture = _ref.texture;

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
      var unit = nextUnit++;
      return function (uniform, textureObj) {
        bindGl(uniform, textureObj, unit);
      };
    }

    return {
      bind: bind,
      reserveSlot: reserveSlot
    };
  }

  var noiseBase64 = 'data:image/png;base64,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';

  function makeRenderingPipeline(_ref) {
    var gl = _ref.gl,
        optionalExtensions = _ref.optionalExtensions,
        scene = _ref.scene,
        toneMappingParams = _ref.toneMappingParams,
        bounces = _ref.bounces;
    var ready = false;
    var fullscreenQuad = makeFullscreenQuad(gl);
    var textureAllocator = makeTextureAllocator(gl);
    var rayTracingShader = makeRayTracingShader({
      gl: gl,
      optionalExtensions: optionalExtensions,
      fullscreenQuad: fullscreenQuad,
      textureAllocator: textureAllocator,
      scene: scene,
      bounces: bounces
    });
    var toneMapShader = makeToneMapShader({
      gl: gl,
      optionalExtensions: optionalExtensions,
      fullscreenQuad: fullscreenQuad,
      textureAllocator: textureAllocator,
      toneMappingParams: toneMappingParams
    });
    var noiseImage = new Image();
    noiseImage.src = noiseBase64;

    noiseImage.onload = function () {
      rayTracingShader.setNoise(noiseImage);
      ready = true;
    };

    var useLinearFiltering = optionalExtensions.OES_texture_float_linear;
    var hdrBuffer = makeRenderTargetFloat(gl); // full resolution buffer representing the rendered scene with HDR lighting

    var hdrPreviewBuffer = makeRenderTargetFloat(gl, useLinearFiltering); // lower resolution buffer used for the first frame
    // used to sample only a portion of the scene to the HDR Buffer to prevent the GPU from locking up from excessive computation

    var tileRender = makeTileRender(gl);
    var lastCamera = new LensCamera(); // how many samples to render with uniform noise before switching to stratified noise

    var numUniformSamples = 6; // how many partitions of stratified noise should be created
    // higher number results in faster convergence over time, but with lower quality initial samples

    var strataCount = 6;
    var sampleCount = 0;

    var sampleRenderedCallback = function sampleRenderedCallback() {};

    function clear() {
      hdrBuffer.bind();
      gl.clear(gl.COLOR_BUFFER_BIT);
      hdrBuffer.unbind();
      sampleCount = 0;
      tileRender.reset();
    }

    function initFirstSample(camera) {
      lastCamera.copy(camera);
      rayTracingShader.setCamera(camera);
      rayTracingShader.useStratifiedSampling(false);
      clear();
    }

    function setPreviewBufferDimensions() {
      var aspectRatio = hdrBuffer.width / hdrBuffer.height;
      var desiredTimeForPreview = 16; // 60 fps

      var numPixelsForPreview = desiredTimeForPreview / tileRender.getTimePerPixel();
      var previewWidth = clamp(Math.sqrt(numPixelsForPreview * aspectRatio), 1, hdrBuffer.width);
      var previewHeight = clamp(previewWidth / aspectRatio, 1, hdrBuffer.height);

      if (previewWidth !== hdrPreviewBuffer.width) {
        hdrPreviewBuffer.setSize(previewWidth, previewHeight);
      }
    }

    function camerasEqual(cam1, cam2) {
      return numberArraysEqual(cam1.matrixWorld.elements, cam2.matrixWorld.elements) && cam1.aspect === cam2.aspect && cam1.fov === cam2.fov && cam1.focus === cam2.focus && cam1.aperture === cam2.aperture;
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
        texture: hdrPreviewBuffer.texture
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
        texture: hdrBuffer.texture
      });
    }

    function updateSeed() {
      if (sampleCount === 2) {
        rayTracingShader.useStratifiedSampling(true);
        rayTracingShader.setStrataCount(1);
      } else if (sampleCount === numUniformSamples) {
        rayTracingShader.setStrataCount(strataCount);
      } else {
        rayTracingShader.nextSeed();
      }
    }

    function drawTile(camera) {
      if (!ready) {
        return;
      } else if (!camerasEqual(camera, lastCamera)) {
        initFirstSample(camera);
        setPreviewBufferDimensions();
        renderPreview();
      } else {
        var _tileRender$nextTile = tileRender.nextTile(),
            x = _tileRender$nextTile.x,
            y = _tileRender$nextTile.y,
            tileWidth = _tileRender$nextTile.tileWidth,
            tileHeight = _tileRender$nextTile.tileHeight,
            isFirstTile = _tileRender$nextTile.isFirstTile,
            isLastTile = _tileRender$nextTile.isLastTile;

        if (isFirstTile) {
          sampleCount++;
          updateSeed();
        }

        renderTile(x, y, tileWidth, tileHeight);

        if (isLastTile) {
          hdrBufferToScreen();
          sampleRenderedCallback(sampleCount);
        }
      }
    }

    function drawOffscreenTile(camera) {
      if (!ready) {
        return;
      } else if (!camerasEqual(camera, lastCamera)) {
        initFirstSample(camera);
      }

      var _tileRender$nextTile2 = tileRender.nextTile(),
          x = _tileRender$nextTile2.x,
          y = _tileRender$nextTile2.y,
          tileWidth = _tileRender$nextTile2.tileWidth,
          tileHeight = _tileRender$nextTile2.tileHeight,
          isFirstTile = _tileRender$nextTile2.isFirstTile,
          isLastTile = _tileRender$nextTile2.isLastTile;

      if (isFirstTile) {
        sampleCount++;
        updateSeed();
      }

      renderTile(x, y, tileWidth, tileHeight);

      if (isLastTile) {
        sampleRenderedCallback(sampleCount);
      }
    }

    function drawFull(camera) {
      if (!ready) {
        return;
      } else if (!camerasEqual(camera, lastCamera)) {
        initFirstSample(camera);
      }

      sampleCount++;
      updateSeed();
      addSampleToBuffer(hdrBuffer);
      hdrBufferToScreen();
    }

    function setSize(width, height) {
      rayTracingShader.setSize(width, height);
      hdrBuffer.setSize(width, height);
      tileRender.setSize(width, height);
      clear();
    }

    return {
      drawTile: drawTile,
      drawOffscreenTile: drawOffscreenTile,
      drawFull: drawFull,
      restartTimer: tileRender.restartTimer,
      setRenderTime: tileRender.setRenderTime,
      setSize: setSize,
      hdrBufferToScreen: hdrBufferToScreen,
      getTotalSamplesRendered: function getTotalSamplesRendered() {
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

  var glRequiredExtensions = ['EXT_color_buffer_float'];
  var glOptionalExtensions = ['OES_texture_float_linear'];
  function RayTracingRenderer() {
    var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var canvas = params.canvas || document.createElement('canvas');
    var gl = canvas.getContext('webgl2', {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: true
    });
    loadExtensions(gl, glRequiredExtensions);
    var optionalExtensions = loadExtensions(gl, glOptionalExtensions);
    var pipeline = null;
    var size = new THREE$1.Vector2();
    var renderTime = 22;
    var pixelRatio = 1;
    var module = {
      bounces: 3,
      domElement: canvas,
      maxHardwareUsage: false,
      needsUpdate: true,
      onSampleRendered: null,
      renderWhenOffFocus: true,
      renderToScreen: true,
      toneMapping: THREE$1.LinearToneMapping,
      toneMappingExposure: 1,
      toneMappingWhitePoint: 1
    };

    function initScene(scene) {
      scene.updateMatrixWorld();
      var toneMappingParams = {
        exposure: module.toneMappingExposure,
        whitePoint: module.toneMappingWhitePoint,
        toneMapping: module.toneMapping
      };
      var bounces = module.bounces;
      pipeline = makeRenderingPipeline({
        gl: gl,
        optionalExtensions: optionalExtensions,
        scene: scene,
        toneMappingParams: toneMappingParams,
        bounces: bounces
      });

      pipeline.onSampleRendered = function () {
        if (module.onSampleRendered) {
          module.onSampleRendered.apply(module, arguments);
        }
      };

      module.setRenderTime(renderTime);
      module.setSize(size.width, size.height);
      module.needsUpdate = false;
    }

    function restartTimer() {
      if (pipeline) {
        pipeline.restartTimer();
      }
    }

    module.setSize = function (width, height) {
      var updateStyle = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
      size.set(width, height);
      canvas.width = size.width * pixelRatio;
      canvas.height = size.height * pixelRatio;

      if (updateStyle) {
        canvas.style.width = "".concat(size.width, "px");
        canvas.style.height = "".concat(size.height, "px");
      }

      if (pipeline) {
        pipeline.setSize(size.width * pixelRatio, size.height * pixelRatio);
      }
    };

    module.getSize = function (target) {
      if (!target) {
        target = new THREE$1.Vector2();
      }

      return target.copy(size);
    };

    module.setPixelRatio = function (x) {
      if (!x) {
        return;
      }

      pixelRatio = x;
      module.setSize(size.width, size.height, false);
    };

    module.getPixelRatio = function () {
      return pixelRatio;
    };

    module.setRenderTime = function (time) {
      renderTime = time;

      if (pipeline) {
        pipeline.setRenderTime(time);
      }
    };

    module.getRenderTime = function () {
      return renderTime;
    };

    module.getTotalSamplesRendered = function () {
      if (pipeline) {
        return pipeline.getTotalSamplesRendered();
      }
    };

    module.sendToScreen = function () {
      if (pipeline) {
        pipeline.hdrBufferToScreen();
      }
    };

    var lastFocus = false;

    module.render = function (scene, camera) {
      if (!module.renderWhenOffFocus) {
        var hasFocus = document.hasFocus();

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
        if (module.maxHardwareUsage) {
          // render new sample for the entire screen
          pipeline.drawFull(camera);
        } else {
          // render new sample for a tiled subset of the screen
          pipeline.drawTile(camera);
        }
      } else {
        pipeline.drawOffscreenTile(camera);
      }
    }; // Assume module.render is called using requestAnimationFrame.
    // This means that when the user is on a different browser tab, module.render won't be called.
    // Since the timer should not measure time when module.render is inactive,
    // the timer should be reset when the user switches browser tabs


    document.addEventListener('visibilitychange', restartTimer);

    module.dispose = function () {
      document.removeEventListener('visibilitychange', restartTimer);
      pipeline = false;
    };

    return module;
  }

  RayTracingRenderer.isSupported = function () {
    var gl = document.createElement('canvas').getContext('webgl2', {
      failIfMajorPerformanceCaveat: true
    });

    if (!gl) {
      return false;
    }

    var extensions = loadExtensions(gl, glRequiredExtensions);

    for (var e in extensions) {
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
