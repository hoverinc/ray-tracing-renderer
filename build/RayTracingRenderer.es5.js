(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('three')) :
  typeof define === 'function' && define.amd ? define(['exports', 'three'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.RayTracingRenderer = {}, global.THREE));
}(this, (function (exports, THREE$1) { 'use strict';

  var ThinMaterial = 1;
  var ThickMaterial = 2;
  var ShadowCatcherMaterial = 3;

  var constants = /*#__PURE__*/Object.freeze({
    __proto__: null,
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

  function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      if (enumerableOnly) symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
      keys.push.apply(keys, symbols);
    }

    return keys;
  }

  function _objectSpread2(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};

      if (i % 2) {
        ownKeys(Object(source), true).forEach(function (key) {
          _defineProperty(target, key, source[key]);
        });
      } else if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
      } else {
        ownKeys(Object(source)).forEach(function (key) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
      }
    }

    return target;
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

  function _isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;

    try {
      Date.prototype.toString.call(Reflect.construct(Date, [], function () {}));
      return true;
    } catch (e) {
      return false;
    }
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

  function _createSuper(Derived) {
    var hasNativeReflectConstruct = _isNativeReflectConstruct();

    return function _createSuperInternal() {
      var Super = _getPrototypeOf(Derived),
          result;

      if (hasNativeReflectConstruct) {
        var NewTarget = _getPrototypeOf(this).constructor;

        result = Reflect.construct(Super, arguments, NewTarget);
      } else {
        result = Super.apply(this, arguments);
      }

      return _possibleConstructorReturn(this, result);
    };
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

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) return _arrayLikeToArray(arr);
  }

  function _iterableToArray(iter) {
    if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
  }

  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }

  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

    return arr2;
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  function _createForOfIteratorHelper(o, allowArrayLike) {
    var it;

    if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) {
      if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
        if (it) o = it;
        var i = 0;

        var F = function () {};

        return {
          s: F,
          n: function () {
            if (i >= o.length) return {
              done: true
            };
            return {
              done: false,
              value: o[i++]
            };
          },
          e: function (e) {
            throw e;
          },
          f: F
        };
      }

      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }

    var normalCompletion = true,
        didErr = false,
        err;
    return {
      s: function () {
        it = o[Symbol.iterator]();
      },
      n: function () {
        var step = it.next();
        normalCompletion = step.done;
        return step;
      },
      e: function (e) {
        didErr = true;
        err = e;
      },
      f: function () {
        try {
          if (!normalCompletion && it.return != null) it.return();
        } finally {
          if (didErr) throw err;
        }
      }
    };
  }

  var LensCamera = /*#__PURE__*/function (_PerspectiveCamera) {
    _inherits(LensCamera, _PerspectiveCamera);

    var _super = _createSuper(LensCamera);

    function LensCamera() {
      var _this;

      _classCallCheck(this, LensCamera);

      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      _this = _super.call.apply(_super, [this].concat(args));
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

  var SoftDirectionalLight = /*#__PURE__*/function (_DirectionalLight) {
    _inherits(SoftDirectionalLight, _DirectionalLight);

    var _super = _createSuper(SoftDirectionalLight);

    function SoftDirectionalLight(color, intensity) {
      var _this;

      var softness = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

      _classCallCheck(this, SoftDirectionalLight);

      _this = _super.call(this, color, intensity);
      _this.softness = softness;
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

  var EnvironmentLight = /*#__PURE__*/function (_Light) {
    _inherits(EnvironmentLight, _Light);

    var _super = _createSuper(EnvironmentLight);

    function EnvironmentLight(map) {
      var _this;

      _classCallCheck(this, EnvironmentLight);

      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      _this = _super.call.apply(_super, [this].concat(args));
      _this.map = map;
      _this.isEnvironmentLight = true;
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

  var RayTracingMaterial = /*#__PURE__*/function (_MeshStandardMaterial) {
    _inherits(RayTracingMaterial, _MeshStandardMaterial);

    var _super = _createSuper(RayTracingMaterial);

    function RayTracingMaterial() {
      var _this;

      _classCallCheck(this, RayTracingMaterial);

      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      _this = _super.call.apply(_super, [this].concat(args));
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

    var _iterator = _createForOfIteratorHelper(extensions),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var name = _step.value;
        supported[name] = gl.getExtension(name);
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    return supported;
  }
  function compileShader(gl, type, source) {
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
          name = _gl$getActiveUniform.name,
          type = _gl$getActiveUniform.type;

      var location = gl.getUniformLocation(program, name);

      if (location) {
        uniforms[name] = {
          type: type,
          location: location
        };
      }
    }

    return uniforms;
  }
  function getAttributes(gl, program) {
    var attributes = {};
    var count = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

    for (var i = 0; i < count; i++) {
      var _gl$getActiveAttrib = gl.getActiveAttrib(program, i),
          name = _gl$getActiveAttrib.name;

      if (name) {
        attributes[name] = gl.getAttribLocation(program, name);
      }
    }

    return attributes;
  }

  function decomposeScene(scene) {
    var meshes = [];
    var directionalLights = [];
    var ambientLights = [];
    var environmentLights = [];
    scene.traverse(function (child) {
      if (child.isMesh) {
        if (!child.geometry) {
          console.warn(child, 'must have a geometry property');
        } else if (!child.material.isMeshStandardMaterial) {
          console.warn(child, 'must use MeshStandardMaterial in order to be rendered.');
        } else {
          meshes.push(child);
        }
      } else if (child.isDirectionalLight) {
        directionalLights.push(child);
      } else if (child.isAmbientLight) {
        ambientLights.push(child);
      } else if (child.isEnvironmentLight) {
        if (environmentLights.length > 1) {
          console.warn(environmentLights, 'only one environment light can be used per scene');
        } // Valid lights have HDR texture map in RGBEEncoding


        if (isHDRTexture(child)) {
          environmentLights.push(child);
        } else {
          console.warn(child, 'environment light does not use color value or map with THREE.RGBEEncoding');
        }
      }
    });
    var background = scene.background;
    return {
      background: background,
      meshes: meshes,
      directionalLights: directionalLights,
      ambientLights: ambientLights,
      environmentLights: environmentLights
    };
  }

  function isHDRTexture(texture) {
    return texture.map && texture.map.image && (texture.map.encoding === THREE$1.RGBEEncoding || texture.map.encoding === THREE$1.LinearEncoding);
  }

  function makeFramebuffer(gl, _ref) {
    var color = _ref.color,
        depth = _ref.depth;
    var framebuffer = gl.createFramebuffer();

    function bind() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    }

    function unbind() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function init() {
      bind();
      var drawBuffers = [];

      for (var location in color) {
        location = Number(location);

        if (location === undefined) {
          console.error('invalid location');
        }

        var tex = color[location];
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
      color: color,
      bind: bind,
      unbind: unbind
    };
  }

  var vertex = {
    source: "\n  layout(location = 0) in vec2 a_position;\n\n  out vec2 vCoord;\n\n  void main() {\n    vCoord = a_position;\n    gl_Position = vec4(2. * a_position - 1., 0, 1);\n  }\n"
  };

  var typeMap;
  function makeUniformSetter(gl, program) {
    var uniformInfo = getUniforms(gl, program);
    var uniforms = {};
    var needsUpload = [];

    for (var name in uniformInfo) {
      var _uniformInfo$name = uniformInfo[name],
          type = _uniformInfo$name.type,
          location = _uniformInfo$name.location;
      var uniform = {
        type: type,
        location: location,
        v0: 0,
        v1: 0,
        v2: 0,
        v3: 0
      };
      uniforms[name] = uniform;
    }

    var failedUnis = new Set();

    function setUniform(name, v0, v1, v2, v3) {
      // v0 - v4 are the values to be passed to the uniform
      // v0 can either be a number or an array, and v1-v3 are optional
      var uni = uniforms[name];

      if (!uni) {
        if (!failedUnis.has(name)) {
          console.warn("Uniform \"".concat(name, "\" does not exist in shader"));
          failedUnis.add(name);
        }

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
        var _needsUpload$pop = needsUpload.pop(),
            _type = _needsUpload$pop.type,
            _location = _needsUpload$pop.location,
            v0 = _needsUpload$pop.v0,
            v1 = _needsUpload$pop.v1,
            v2 = _needsUpload$pop.v2,
            v3 = _needsUpload$pop.v3;

        var glMethod = typeMap[_type];

        if (v0.length) {
          if (glMethod.matrix) {
            var array = v0;
            var transpose = v1 || false;
            gl[glMethod.matrix](_location, transpose, array);
          } else {
            gl[glMethod.array](_location, v0);
          }
        } else {
          gl[glMethod.values](_location, v0, v1, v2, v3);
        }
      }
    }

    return {
      setUniform: setUniform,
      upload: upload
    };
  }

  function initTypeMap(gl) {
    var _ref;

    return _ref = {}, _defineProperty(_ref, gl.FLOAT, glName(1, 'f')), _defineProperty(_ref, gl.FLOAT_VEC2, glName(2, 'f')), _defineProperty(_ref, gl.FLOAT_VEC3, glName(3, 'f')), _defineProperty(_ref, gl.FLOAT_VEC4, glName(4, 'f')), _defineProperty(_ref, gl.INT, glName(1, 'i')), _defineProperty(_ref, gl.INT_VEC2, glName(2, 'i')), _defineProperty(_ref, gl.INT_VEC3, glName(3, 'i')), _defineProperty(_ref, gl.INT_VEC4, glName(4, 'i')), _defineProperty(_ref, gl.SAMPLER_2D, glName(1, 'i')), _defineProperty(_ref, gl.SAMPLER_2D_ARRAY, glName(1, 'i')), _defineProperty(_ref, gl.FLOAT_MAT2, glNameMatrix(2, 2)), _defineProperty(_ref, gl.FLOAT_MAT3, glNameMatrix(3, 3)), _defineProperty(_ref, gl.FLOAT_MAT4, glNameMatrix(4, 4)), _ref;
  }

  function glName(numComponents, type) {
    return {
      values: "uniform".concat(numComponents).concat(type),
      array: "uniform".concat(numComponents).concat(type, "v")
    };
  }

  function glNameMatrix(rows, columns) {
    return {
      matrix: rows === columns ? "uniformMatrix".concat(rows, "fv") : "uniformMatrix".concat(rows, "x").concat(columns, "fv")
    };
  }

  function makeRenderPass(gl, params) {
    var fragment = params.fragment,
        vertex = params.vertex;
    var vertexCompiled = vertex instanceof WebGLShader ? vertex : makeVertexShader(gl, params);
    var fragmentCompiled = fragment instanceof WebGLShader ? fragment : makeFragmentShader(gl, params);
    var program = createProgram(gl, vertexCompiled, fragmentCompiled);
    return _objectSpread2(_objectSpread2({}, makeRenderPassFromProgram(gl, program)), {}, {
      outputLocs: fragment.outputs ? getOutputLocations(fragment.outputs) : {}
    });
  }
  function makeVertexShader(gl, _ref) {
    var defines = _ref.defines,
        vertex = _ref.vertex;
    return makeShaderStage(gl, gl.VERTEX_SHADER, vertex, defines);
  }
  function makeFragmentShader(gl, _ref2) {
    var defines = _ref2.defines,
        fragment = _ref2.fragment;
    return makeShaderStage(gl, gl.FRAGMENT_SHADER, fragment, defines);
  }

  function makeRenderPassFromProgram(gl, program) {
    var uniformSetter = makeUniformSetter(gl, program);
    var textures = {};
    var nextTexUnit = 1;

    function setTexture(name, texture) {
      if (!texture) {
        return;
      }

      if (!textures[name]) {
        var unit = nextTexUnit++;
        uniformSetter.setUniform(name, unit);
        textures[name] = {
          unit: unit,
          tex: texture
        };
      } else {
        textures[name].tex = texture;
      }
    }

    function bindTextures() {
      for (var name in textures) {
        var _textures$name = textures[name],
            tex = _textures$name.tex,
            unit = _textures$name.unit;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(tex.target, tex.texture);
      }
    }

    function useProgram() {
      var autoBindTextures = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
      gl.useProgram(program);
      uniformSetter.upload();

      if (autoBindTextures) {
        bindTextures();
      }
    }

    return {
      attribLocs: getAttributes(gl, program),
      bindTextures: bindTextures,
      program: program,
      setTexture: setTexture,
      setUniform: uniformSetter.setUniform,
      textures: textures,
      useProgram: useProgram
    };
  }

  function makeShaderStage(gl, type, shader, defines) {
    var str = '#version 300 es\nprecision mediump float;\nprecision mediump int;\n';

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
    var str = '';

    for (var name in defines) {
      var value = defines[name]; // don't define falsy values such as false, 0, and ''.
      // this adds support for #ifdef on falsy values

      if (value) {
        str += "#define ".concat(name, " ").concat(value, "\n");
      }
    }

    return str;
  }

  function addOutputs(outputs) {
    var str = '';
    var locations = getOutputLocations(outputs);

    for (var name in locations) {
      var location = locations[name];
      str += "layout(location = ".concat(location, ") out vec4 out_").concat(name, ";\n");
    }

    return str;
  }

  function addIncludes(includes, defines) {
    var str = '';

    var _iterator = _createForOfIteratorHelper(includes),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var include = _step.value;

        if (typeof include === 'function') {
          str += include(defines);
        } else {
          str += include;
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    return str;
  }

  function getOutputLocations(outputs) {
    var locations = {};

    for (var i = 0; i < outputs.length; i++) {
      locations[outputs[i]] = i;
    }

    return locations;
  }

  function makeFullscreenQuad(gl) {
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW); // vertex shader should set layout(location = 0) on position attribute

    var posLoc = 0;
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    var vertexShader = makeVertexShader(gl, {
      vertex: vertex
    });

    function draw() {
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    return {
      draw: draw,
      vertexShader: vertexShader
    };
  }

  var vertex$1 = {
    source: "\n  in vec3 aPosition;\n  in vec3 aNormal;\n  in vec2 aUv;\n  in ivec2 aMaterialMeshIndex;\n\n  uniform mat4 projView;\n\n  out vec3 vPosition;\n  out vec3 vNormal;\n  out vec2 vUv;\n  flat out ivec2 vMaterialMeshIndex;\n\n  void main() {\n    vPosition = aPosition;\n    vNormal = aNormal;\n    vUv = aUv;\n    vMaterialMeshIndex = aMaterialMeshIndex;\n    gl_Position = projView * vec4(aPosition, 1);\n  }\n"
  };

  var constants$1 = "\n  #define PI 3.14159265359\n  #define TWOPI 6.28318530718\n  #define INVPI 0.31830988618\n  #define INVPI2 0.10132118364\n  #define EPS 0.0005\n  #define INF 1.0e999\n\n  #define ROUGHNESS_MIN 0.03\n";

  var materialBuffer = "\n\nuniform Materials {\n  vec4 colorAndMaterialType[NUM_MATERIALS];\n  vec4 roughnessMetalnessNormalScale[NUM_MATERIALS];\n\n  #if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS) || defined(NUM_PBR_MAPS)\n    ivec4 diffuseNormalRoughnessMetalnessMapIndex[NUM_MATERIALS];\n  #endif\n\n  #if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS)\n    vec4 diffuseNormalMapSize[NUM_DIFFUSE_NORMAL_MAPS];\n  #endif\n\n  #if defined(NUM_PBR_MAPS)\n    vec2 pbrMapSize[NUM_PBR_MAPS];\n  #endif\n} materials;\n\n#ifdef NUM_DIFFUSE_MAPS\n  uniform mediump sampler2DArray diffuseMap;\n#endif\n\n#ifdef NUM_NORMAL_MAPS\n  uniform mediump sampler2DArray normalMap;\n#endif\n\n#ifdef NUM_PBR_MAPS\n  uniform mediump sampler2DArray pbrMap;\n#endif\n\nfloat getMatType(int materialIndex) {\n  return materials.colorAndMaterialType[materialIndex].w;\n}\n\nvec3 getMatColor(int materialIndex, vec2 uv) {\n  vec3 color = materials.colorAndMaterialType[materialIndex].rgb;\n\n  #ifdef NUM_DIFFUSE_MAPS\n    int diffuseMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].x;\n    if (diffuseMapIndex >= 0) {\n      color *= texture(diffuseMap, vec3(uv * materials.diffuseNormalMapSize[diffuseMapIndex].xy, diffuseMapIndex)).rgb;\n    }\n  #endif\n\n  return color;\n}\n\nfloat getMatRoughness(int materialIndex, vec2 uv) {\n  float roughness = materials.roughnessMetalnessNormalScale[materialIndex].x;\n\n  #ifdef NUM_PBR_MAPS\n    int roughnessMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].z;\n    if (roughnessMapIndex >= 0) {\n      roughness *= texture(pbrMap, vec3(uv * materials.pbrMapSize[roughnessMapIndex].xy, roughnessMapIndex)).g;\n    }\n  #endif\n\n  return roughness;\n}\n\nfloat getMatMetalness(int materialIndex, vec2 uv) {\n  float metalness = materials.roughnessMetalnessNormalScale[materialIndex].y;\n\n  #ifdef NUM_PBR_MAPS\n    int metalnessMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].w;\n    if (metalnessMapIndex >= 0) {\n      metalness *= texture(pbrMap, vec3(uv * materials.pbrMapSize[metalnessMapIndex].xy, metalnessMapIndex)).b;\n    }\n  #endif\n\n  return metalness;\n}\n\n#ifdef NUM_NORMAL_MAPS\nvec3 getMatNormal(int materialIndex, vec2 uv, vec3 normal, vec3 dp1, vec3 dp2, vec2 duv1, vec2 duv2) {\n  int normalMapIndex = materials.diffuseNormalRoughnessMetalnessMapIndex[materialIndex].y;\n  if (normalMapIndex >= 0) {\n    // http://www.thetenthplanet.de/archives/1180\n    // Compute co-tangent and co-bitangent vectors\n    vec3 dp2perp = cross(dp2, normal);\n    vec3 dp1perp = cross(normal, dp1);\n    vec3 dpdu = dp2perp * duv1.x + dp1perp * duv2.x;\n    vec3 dpdv = dp2perp * duv1.y + dp1perp * duv2.y;\n    float invmax = inversesqrt(max(dot(dpdu, dpdu), dot(dpdv, dpdv)));\n    dpdu *= invmax;\n    dpdv *= invmax;\n\n    vec3 n = 2.0 * texture(normalMap, vec3(uv * materials.diffuseNormalMapSize[normalMapIndex].zw, normalMapIndex)).rgb - 1.0;\n    n.xy *= materials.roughnessMetalnessNormalScale[materialIndex].zw;\n\n    mat3 tbn = mat3(dpdu, dpdv, normal);\n\n    return normalize(tbn * n);\n  } else {\n    return normal;\n  }\n}\n#endif\n";

  var fragment = {
    outputs: ['position', 'normal', 'faceNormal', 'color', 'matProps'],
    includes: [constants$1, materialBuffer],
    source: "\n  in vec3 vPosition;\n  in vec3 vNormal;\n  in vec2 vUv;\n  flat in ivec2 vMaterialMeshIndex;\n\n  vec3 faceNormals(vec3 pos) {\n    vec3 fdx = dFdx(pos);\n    vec3 fdy = dFdy(pos);\n    return cross(fdx, fdy);\n  }\n\n  void main() {\n    int materialIndex = vMaterialMeshIndex.x;\n    int meshIndex = vMaterialMeshIndex.y;\n\n    vec2 uv = fract(vUv);\n\n    vec3 color = getMatColor(materialIndex, uv);\n    float roughness = getMatRoughness(materialIndex, uv);\n    float metalness = getMatMetalness(materialIndex, uv);\n    float materialType = getMatType(materialIndex);\n\n    roughness = clamp(roughness, ROUGHNESS_MIN, 1.0);\n    metalness = clamp(metalness, 0.0, 1.0);\n\n    vec3 normal = normalize(vNormal);\n    vec3 faceNormal = normalize(faceNormals(vPosition));\n    normal *= sign(dot(normal, faceNormal));\n\n    #ifdef NUM_NORMAL_MAPS\n      vec3 dp1 = dFdx(vPosition);\n      vec3 dp2 = dFdy(vPosition);\n      vec2 duv1 = dFdx(vUv);\n      vec2 duv2 = dFdy(vUv);\n      normal = getMatNormal(materialIndex, uv, normal, dp1, dp2, duv1, duv2);\n    #endif\n\n    out_position = vec4(vPosition, float(meshIndex) + EPS);\n    out_normal = vec4(normal, materialType);\n    out_faceNormal = vec4(faceNormal, 0);\n    out_color = vec4(color, 0);\n    out_matProps = vec4(roughness, metalness, 0, 0);\n  }\n"
  };

  function makeGBufferPass(gl, _ref) {
    var materialBuffer = _ref.materialBuffer,
        mergedMesh = _ref.mergedMesh;
    var renderPass = makeRenderPass(gl, {
      defines: materialBuffer.defines,
      vertex: vertex$1,
      fragment: fragment
    });
    renderPass.setTexture('diffuseMap', materialBuffer.textures.diffuseMap);
    renderPass.setTexture('normalMap', materialBuffer.textures.normalMap);
    renderPass.setTexture('pbrMap', materialBuffer.textures.pbrMap);
    var geometry = mergedMesh.geometry;
    var elementCount = geometry.getIndex().count;
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    uploadAttributes(gl, renderPass, geometry);
    gl.bindVertexArray(null);
    var jitterX = 0;
    var jitterY = 0;

    function setJitter(x, y) {
      jitterX = x;
      jitterY = y;
    }

    var currentCamera;

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

    var projView = new THREE$1.Matrix4();

    function draw() {
      calcCamera();
      gl.bindVertexArray(vao);
      renderPass.useProgram();
      gl.enable(gl.DEPTH_TEST);
      gl.drawElements(gl.TRIANGLES, elementCount, gl.UNSIGNED_INT, 0);
      gl.disable(gl.DEPTH_TEST);
    }

    return {
      draw: draw,
      outputLocs: renderPass.outputLocs,
      setCamera: setCamera,
      setJitter: setJitter
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

    var itemSize = bufferAttribute.itemSize,
        array = bufferAttribute.array;
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
      gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
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
      var _gl$getActiveUniform = gl.getActiveUniform(program, indices[i]),
          name = _gl$getActiveUniform.name,
          type = _gl$getActiveUniform.type,
          size = _gl$getActiveUniform.size;

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

  function makeTexture(gl, params) {
    var _params$width = params.width,
        width = _params$width === void 0 ? null : _params$width,
        _params$height = params.height,
        height = _params$height === void 0 ? null : _params$height,
        _params$data = params.data,
        data = _params$data === void 0 ? null : _params$data,
        _params$length = params.length,
        length = _params$length === void 0 ? 1 : _params$length,
        _params$channels = params.channels,
        channels = _params$channels === void 0 ? null : _params$channels,
        _params$storage = params.storage,
        storage = _params$storage === void 0 ? null : _params$storage,
        _params$flipY = params.flipY,
        flipY = _params$flipY === void 0 ? false : _params$flipY,
        _params$gammaCorrecti = params.gammaCorrection,
        gammaCorrection = _params$gammaCorrecti === void 0 ? false : _params$gammaCorrecti,
        _params$wrapS = params.wrapS,
        wrapS = _params$wrapS === void 0 ? gl.CLAMP_TO_EDGE : _params$wrapS,
        _params$wrapT = params.wrapT,
        wrapT = _params$wrapT === void 0 ? gl.CLAMP_TO_EDGE : _params$wrapT,
        _params$minFilter = params.minFilter,
        minFilter = _params$minFilter === void 0 ? gl.NEAREST : _params$minFilter,
        _params$magFilter = params.magFilter,
        magFilter = _params$magFilter === void 0 ? gl.NEAREST : _params$magFilter;
    width = width || data.width || 0;
    height = height || data.height || 0;
    var texture = gl.createTexture();
    var target;
    var dataArray; // if data is a JS array but not a TypedArray, assume data is an array of images and create a GL Array Texture

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

    var _getTextureFormat = getTextureFormat(gl, channels, storage, data, gammaCorrection),
        type = _getTextureFormat.type,
        format = _getTextureFormat.format,
        internalFormat = _getTextureFormat.internalFormat;

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
    } else if (length > 1) {
      // create empty array texture
      gl.texStorage3D(target, 1, internalFormat, width, height, length);
    } else {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
      gl.texStorage2D(target, 1, internalFormat, width, height);

      if (data) {
        gl.texSubImage2D(target, 0, 0, 0, width, height, format, type, data);
      }
    } // return state to default


    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    return {
      target: target,
      texture: texture
    };
  }
  function makeDepthTarget(gl, width, height) {
    var texture = gl.createRenderbuffer();
    var target = gl.RENDERBUFFER;
    gl.bindRenderbuffer(target, texture);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
    gl.bindRenderbuffer(target, null);
    return {
      target: target,
      texture: texture
    };
  }

  function getFormat(gl, channels) {
    var map = {
      1: gl.RED,
      2: gl.RG,
      3: gl.RGB,
      4: gl.RGBA
    };
    return map[channels];
  }

  function getTextureFormat(gl, channels, storage, data, gammaCorrection) {
    var type;
    var internalFormat;
    var isByteArray = data instanceof Uint8Array || data instanceof HTMLImageElement || data instanceof HTMLCanvasElement || data instanceof ImageData;
    var isFloatArray = data instanceof Float32Array;

    if (storage === 'byte' || !storage && isByteArray) {
      internalFormat = {
        1: gl.R8,
        2: gl.RG8,
        3: gammaCorrection ? gl.SRGB8 : gl.RGB8,
        4: gammaCorrection ? gl.SRGB8_ALPHA8 : gl.RGBA8
      }[channels];
      type = gl.UNSIGNED_BYTE;
    } else if (storage === 'float' || !storage && isFloatArray) {
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
        4: gl.RGBA8_SNORM
      }[channels];
      type = gl.UNSIGNED_BYTE;
    }

    var format = getFormat(gl, channels);
    return {
      format: format,
      internalFormat: internalFormat,
      type: type
    };
  }

  // retrieve textures used by meshes, grouping textures from meshes shared by *the same* mesh property
  function getTexturesFromMaterials(meshes, textureNames) {
    var textureMap = {};

    var _iterator = _createForOfIteratorHelper(textureNames),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var name = _step.value;
        var textures = [];
        textureMap[name] = {
          indices: texturesFromMaterials(meshes, name, textures),
          textures: textures
        };
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    return textureMap;
  } // retrieve textures used by meshes, grouping textures from meshes shared *across all* mesh properties

  function mergeTexturesFromMaterials(meshes, textureNames) {
    var textureMap = {
      textures: [],
      indices: {}
    };

    var _iterator2 = _createForOfIteratorHelper(textureNames),
        _step2;

    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var name = _step2.value;
        textureMap.indices[name] = texturesFromMaterials(meshes, name, textureMap.textures);
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }

    return textureMap;
  }

  function texturesFromMaterials(materials, textureName, textures) {
    var indices = [];

    var _iterator3 = _createForOfIteratorHelper(materials),
        _step3;

    try {
      for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
        var material = _step3.value;
        var isTextureLoaded = material[textureName] && material[textureName].image;

        if (!isTextureLoaded) {
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
      _iterator3.e(err);
    } finally {
      _iterator3.f();
    }

    return indices;
  }

  function makeMaterialBuffer(gl, materials) {
    var maps = getTexturesFromMaterials(materials, ['map', 'normalMap']);
    var pbrMap = mergeTexturesFromMaterials(materials, ['roughnessMap', 'metalnessMap']);
    var textures = {};
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
      var _makeTextureArray = makeTextureArray(gl, maps.map.textures, true),
          relativeSizes = _makeTextureArray.relativeSizes,
          texture = _makeTextureArray.texture;

      textures.diffuseMap = texture;
      bufferData.diffuseMapSize = relativeSizes;
      bufferData.diffuseMapIndex = maps.map.indices;
    }

    if (maps.normalMap.textures.length > 0) {
      var _makeTextureArray2 = makeTextureArray(gl, maps.normalMap.textures, false),
          _relativeSizes = _makeTextureArray2.relativeSizes,
          _texture = _makeTextureArray2.texture;

      textures.normalMap = _texture;
      bufferData.normalMapSize = _relativeSizes;
      bufferData.normalMapIndex = maps.normalMap.indices;
    }

    if (pbrMap.textures.length > 0) {
      var _makeTextureArray3 = makeTextureArray(gl, pbrMap.textures, false),
          _relativeSizes2 = _makeTextureArray3.relativeSizes,
          _texture2 = _makeTextureArray3.texture;

      textures.pbrMap = _texture2;
      bufferData.pbrMapSize = _relativeSizes2;
      bufferData.roughnessMapIndex = pbrMap.indices.roughnessMap;
      bufferData.metalnessMapIndex = pbrMap.indices.metalnessMap;
    }

    var defines = {
      NUM_MATERIALS: materials.length,
      NUM_DIFFUSE_MAPS: maps.map.textures.length,
      NUM_NORMAL_MAPS: maps.normalMap.textures.length,
      NUM_DIFFUSE_NORMAL_MAPS: Math.max(maps.map.textures.length, maps.normalMap.textures.length),
      NUM_PBR_MAPS: pbrMap.textures.length
    }; // create temporary shader program including the Material uniform buffer
    // used to query the compiled structure of the uniform buffer

    var renderPass = makeRenderPass(gl, {
      vertex: {
        source: "void main() {}"
      },
      fragment: {
        includes: [materialBuffer],
        source: "void main() {}"
      },
      defines: defines
    });
    uploadToUniformBuffer(gl, renderPass.program, bufferData);
    return {
      defines: defines,
      textures: textures
    };
  }

  function makeTextureArray(gl, textures) {
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
      channels: 3,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR
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

    var _iterator = _createForOfIteratorHelper(images),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var image = _step.value;
        maxSize.width = Math.max(maxSize.width, image.width);
        maxSize.height = Math.max(maxSize.height, image.height);
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    var relativeSizes = [];

    var _iterator2 = _createForOfIteratorHelper(images),
        _step2;

    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var _image = _step2.value;
        relativeSizes.push(_image.width / maxSize.width);
        relativeSizes.push(_image.height / maxSize.height);
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }

    return {
      maxSize: maxSize,
      relativeSizes: relativeSizes
    };
  } // Upload arrays to uniform buffer objects
  // Packs different arrays into vec4's to take advantage of GLSL's std140 memory layout


  function uploadToUniformBuffer(gl, program, bufferData) {
    var _ref, _ref2;

    var materialBuffer = makeUniformBuffer(gl, program, 'Materials');
    materialBuffer.set('Materials.colorAndMaterialType[0]', interleave({
      data: (_ref = []).concat.apply(_ref, _toConsumableArray(bufferData.color.map(function (d) {
        return d.toArray();
      }))),
      channels: 3
    }, {
      data: bufferData.type,
      channels: 1
    }));
    materialBuffer.set('Materials.roughnessMetalnessNormalScale[0]', interleave({
      data: bufferData.roughness,
      channels: 1
    }, {
      data: bufferData.metalness,
      channels: 1
    }, {
      data: (_ref2 = []).concat.apply(_ref2, _toConsumableArray(bufferData.normalScale.map(function (d) {
        return d.toArray();
      }))),
      channels: 2
    }));
    materialBuffer.set('Materials.diffuseNormalRoughnessMetalnessMapIndex[0]', interleave({
      data: bufferData.diffuseMapIndex,
      channels: 1
    }, {
      data: bufferData.normalMapIndex,
      channels: 1
    }, {
      data: bufferData.roughnessMapIndex,
      channels: 1
    }, {
      data: bufferData.metalnessMapIndex,
      channels: 1
    }));
    materialBuffer.set('Materials.diffuseNormalMapSize[0]', interleave({
      data: bufferData.diffuseMapSize,
      channels: 2
    }, {
      data: bufferData.normalMapSize,
      channels: 2
    }));
    materialBuffer.set('Materials.pbrMapSize[0]', bufferData.pbrMapSize);
    materialBuffer.bind(0);
  }

  function interleave() {
    var maxLength = 0;

    for (var i = 0; i < arguments.length; i++) {
      var a = i < 0 || arguments.length <= i ? undefined : arguments[i];
      var l = a.data ? a.data.length / a.channels : 0;
      maxLength = Math.max(maxLength, l);
    }

    var interleaved = [];

    for (var _i = 0; _i < maxLength; _i++) {
      for (var j = 0; j < arguments.length; j++) {
        var _ref3 = j < 0 || arguments.length <= j ? undefined : arguments[j],
            _ref3$data = _ref3.data,
            data = _ref3$data === void 0 ? [] : _ref3$data,
            channels = _ref3.channels;

        for (var c = 0; c < channels; c++) {
          interleaved.push(data[_i * channels + c]);
        }
      }
    }

    return interleaved;
  }

  function mergeMeshesToGeometry(meshes) {
    var vertexCount = 0;
    var indexCount = 0;
    var geometryAndMaterialIndex = [];
    var materialIndexMap = new Map();

    var _iterator = _createForOfIteratorHelper(meshes),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var mesh = _step.value;

        if (!mesh.visible) {
          continue;
        }

        var _geometry = mesh.geometry.isBufferGeometry ? cloneBufferGeometry(mesh.geometry, ['position', 'normal', 'uv']) : // BufferGeometry object
        new THREE$1.BufferGeometry().fromGeometry(mesh.geometry); // Geometry object


        var index = _geometry.getIndex();

        if (!index) {
          addFlatGeometryIndices(_geometry);
        }

        _geometry.applyMatrix(mesh.matrixWorld);

        if (!_geometry.getAttribute('normal')) {
          _geometry.computeVertexNormals();
        } else {
          _geometry.normalizeNormals();
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
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    var geometry = mergeGeometry(geometryAndMaterialIndex, vertexCount, indexCount);
    return {
      geometry: geometry,
      materials: Array.from(materialIndexMap.keys())
    };
  }

  function mergeGeometry(geometryAndMaterialIndex, vertexCount, indexCount) {
    var positionAttrib = new THREE$1.BufferAttribute(new Float32Array(3 * vertexCount), 3, false);
    var normalAttrib = new THREE$1.BufferAttribute(new Float32Array(3 * vertexCount), 3, false);
    var uvAttrib = new THREE$1.BufferAttribute(new Float32Array(2 * vertexCount), 2, false);
    var materialMeshIndexAttrib = new THREE$1.BufferAttribute(new Int32Array(2 * vertexCount), 2, false);
    var indexAttrib = new THREE$1.BufferAttribute(new Uint32Array(indexCount), 1, false);
    var mergedGeometry = new THREE$1.BufferGeometry();
    mergedGeometry.addAttribute('position', positionAttrib);
    mergedGeometry.addAttribute('normal', normalAttrib);
    mergedGeometry.addAttribute('uv', uvAttrib);
    mergedGeometry.addAttribute('materialMeshIndex', materialMeshIndexAttrib);
    mergedGeometry.setIndex(indexAttrib);
    var currentVertex = 0;
    var currentIndex = 0;
    var currentMesh = 1;

    var _iterator2 = _createForOfIteratorHelper(geometryAndMaterialIndex),
        _step2;

    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var _step2$value = _step2.value,
            geometry = _step2$value.geometry,
            materialIndex = _step2$value.materialIndex;
        var _vertexCount = geometry.getAttribute('position').count;
        mergedGeometry.merge(geometry, currentVertex);
        var meshIndex = geometry.getIndex();

        for (var i = 0; i < meshIndex.count; i++) {
          indexAttrib.setX(currentIndex + i, currentVertex + meshIndex.getX(i));
        }

        for (var _i = 0; _i < _vertexCount; _i++) {
          materialMeshIndexAttrib.setXY(currentVertex + _i, materialIndex, currentMesh);
        }

        currentVertex += _vertexCount;
        currentIndex += meshIndex.count;
        currentMesh++;
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }

    return mergedGeometry;
  } // Similar to buffergeometry.clone(), except we only copy
  // specific attributes instead of everything


  function cloneBufferGeometry(bufferGeometry, attributes) {
    var newGeometry = new THREE$1.BufferGeometry();

    var _iterator3 = _createForOfIteratorHelper(attributes),
        _step3;

    try {
      for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
        var name = _step3.value;
        var attrib = bufferGeometry.getAttribute(name);

        if (attrib) {
          newGeometry.addAttribute(name, attrib.clone());
        }
      }
    } catch (err) {
      _iterator3.e(err);
    } finally {
      _iterator3.f();
    }

    var index = bufferGeometry.getIndex();

    if (index) {
      newGeometry.setIndex(index);
    }

    return newGeometry;
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
  function bvhAccel(geometry) {
    var primitiveInfo = makePrimitiveInfo(geometry);
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

  function makePrimitiveInfo(geometry) {
    var primitiveInfo = [];
    var indices = geometry.getIndex().array;
    var position = geometry.getAttribute('position');
    var materialMeshIndex = geometry.getAttribute('materialMeshIndex');
    var v0 = new THREE$1.Vector3();
    var v1 = new THREE$1.Vector3();
    var v2 = new THREE$1.Vector3();
    var e0 = new THREE$1.Vector3();
    var e1 = new THREE$1.Vector3();

    for (var i = 0; i < indices.length; i += 3) {
      var i0 = indices[i];
      var i1 = indices[i + 1];
      var i2 = indices[i + 2];
      var bounds = new THREE$1.Box3();
      v0.fromBufferAttribute(position, i0);
      v1.fromBufferAttribute(position, i1);
      v2.fromBufferAttribute(position, i2);
      e0.subVectors(v2, v0);
      e1.subVectors(v1, v0);
      bounds.expandByPoint(v0);
      bounds.expandByPoint(v1);
      bounds.expandByPoint(v2);
      var info = {
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
      } else if (centroidBounds.max[dim] === centroidBounds.min[dim]) {
        // can't split primitives based on centroid bounds. terminate.
        return makeLeafNode(primitiveInfo.slice(start, end), bounds);
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

  // Convert image data from the RGBE format to a 32-bit floating point format
  // See https://www.cg.tuwien.ac.at/research/theses/matkovic/node84.html for a description of the RGBE format
  // Optional multiplier argument for performance optimization
  function rgbeToFloat(buffer) {
    var intensity = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var texels = buffer.length / 4;
    var floatBuffer = new Float32Array(texels * 3);
    var expTable = [];

    for (var i = 0; i < 255; i++) {
      expTable[i] = intensity * Math.pow(2, i - 128) / 255;
    }

    for (var _i = 0; _i < texels; _i++) {
      var r = buffer[4 * _i];
      var g = buffer[4 * _i + 1];
      var b = buffer[4 * _i + 2];
      var a = buffer[4 * _i + 3];
      var e = expTable[a];
      floatBuffer[3 * _i] = r * e;
      floatBuffer[3 * _i + 1] = g * e;
      floatBuffer[3 * _i + 2] = b * e;
    }

    return floatBuffer;
  }

  // Convert image data from the RGBE format to a 32-bit floating point format
  var DEFAULT_MAP_RESOLUTION = {
    width: 2048,
    height: 1024
  }; // Tools for generating and modify env maps for lighting from scene component data

  function generateBackgroundMapFromSceneBackground(background) {
    var backgroundImage;

    if (background.isColor) {
      backgroundImage = generateSolidMap(1, 1, background);
    } else if (background.encoding === THREE$1.RGBEEncoding) {
      backgroundImage = {
        width: background.image.width,
        height: background.image.height,
        data: background.image.data
      };
      backgroundImage.data = rgbeToFloat(backgroundImage.data);
    }

    return backgroundImage;
  }
  function generateEnvMapFromSceneComponents(directionalLights, ambientLights, environmentLights) {
    var envImage = initializeEnvMap(environmentLights);
    ambientLights.forEach(function (light) {
      addAmbientLightToEnvMap(light, envImage);
    });
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
      envImage.data = rgbeToFloat(envImage.data, environmentLight.intensity);
    } else {
      // initialize blank map
      envImage = generateSolidMap(DEFAULT_MAP_RESOLUTION.width, DEFAULT_MAP_RESOLUTION.height);
    }

    return envImage;
  }
  function generateSolidMap(width, height, color, intensity) {
    var texels = width * height;
    var floatBuffer = new Float32Array(texels * 3);

    if (color && color.isColor) {
      setBufferToColor(floatBuffer, color, intensity);
    }

    return {
      width: width,
      height: height,
      data: floatBuffer
    };
  }

  function setBufferToColor(buffer, color) {
    var intensity = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
    buffer.forEach(function (part, index) {
      var component = index % 3;

      if (component === 0) {
        buffer[index] = color.r * intensity;
      } else if (component === 1) {
        buffer[index] = color.g * intensity;
      } else if (component === 2) {
        buffer[index] = color.b * intensity;
      }
    });
    return buffer;
  }

  function addAmbientLightToEnvMap(light, image) {
    var color = light.color;
    image.data.forEach(function (part, index) {
      var component = index % 3;

      if (component === 0) {
        image.data[index] += color.r * light.intensity;
      } else if (component === 1) {
        image.data[index] += color.g * light.intensity;
      } else if (component === 2) {
        image.data[index] += color.b * light.intensity;
      }
    });
  }
  function addDirectionalLightToEnvMap(light, image) {
    var sphericalCoords = new THREE$1.Spherical();
    var lightDirection = light.position.clone().sub(light.target.position);
    sphericalCoords.setFromVector3(lightDirection);
    sphericalCoords.theta = Math.PI * 3 / 2 - sphericalCoords.theta;
    sphericalCoords.makeSafe();
    return addLightAtCoordinates(light, image, sphericalCoords);
  } // Perform modifications on env map to match input scene

  function addLightAtCoordinates(light, image, originCoords) {
    var floatBuffer = image.data;
    var width = image.width;
    var height = image.height;
    var xTexels = floatBuffer.length / (3 * height);
    var yTexels = floatBuffer.length / (3 * width); // default softness for standard directional lights is 0.01, i.e. a hard shadow

    var softness = light.softness || 0.01; // angle from center of light at which no more contributions are projected

    var threshold = findThreshold(softness); // if too few texels are rejected by the threshold then the time to evaluate it is no longer worth it

    var useThreshold = threshold < Math.PI / 5; // functional trick to keep the conditional check out of the main loop

    var intensityFromAngleFunction = useThreshold ? getIntensityFromAngleDifferentialThresholded : getIntensityFromAngleDifferential;
    var begunAddingContributions = false;
    var currentCoords = new THREE$1.Spherical(); // Iterates over each row from top to bottom

    for (var i = 0; i < xTexels; i++) {
      var encounteredInThisRow = false; // Iterates over each texel in row

      for (var j = 0; j < yTexels; j++) {
        var bufferIndex = j * width + i;
        currentCoords = equirectangularToSpherical(i, j, width, height, currentCoords);
        var falloff = intensityFromAngleFunction(originCoords, currentCoords, softness, threshold);

        if (falloff > 0) {
          encounteredInThisRow = true;
          begunAddingContributions = true;
        }

        var intensity = light.intensity * falloff;
        floatBuffer[bufferIndex * 3] += intensity * light.color.r;
        floatBuffer[bufferIndex * 3 + 1] += intensity * light.color.g;
        floatBuffer[bufferIndex * 3 + 2] += intensity * light.color.b;
      } // First row to not add a contribution since adding began
      // This means the entire light has been added and we can exit early


      if (!encounteredInThisRow && begunAddingContributions) {
        return floatBuffer;
      }
    }

    return floatBuffer;
  }

  function findThreshold(softness) {
    var step = Math.PI / 128;
    var maxSteps = 2.0 * Math.PI / step;

    for (var i = 0; i < maxSteps; i++) {
      var angle = i * step;
      var falloff = getFalloffAtAngle(angle, softness);

      if (falloff <= 0.0001) {
        return angle;
      }
    }
  }

  function getIntensityFromAngleDifferentialThresholded(originCoords, currentCoords, softness, threshold) {
    var deltaPhi = getAngleDelta(originCoords.phi, currentCoords.phi);
    var deltaTheta = getAngleDelta(originCoords.theta, currentCoords.theta);

    if (deltaTheta > threshold && deltaPhi > threshold) {
      return 0;
    }

    var angle = angleBetweenSphericals(originCoords, currentCoords);
    return getFalloffAtAngle(angle, softness);
  }

  function getIntensityFromAngleDifferential(originCoords, currentCoords, softness) {
    var angle = angleBetweenSphericals(originCoords, currentCoords);
    return getFalloffAtAngle(angle, softness);
  }

  function getAngleDelta(angleA, angleB) {
    var diff = Math.abs(angleA - angleB) % (2 * Math.PI);
    return diff > Math.PI ? 2 * Math.PI - diff : diff;
  }

  var angleBetweenSphericals = function () {
    var originVector = new THREE$1.Vector3();
    var currentVector = new THREE$1.Vector3();
    return function (originCoords, currentCoords) {
      originVector.setFromSpherical(originCoords);
      currentVector.setFromSpherical(currentCoords);
      return originVector.angleTo(currentVector);
    };
  }(); // TODO: possibly clean this up and optimize it
  //
  // This function was arrived at through experimentation, it provides good
  // looking results with percieved softness that scale relatively linearly with
  //  the softness value in the 0 - 1 range
  //
  // For now it doesn't incur too much of a performance penalty because for most of our use cases (lights without too much softness)
  // the threshold cutoff in getIntensityFromAngleDifferential stops us from running it too many times


  function getFalloffAtAngle(angle, softness) {
    var softnessCoefficient = Math.pow(2, 14.5 * Math.max(0.001, 1.0 - clamp(softness, 0.0, 1.0)));
    var falloff = Math.pow(softnessCoefficient, 1.1) * Math.pow(8, -softnessCoefficient * Math.pow(angle, 1.8));
    return falloff;
  }

  function equirectangularToSpherical(x, y, width, height, target) {
    target.phi = Math.PI * y / height;
    target.theta = 2.0 * Math.PI * x / width;
    return target;
  }

  // Create a piecewise 2D cumulative distribution function of light intensity from an env map
  // http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#Piecewise-Constant2DDistributions
  function envMapDistribution(image) {
    var data = image.data;
    var cdfImage = {
      width: image.width + 2,
      height: image.height + 1
    };
    var cdf = makeTextureArray$1(cdfImage.width, cdfImage.height, 2);

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

  function makeTextureArray$1(width, height, channels) {
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

  function unrollLoop(indexName, start, limit, step, code) {
    var unrolled = "int ".concat(indexName, ";\n");

    for (var i = start; step > 0 && i < limit || step < 0 && i > limit; i += step) {
      unrolled += "".concat(indexName, " = ").concat(i, ";\n");
      unrolled += code;
    }

    return unrolled;
  }

  var rayTraceCore = "\n  #define STANDARD 0\n  #define THIN_GLASS 1\n  #define THICK_GLASS 2\n  #define SHADOW_CATCHER 3\n\n  const float IOR = 1.5;\n  const float INV_IOR = 1.0 / IOR;\n\n  const float IOR_THIN = 1.015;\n  const float INV_IOR_THIN = 1.0 / IOR_THIN;\n\n  const float R0 = (1.0 - IOR) * (1.0 - IOR)  / ((1.0 + IOR) * (1.0 + IOR));\n\n  // https://www.w3.org/WAI/GL/wiki/Relative_luminance\n  const vec3 luminance = vec3(0.2126, 0.7152, 0.0722);\n\n  #define RAY_MAX_DISTANCE 9999.0\n\n  struct Ray {\n    vec3 o;\n    vec3 d;\n    vec3 invD;\n    float tMax;\n  };\n\n  struct SurfaceInteraction {\n    bool hit;\n    vec3 position;\n    vec3 normal; // smoothed normal from the three triangle vertices\n    vec3 faceNormal; // normal of the triangle\n    vec3 color;\n    float roughness;\n    float metalness;\n    int materialType;\n  };\n\n  struct Camera {\n    mat4 transform;\n    float aspect;\n    float fov;\n    float focus;\n    float aperture;\n  };\n\n  void initRay(inout Ray ray, vec3 origin, vec3 direction) {\n    ray.o = origin;\n    ray.d = direction;\n    ray.invD = 1.0 / ray.d;\n    ray.tMax = RAY_MAX_DISTANCE;\n  }\n\n  // given the index from a 1D array, retrieve corresponding position from packed 2D texture\n  ivec2 unpackTexel(int i, int columnsLog2) {\n    ivec2 u;\n    u.y = i >> columnsLog2; // equivalent to (i / 2^columnsLog2)\n    u.x = i - (u.y << columnsLog2); // equivalent to (i % 2^columnsLog2)\n    return u;\n  }\n\n  vec4 fetchData(sampler2D s, int i, int columnsLog2) {\n    return texelFetch(s, unpackTexel(i, columnsLog2), 0);\n  }\n\n  ivec4 fetchData(isampler2D s, int i, int columnsLog2) {\n    return texelFetch(s, unpackTexel(i, columnsLog2), 0);\n  }\n\n  struct Path {\n    Ray ray;\n    vec3 li;\n    float alpha;\n    vec3 beta;\n    bool specularBounce;\n    bool abort;\n    float misWeight;\n  };\n\n  uniform Camera camera;\n  uniform vec2 pixelSize; // 1 / screenResolution\n  uniform vec2 jitter;\n\n  in vec2 vCoord;\n";

  // Manually performs linear filtering if the extension OES_texture_float_linear is not supported
  var textureLinear = "\nvec4 textureLinear(sampler2D map, vec2 uv) {\n  #ifdef OES_texture_float_linear\n    return texture(map, uv);\n  #else\n    vec2 size = vec2(textureSize(map, 0));\n    vec2 texelSize = 1.0 / size;\n\n    uv = uv * size - 0.5;\n    vec2 f = fract(uv);\n    uv = floor(uv) + 0.5;\n\n    vec4 s1 = texture(map, (uv + vec2(0, 0)) * texelSize);\n    vec4 s2 = texture(map, (uv + vec2(1, 0)) * texelSize);\n    vec4 s3 = texture(map, (uv + vec2(0, 1)) * texelSize);\n    vec4 s4 = texture(map, (uv + vec2(1, 1)) * texelSize);\n\n    return mix(mix(s1, s2, f.x), mix(s3, s4, f.x), f.y);\n  #endif\n}\n";

  var intersect = "\n\nuniform sampler2D positionBuffer;\nuniform sampler2D normalBuffer;\nuniform sampler2D uvBuffer;\nuniform sampler2D bvhBuffer;\n\nstruct Triangle {\n  vec3 p0;\n  vec3 p1;\n  vec3 p2;\n};\n\nvoid surfaceInteractionFromBVH(inout SurfaceInteraction si, Triangle tri, vec3 barycentric, ivec3 index, vec3 faceNormal, int materialIndex) {\n  si.hit = true;\n  si.faceNormal = faceNormal;\n  si.position = barycentric.x * tri.p0 + barycentric.y * tri.p1 + barycentric.z * tri.p2;\n  ivec2 i0 = unpackTexel(index.x, VERTEX_COLUMNS);\n  ivec2 i1 = unpackTexel(index.y, VERTEX_COLUMNS);\n  ivec2 i2 = unpackTexel(index.z, VERTEX_COLUMNS);\n\n  vec3 n0 = texelFetch(normalBuffer, i0, 0).xyz;\n  vec3 n1 = texelFetch(normalBuffer, i1, 0).xyz;\n  vec3 n2 = texelFetch(normalBuffer, i2, 0).xyz;\n  vec3 normal = normalize(barycentric.x * n0 + barycentric.y * n1 + barycentric.z * n2);\n\n  #if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS) || defined(NUM_PBR_MAPS)\n    vec2 uv0 = texelFetch(uvBuffer, i0, 0).xy;\n    vec2 uv1 = texelFetch(uvBuffer, i1, 0).xy;\n    vec2 uv2 = texelFetch(uvBuffer, i2, 0).xy;\n    vec2 uv = fract(barycentric.x * uv0 + barycentric.y * uv1 + barycentric.z * uv2);\n  #else\n    vec2 uv = vec2(0.0);\n  #endif\n\n  si.materialType = int(getMatType(materialIndex));\n  si.color = getMatColor(materialIndex, uv);\n  si.roughness = getMatRoughness(materialIndex, uv);\n  si.metalness = getMatMetalness(materialIndex, uv);\n\n  #ifdef NUM_NORMAL_MAPS\n    vec3 dp1 = tri.p0 - tri.p2;\n    vec3 dp2 = tri.p1 - tri.p2;\n    vec2 duv1 = uv0 - uv2;\n    vec2 duv2 = uv1 - uv2;\n    si.normal = getMatNormal(materialIndex, uv, normal, dp1, dp2, duv1, duv2);\n  #else\n    si.normal = normal;\n  #endif\n}\n\nstruct TriangleIntersect {\n  float t;\n  vec3 barycentric;\n};\n\n// Triangle-ray intersection\n// Faster than the classic M\xF6ller\u2013Trumbore intersection algorithm\n// http://www.pbr-book.org/3ed-2018/Shapes/Triangle_Meshes.html#TriangleIntersection\nTriangleIntersect intersectTriangle(Ray r, Triangle tri, int maxDim, vec3 shear) {\n  TriangleIntersect ti;\n  vec3 d = r.d;\n\n  // translate vertices based on ray origin\n  vec3 p0t = tri.p0 - r.o;\n  vec3 p1t = tri.p1 - r.o;\n  vec3 p2t = tri.p2 - r.o;\n\n  // permute components of triangle vertices\n  if (maxDim == 0) {\n    p0t = p0t.yzx;\n    p1t = p1t.yzx;\n    p2t = p2t.yzx;\n  } else if (maxDim == 1) {\n    p0t = p0t.zxy;\n    p1t = p1t.zxy;\n    p2t = p2t.zxy;\n  }\n\n  // apply shear transformation to translated vertex positions\n  p0t.xy += shear.xy * p0t.z;\n  p1t.xy += shear.xy * p1t.z;\n  p2t.xy += shear.xy * p2t.z;\n\n  // compute edge function coefficients\n  vec3 e = vec3(\n    p1t.x * p2t.y - p1t.y * p2t.x,\n    p2t.x * p0t.y - p2t.y * p0t.x,\n    p0t.x * p1t.y - p0t.y * p1t.x\n  );\n\n  // check if intersection is inside triangle\n  if (any(lessThan(e, vec3(0))) && any(greaterThan(e, vec3(0)))) {\n    return ti;\n  }\n\n  float det = e.x + e.y + e.z;\n\n  // not needed?\n  // if (det == 0.) {\n  //   return ti;\n  // }\n\n  p0t.z *= shear.z;\n  p1t.z *= shear.z;\n  p2t.z *= shear.z;\n  float tScaled = (e.x * p0t.z + e.y * p1t.z + e.z * p2t.z);\n\n  // not needed?\n  // if (sign(det) != sign(tScaled)) {\n  //   return ti;\n  // }\n\n  // check if closer intersection already exists\n  if (abs(tScaled) > abs(r.tMax * det)) {\n    return ti;\n  }\n\n  float invDet = 1. / det;\n  ti.t = tScaled * invDet;\n  ti.barycentric = e * invDet;\n\n  return ti;\n}\n\nstruct Box {\n  vec3 min;\n  vec3 max;\n};\n\n// Branchless ray/box intersection\n// https://tavianator.com/fast-branchless-raybounding-box-intersections/\nfloat intersectBox(Ray r, Box b) {\n  vec3 tBot = (b.min - r.o) * r.invD;\n  vec3 tTop = (b.max - r.o) * r.invD;\n  vec3 tNear = min(tBot, tTop);\n  vec3 tFar = max(tBot, tTop);\n  float t0 = max(tNear.x, max(tNear.y, tNear.z));\n  float t1 = min(tFar.x, min(tFar.y, tFar.z));\n\n  return (t0 > t1 || t0 > r.tMax) ? -1.0 : (t0 > 0.0 ? t0 : t1);\n}\n\nint maxDimension(vec3 v) {\n  return v.x > v.y ? (v.x > v.z ? 0 : 2) : (v.y > v.z ? 1 : 2);\n}\n\n// Traverse BVH, find closest triangle intersection, and return surface information\nvoid intersectScene(inout Ray ray, inout SurfaceInteraction si) {\n  si.hit = false;\n\n  int maxDim = maxDimension(abs(ray.d));\n\n  // Permute space so that the z dimension is the one where the absolute value of the ray's direction is largest.\n  // Then create a shear transformation that aligns ray direction with the +z axis\n  vec3 shear;\n  if (maxDim == 0) {\n    shear = vec3(-ray.d.y, -ray.d.z, 1.0) * ray.invD.x;\n  } else if (maxDim == 1) {\n    shear = vec3(-ray.d.z, -ray.d.x, 1.0) * ray.invD.y;\n  } else {\n    shear = vec3(-ray.d.x, -ray.d.y, 1.0) * ray.invD.z;\n  }\n\n  int nodesToVisit[STACK_SIZE];\n  int stack = 0;\n\n  nodesToVisit[0] = 0;\n\n  while(stack >= 0) {\n    int i = nodesToVisit[stack--];\n\n    vec4 r1 = fetchData(bvhBuffer, i, BVH_COLUMNS);\n    vec4 r2 = fetchData(bvhBuffer, i + 1, BVH_COLUMNS);\n\n    int splitAxisOrNumPrimitives = floatBitsToInt(r1.w);\n\n    if (splitAxisOrNumPrimitives >= 0) {\n      // Intersection is a bounding box. Test for box intersection and keep traversing BVH\n      int splitAxis = splitAxisOrNumPrimitives;\n\n      Box bbox = Box(r1.xyz, r2.xyz);\n\n      if (intersectBox(ray, bbox) > 0.0) {\n        // traverse near node to ray first, and far node to ray last\n        if (ray.d[splitAxis] > 0.0) {\n          nodesToVisit[++stack] = floatBitsToInt(r2.w);\n          nodesToVisit[++stack] = i + 2;\n        } else {\n          nodesToVisit[++stack] = i + 2;\n          nodesToVisit[++stack] = floatBitsToInt(r2.w);\n        }\n      }\n    } else {\n      ivec3 index = floatBitsToInt(r1.xyz);\n      Triangle tri = Triangle(\n        fetchData(positionBuffer, index.x, VERTEX_COLUMNS).xyz,\n        fetchData(positionBuffer, index.y, VERTEX_COLUMNS).xyz,\n        fetchData(positionBuffer, index.z, VERTEX_COLUMNS).xyz\n      );\n      TriangleIntersect hit = intersectTriangle(ray, tri, maxDim, shear);\n\n      if (hit.t > 0.0) {\n        ray.tMax = hit.t;\n        int materialIndex = floatBitsToInt(r2.w);\n        vec3 faceNormal = r2.xyz;\n        surfaceInteractionFromBVH(si, tri, hit.barycentric, index, faceNormal, materialIndex);\n      }\n    }\n  }\n\n  // Values must be clamped outside of intersection loop. Clamping inside the loop produces incorrect numbers on some devices.\n  si.roughness = clamp(si.roughness, ROUGHNESS_MIN, 1.0);\n  si.metalness = clamp(si.metalness, 0.0, 1.0);\n}\n\nbool intersectSceneShadow(inout Ray ray) {\n  int maxDim = maxDimension(abs(ray.d));\n\n  // Permute space so that the z dimension is the one where the absolute value of the ray's direction is largest.\n  // Then create a shear transformation that aligns ray direction with the +z axis\n  vec3 shear;\n  if (maxDim == 0) {\n    shear = vec3(-ray.d.y, -ray.d.z, 1.0) * ray.invD.x;\n  } else if (maxDim == 1) {\n    shear = vec3(-ray.d.z, -ray.d.x, 1.0) * ray.invD.y;\n  } else {\n    shear = vec3(-ray.d.x, -ray.d.y, 1.0) * ray.invD.z;\n  }\n\n  int nodesToVisit[STACK_SIZE];\n  int stack = 0;\n\n  nodesToVisit[0] = 0;\n\n  while(stack >= 0) {\n    int i = nodesToVisit[stack--];\n\n    vec4 r1 = fetchData(bvhBuffer, i, BVH_COLUMNS);\n    vec4 r2 = fetchData(bvhBuffer, i + 1, BVH_COLUMNS);\n\n    int splitAxisOrNumPrimitives = floatBitsToInt(r1.w);\n\n    if (splitAxisOrNumPrimitives >= 0) {\n      int splitAxis = splitAxisOrNumPrimitives;\n\n      Box bbox = Box(r1.xyz, r2.xyz);\n\n      if (intersectBox(ray, bbox) > 0.0) {\n        if (ray.d[splitAxis] > 0.0) {\n          nodesToVisit[++stack] = floatBitsToInt(r2.w);\n          nodesToVisit[++stack] = i + 2;\n        } else {\n          nodesToVisit[++stack] = i + 2;\n          nodesToVisit[++stack] = floatBitsToInt(r2.w);\n        }\n      }\n    } else {\n      ivec3 index = floatBitsToInt(r1.xyz);\n      Triangle tri = Triangle(\n        fetchData(positionBuffer, index.x, VERTEX_COLUMNS).xyz,\n        fetchData(positionBuffer, index.y, VERTEX_COLUMNS).xyz,\n        fetchData(positionBuffer, index.z, VERTEX_COLUMNS).xyz\n      );\n\n      if (intersectTriangle(ray, tri, maxDim, shear).t > 0.0) {\n        return true;\n      }\n    }\n  }\n\n  return false;\n}\n\n";

  var surfaceInteractionDirect = "\n\n  uniform sampler2D gPosition;\n  uniform sampler2D gNormal;\n  uniform sampler2D gFaceNormal;\n  uniform sampler2D gColor;\n  uniform sampler2D gMatProps;\n\n  void surfaceInteractionDirect(vec2 coord, inout SurfaceInteraction si) {\n    vec4 positionAndMeshIndex = texture(gPosition, coord);\n\n    si.position = positionAndMeshIndex.xyz;\n\n    float meshIndex = positionAndMeshIndex.w;\n\n    vec4 normalMaterialType = texture(gNormal, coord);\n\n    si.normal = normalize(normalMaterialType.xyz);\n    si.materialType = int(normalMaterialType.w);\n\n    si.faceNormal = normalize(texture(gFaceNormal, coord).xyz);\n\n    si.color = texture(gColor, coord).rgb;\n\n    vec4 matProps = texture(gMatProps, coord);\n    si.roughness = matProps.x;\n    si.metalness = matProps.y;\n\n    si.hit = meshIndex > 0.0 ? true : false;\n  }\n";

  var random = "\n\n// Noise texture used to generate a different random number for each pixel.\n// We use blue noise in particular, but any type of noise will work.\nuniform sampler2D noiseTex;\n\nuniform float stratifiedSamples[SAMPLING_DIMENSIONS];\nuniform float strataSize;\n\n// Every time we call randomSample() in the shader, and for every call to render,\n// we want that specific bit of the shader to fetch a sample from the same position in stratifiedSamples\n// This allows us to use stratified sampling for each random variable in our path tracing\nint sampleIndex = 0;\n\nfloat pixelSeed;\n\nvoid initRandom() {\n  vec2 noiseSize = vec2(textureSize(noiseTex, 0));\n\n  // tile the small noise texture across the entire screen\n  pixelSeed = texture(noiseTex, vCoord / (pixelSize * noiseSize)).r;\n}\n\nfloat randomSample() {\n  float stratifiedSample = stratifiedSamples[sampleIndex++];\n\n  float random = fract((stratifiedSample + pixelSeed) * strataSize); // blue noise + stratified samples\n\n  // transform random number between [0, 1] to (0, 1)\n  return EPS + (1.0 - 2.0 * EPS) * random;\n}\n\nvec2 randomSampleVec2() {\n  return vec2(randomSample(), randomSample());\n}\n\nstruct MaterialSamples {\n  vec2 s1;\n  vec2 s2;\n  vec2 s3;\n};\n\nMaterialSamples getRandomMaterialSamples() {\n  MaterialSamples samples;\n\n  samples.s1 = randomSampleVec2();\n  samples.s2 = randomSampleVec2();\n  samples.s3 = randomSampleVec2();\n\n  return samples;\n}\n";

  // Sample the environment map using a cumulative distribution function as described in
  // http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Sampling_Light_Sources.html#InfiniteAreaLights
  var envMap = "\n\nuniform sampler2D envMap;\nuniform sampler2D envMapDistribution;\nuniform sampler2D backgroundMap;\n\nvec2 cartesianToEquirect(vec3 pointOnSphere) {\n  float phi = mod(atan(-pointOnSphere.z, -pointOnSphere.x), TWOPI);\n  float theta = acos(pointOnSphere.y);\n  return vec2(phi * 0.5 * INVPI, theta * INVPI);\n}\n\nfloat getEnvmapV(float u, out int vOffset, out float pdf) {\n  ivec2 size = textureSize(envMap, 0);\n\n  int left = 0;\n  int right = size.y + 1; // cdf length is the length of the env map + 1\n  while (left < right) {\n    int mid = (left + right) >> 1;\n    float s = texelFetch(envMapDistribution, ivec2(0, mid), 0).x;\n    if (s <= u) {\n      left = mid + 1;\n    } else {\n      right = mid;\n    }\n  }\n  vOffset = left - 1;\n\n  // x channel is cumulative distribution of env map luminance\n  // y channel is partial probability density of env map luminance\n  vec2 s0 = texelFetch(envMapDistribution, ivec2(0, vOffset), 0).xy;\n  vec2 s1 = texelFetch(envMapDistribution, ivec2(0, vOffset + 1), 0).xy;\n\n  pdf = s0.y;\n\n  return (float(vOffset) +  (u - s0.x) / (s1.x - s0.x)) / float(size.y);\n}\n\nfloat getEnvmapU(float u, int vOffset, out float pdf) {\n  ivec2 size = textureSize(envMap, 0);\n\n  int left = 0;\n  int right = size.x + 1; // cdf length is the length of the env map + 1\n  while (left < right) {\n    int mid = (left + right) >> 1;\n    float s = texelFetch(envMapDistribution, ivec2(1 + mid, vOffset), 0).x;\n    if (s <= u) {\n      left = mid + 1;\n    } else {\n      right = mid;\n    }\n  }\n  int uOffset = left - 1;\n\n  // x channel is cumulative distribution of env map luminance\n  // y channel is partial probability density of env map luminance\n  vec2 s0 = texelFetch(envMapDistribution, ivec2(1 + uOffset, vOffset), 0).xy;\n  vec2 s1 = texelFetch(envMapDistribution, ivec2(1 + uOffset + 1, vOffset), 0).xy;\n\n  pdf = s0.y;\n\n  return (float(uOffset) + (u - s0.x) / (s1.x - s0.x)) / float(size.x);\n}\n\n// Perform two binary searches to find light direction.\nvec3 sampleEnvmap(vec2 random, out vec2 uv, out float pdf) {\n  vec2 partialPdf;\n  int vOffset;\n\n  uv.y = getEnvmapV(random.x, vOffset, partialPdf.y);\n  uv.x = getEnvmapU(random.y, vOffset, partialPdf.x);\n\n  float phi = uv.x * TWOPI;\n  float theta = uv.y * PI;\n  float cosTheta = cos(theta);\n  float sinTheta = sin(theta);\n  float cosPhi = cos(phi);\n  float sinPhi = sin(phi);\n\n  vec3 dir = vec3(-sinTheta * cosPhi, cosTheta, -sinTheta * sinPhi);\n\n  pdf = partialPdf.x * partialPdf.y * INVPI2 / (2.0 * sinTheta);\n\n  return dir;\n}\n\nfloat envMapPdf(vec2 uv) {\n  vec2 size = vec2(textureSize(envMap, 0));\n\n  float sinTheta = sin(uv.y * PI);\n\n  uv *= size;\n\n  float partialX = texelFetch(envMapDistribution, ivec2(1.0 + uv.x, uv.y), 0).y;\n  float partialY = texelFetch(envMapDistribution, ivec2(0, uv.y), 0).y;\n\n  return partialX * partialY * INVPI2 / (2.0 * sinTheta);\n}\n\nvec3 sampleEnvmapFromDirection(vec3 d) {\n  vec2 uv = cartesianToEquirect(d);\n  return textureLinear(envMap, uv).rgb;\n}\n\nvec3 sampleBackgroundFromDirection(vec3 d) {\n  vec2 uv = cartesianToEquirect(d);\n  return textureLinear(backgroundMap, uv).rgb;\n}\n\n";

  var bsdf = "\n\n// Computes the exact value of the Fresnel factor\n// https://seblagarde.wordpress.com/2013/04/29/memo-on-fresnel-equations/\nfloat fresnel(float cosTheta, float eta, float invEta) {\n  eta = cosTheta > 0.0 ? eta : invEta;\n  cosTheta = abs(cosTheta);\n\n  float gSquared = eta * eta + cosTheta * cosTheta - 1.0;\n\n  if (gSquared < 0.0) {\n    return 1.0;\n  }\n\n  float g = sqrt(gSquared);\n\n  float a = (g - cosTheta) / (g + cosTheta);\n  float b = (cosTheta * (g + cosTheta) - 1.0) / (cosTheta * (g - cosTheta) + 1.0);\n\n  return 0.5 * a * a * (1.0 + b * b);\n}\n\nfloat fresnelSchlickWeight(float cosTheta) {\n  float w = 1.0 - cosTheta;\n  return (w * w) * (w * w) * w;\n}\n\n// Computes Schlick's approximation of the Fresnel factor\n// Assumes ray is moving from a less dense to a more dense medium\nfloat fresnelSchlick(float cosTheta, float r0) {\n  return mix(fresnelSchlickWeight(cosTheta), 1.0, r0);\n}\n\n// Computes Schlick's approximation of Fresnel factor\n// Accounts for total internal reflection if ray is moving from a more dense to a less dense medium\nfloat fresnelSchlickTIR(float cosTheta, float r0, float ni) {\n\n  // moving from a more dense to a less dense medium\n  if (cosTheta < 0.0) {\n    float inv_eta = ni;\n    float SinT2 = inv_eta * inv_eta * (1.0f - cosTheta * cosTheta);\n    if (SinT2 > 1.0) {\n        return 1.0; // total internal reflection\n    }\n    cosTheta = sqrt(1.0f - SinT2);\n  }\n\n  return mix(fresnelSchlickWeight(cosTheta), 1.0, r0);\n}\n\nfloat trowbridgeReitzD(float cosTheta, float alpha2) {\n  float e = cosTheta * cosTheta * (alpha2 - 1.0) + 1.0;\n  return alpha2 / (PI * e * e);\n}\n\nfloat trowbridgeReitzLambda(float cosTheta, float alpha2) {\n  float cos2Theta = cosTheta * cosTheta;\n  float tan2Theta = (1.0 - cos2Theta) / cos2Theta;\n  return 0.5 * (-1.0 + sqrt(1.0 + alpha2 * tan2Theta));\n}\n\n// An implementation of Disney's principled BRDF\n// https://disney-animation.s3.amazonaws.com/library/s2012_pbs_disney_brdf_notes_v2.pdf\nvec3 materialBrdf(SurfaceInteraction si, vec3 viewDir, vec3 lightDir, float cosThetaL, float diffuseWeight, out float pdf) {\n  vec3 halfVector = normalize(viewDir + lightDir);\n\n  cosThetaL = abs(cosThetaL);\n  float cosThetaV = abs(dot(si.normal, viewDir));\n  float cosThetaH = abs(dot(si.normal, halfVector));\n  float cosThetaD = abs(dot(lightDir, halfVector));\n\n  float alpha2 = (si.roughness * si.roughness) * (si.roughness * si.roughness);\n\n  float F = fresnelSchlick(cosThetaD, mix(R0, 0.6, si.metalness));\n  float D = trowbridgeReitzD(cosThetaH, alpha2);\n\n  float roughnessRemapped = 0.5 + 0.5 * si.roughness;\n  float alpha2Remapped = (roughnessRemapped * roughnessRemapped) * (roughnessRemapped * roughnessRemapped);\n\n  float G = 1.0 / (1.0 + trowbridgeReitzLambda(cosThetaV, alpha2Remapped) + trowbridgeReitzLambda(cosThetaL, alpha2Remapped));\n\n  float specular = F * D * G / (4.0 * cosThetaV * cosThetaL);\n  float specularPdf = D * cosThetaH / (4.0 * cosThetaD);\n\n  float f = -0.5 + 2.0 * cosThetaD * cosThetaD * si.roughness;\n  float diffuse = diffuseWeight * INVPI * (1.0 + f * fresnelSchlickWeight(cosThetaL)) * (1.0 + f * fresnelSchlickWeight(cosThetaV));\n  float diffusePdf = cosThetaL * INVPI;\n\n  pdf = mix(0.5 * (specularPdf + diffusePdf), specularPdf, si.metalness);\n\n  return mix(si.color * diffuse + specular, si.color * specular, si.metalness);\n}\n\n";

  var sample = "\n\n// https://graphics.pixar.com/library/OrthonormalB/paper.pdf\nmat3 orthonormalBasis(vec3 n) {\n  float zsign = n.z >= 0.0 ? 1.0 : -1.0;\n  float a = -1.0 / (zsign + n.z);\n  float b = n.x * n.y * a;\n  vec3 s = vec3(1.0 + zsign * n.x * n.x * a, zsign * b, -zsign * n.x);\n  vec3 t = vec3(b, zsign + n.y * n.y * a, -n.y);\n  return mat3(s, t, n);\n}\n\n// http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#SamplingaUnitDisk\nvec2 sampleCircle(vec2 p) {\n  p = 2.0 * p - 1.0;\n\n  bool greater = abs(p.x) > abs(p.y);\n\n  float r = greater ? p.x : p.y;\n  float theta = greater ? 0.25 * PI * p.y / p.x : PI * (0.5 - 0.25 * p.x / p.y);\n\n  return r * vec2(cos(theta), sin(theta));\n}\n\n// http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#Cosine-WeightedHemisphereSampling\nvec3 cosineSampleHemisphere(vec2 p) {\n  vec2 h = sampleCircle(p);\n  float z = sqrt(max(0.0, 1.0 - h.x * h.x - h.y * h.y));\n  return vec3(h, z);\n}\n\n\n// http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Sampling_Reflection_Functions.html#MicrofacetBxDFs\n// Instead of Beckmann distrubtion, we use the GTR2 (GGX) distrubtion as covered in Disney's Principled BRDF paper\nvec3 lightDirSpecular(vec3 faceNormal, vec3 viewDir, mat3 basis, float roughness, vec2 random) {\n  float phi = TWOPI * random.y;\n  float alpha = roughness * roughness;\n  float cosTheta = sqrt((1.0 - random.x) / (1.0 + (alpha * alpha - 1.0) * random.x));\n  float sinTheta = sqrt(1.0 - cosTheta * cosTheta);\n\n  vec3 halfVector = basis * sign(dot(faceNormal, viewDir)) * vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);\n\n  vec3 lightDir = reflect(-viewDir, halfVector);\n\n  return lightDir;\n}\n\nvec3 lightDirDiffuse(vec3 faceNormal, vec3 viewDir, mat3 basis, vec2 random) {\n  return basis * sign(dot(faceNormal, viewDir)) * cosineSampleHemisphere(random);\n}\n\nfloat powerHeuristic(float f, float g) {\n  return (f * f) / (f * f + g * g);\n}\n\n";

  // Estimate the direct lighting integral using multiple importance sampling
  // http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Direct_Lighting.html#EstimatingtheDirectLightingIntegral
  var sampleMaterial = "\n\nvoid sampleMaterial(SurfaceInteraction si, int bounce, inout Path path) {\n  bool lastBounce = bounce == BOUNCES;\n  mat3 basis = orthonormalBasis(si.normal);\n  vec3 viewDir = -path.ray.d;\n\n  MaterialSamples samples = getRandomMaterialSamples();\n\n  vec2 diffuseOrSpecular = samples.s1;\n  vec2 lightDirSample = samples.s2;\n  vec2 bounceDirSample = samples.s3;\n\n  // Step 1: Add direct illumination of the light source (the hdr map)\n  // On every bounce but the last, importance sample the light source\n  // On the last bounce, multiple importance sample the brdf AND the light source, determined by random var\n\n  vec3 lightDir;\n  vec2 uv;\n  float lightPdf;\n  bool brdfSample = false;\n\n  if (lastBounce && diffuseOrSpecular.x < 0.5) {\n    // reuse this sample by multiplying by 2 to bring sample from [0, 0.5), to [0, 1)\n    lightDir = 2.0 * diffuseOrSpecular.x < mix(0.5, 0.0, si.metalness) ?\n      lightDirDiffuse(si.faceNormal, viewDir, basis, lightDirSample) :\n      lightDirSpecular(si.faceNormal, viewDir, basis, si.roughness, lightDirSample);\n\n    uv = cartesianToEquirect(lightDir);\n    lightPdf = envMapPdf(uv);\n    brdfSample = true;\n  } else {\n    lightDir = sampleEnvmap(lightDirSample, uv, lightPdf);\n  }\n\n  float cosThetaL = dot(si.normal, lightDir);\n\n  float occluded = 1.0;\n\n  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;\n  if (orientation < 0.0) {\n    // light dir points towards surface. invalid dir.\n    occluded = 0.0;\n  }\n\n  float diffuseWeight = 1.0;\n\n  initRay(path.ray, si.position + EPS * lightDir, lightDir);\n  if (intersectSceneShadow(path.ray)) {\n    if (lastBounce) {\n      diffuseWeight = 0.0;\n    } else {\n      occluded = 0.0;\n    }\n  }\n\n  vec3 irr = textureLinear(envMap, uv).rgb;\n\n  float scatteringPdf;\n  vec3 brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, diffuseWeight, scatteringPdf);\n\n  float weight;\n  if (lastBounce) {\n    weight = brdfSample ?\n      2.0 * powerHeuristic(scatteringPdf, lightPdf) / scatteringPdf :\n      2.0 * powerHeuristic(lightPdf, scatteringPdf) / lightPdf;\n  } else {\n    weight = powerHeuristic(lightPdf, scatteringPdf) / lightPdf;\n  }\n\n  path.li += path.beta * occluded * brdf * irr * abs(cosThetaL) * weight;;\n\n  // Step 2: Setup ray direction for next bounce by importance sampling the BRDF\n\n  if (lastBounce) {\n    return;\n  }\n\n  lightDir = diffuseOrSpecular.y < mix(0.5, 0.0, si.metalness) ?\n    lightDirDiffuse(si.faceNormal, viewDir, basis, bounceDirSample) :\n    lightDirSpecular(si.faceNormal, viewDir, basis, si.roughness, bounceDirSample);\n\n  cosThetaL = dot(si.normal, lightDir);\n\n  orientation = dot(si.faceNormal, viewDir) * cosThetaL;\n  path.abort = orientation < 0.0;\n\n  if (path.abort) {\n    return;\n  }\n\n  brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, 1.0, scatteringPdf);\n\n  uv = cartesianToEquirect(lightDir);\n  lightPdf = envMapPdf(uv);\n\n  path.misWeight = powerHeuristic(scatteringPdf, lightPdf);\n\n  path.beta *= abs(cosThetaL) * brdf / scatteringPdf;\n\n  path.specularBounce = false;\n\n  initRay(path.ray, si.position + EPS * lightDir, lightDir);\n}\n";

  var sampleShadowCatcher = "\n\n#ifdef USE_SHADOW_CATCHER\n\nvoid sampleShadowCatcher(SurfaceInteraction si, int bounce, inout Path path) {\n  bool lastBounce = bounce == BOUNCES;\n  mat3 basis = orthonormalBasis(si.normal);\n  vec3 viewDir = -path.ray.d;\n  vec3 color = bounce == 1  || path.specularBounce ? sampleBackgroundFromDirection(-viewDir) : sampleEnvmapFromDirection(-viewDir);\n\n  si.color = vec3(1, 1, 1);\n\n  MaterialSamples samples = getRandomMaterialSamples();\n\n  vec2 diffuseOrSpecular = samples.s1;\n  vec2 lightDirSample = samples.s2;\n  vec2 bounceDirSample = samples.s3;\n\n  vec3 lightDir;\n  vec2 uv;\n  float lightPdf;\n  bool brdfSample = false;\n\n  if (diffuseOrSpecular.x < 0.5) {\n    lightDir = 2.0 * diffuseOrSpecular.x < mix(0.5, 0.0, si.metalness) ?\n      lightDirDiffuse(si.faceNormal, viewDir, basis, lightDirSample) :\n      lightDirSpecular(si.faceNormal, viewDir, basis, si.roughness, lightDirSample);\n    uv = cartesianToEquirect(lightDir);\n    lightPdf = envMapPdf(uv);\n    brdfSample = true;\n  } else {\n    lightDir = sampleEnvmap(lightDirSample, uv, lightPdf);\n  }\n\n  float cosThetaL = dot(si.normal, lightDir);\n\n  float liContrib = 1.0;\n\n  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;\n  if (orientation < 0.0) {\n    liContrib = 0.0;\n  }\n\n  float occluded = 1.0;\n  initRay(path.ray, si.position + EPS * lightDir, lightDir);\n  if (intersectSceneShadow(path.ray)) {\n    occluded = 0.0;\n  }\n\n  float irr = dot(luminance, textureLinear(envMap, uv).rgb);\n\n  float scatteringPdf;\n  vec3 brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, 1.0, scatteringPdf);\n\n  float weight = brdfSample ?\n    2.0 * powerHeuristic(scatteringPdf, lightPdf) / scatteringPdf :\n    2.0 * powerHeuristic(lightPdf, scatteringPdf) / lightPdf;\n\n  float liEq = liContrib * brdf.r * irr * abs(cosThetaL) * weight;\n\n  float alpha = liEq;\n  path.alpha *= alpha;\n  path.li *= alpha;\n\n  path.li += occluded * path.beta * color * liEq;\n\n  if (lastBounce) {\n    return;\n  }\n\n  lightDir = diffuseOrSpecular.y < mix(0.5, 0.0, si.metalness) ?\n    lightDirDiffuse(si.faceNormal, viewDir, basis, bounceDirSample) :\n    lightDirSpecular(si.faceNormal, viewDir, basis, si.roughness, bounceDirSample);\n\n  cosThetaL = dot(si.normal, lightDir);\n\n  orientation = dot(si.faceNormal, viewDir) * cosThetaL;\n  path.abort = orientation < 0.0;\n\n  if (path.abort) {\n    return;\n  }\n\n  brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, 1.0, scatteringPdf);\n\n  uv = cartesianToEquirect(lightDir);\n  lightPdf = envMapPdf(uv);\n\n  path.misWeight = 0.0;\n\n  path.beta = color * abs(cosThetaL) * brdf.r / scatteringPdf;\n\n  path.specularBounce = false;\n\n  initRay(path.ray, si.position + EPS * lightDir, lightDir);\n}\n\n#endif\n\n";

  var sampleGlass = "\n\n#ifdef USE_GLASS\n\nvoid sampleGlassSpecular(SurfaceInteraction si, int bounce, inout Path path) {\n  bool lastBounce = bounce == BOUNCES;\n  vec3 viewDir = -path.ray.d;\n  float cosTheta = dot(si.normal, viewDir);\n\n  MaterialSamples samples = getRandomMaterialSamples();\n\n  float reflectionOrRefraction = samples.s1.x;\n\n  float F = si.materialType == THIN_GLASS ?\n    fresnelSchlick(abs(cosTheta), R0) : // thin glass\n    fresnelSchlickTIR(cosTheta, R0, IOR); // thick glass\n\n  vec3 lightDir;\n\n  if (reflectionOrRefraction < F) {\n    lightDir = reflect(-viewDir, si.normal);\n  } else {\n    lightDir = si.materialType == THIN_GLASS ?\n      refract(-viewDir, sign(cosTheta) * si.normal, INV_IOR_THIN) : // thin glass\n      refract(-viewDir, sign(cosTheta) * si.normal, cosTheta < 0.0 ? IOR : INV_IOR); // thick glass\n    path.beta *= si.color;\n  }\n\n  path.misWeight = 1.0;\n\n  initRay(path.ray, si.position + EPS * lightDir, lightDir);\n\n  path.li += lastBounce ? path.beta * sampleBackgroundFromDirection(lightDir) : vec3(0.0);\n\n  path.specularBounce = true;\n}\n\n#endif\n\n";

  var fragment$1 = {
    includes: [constants$1, rayTraceCore, textureLinear, materialBuffer, intersect, surfaceInteractionDirect, random, envMap, bsdf, sample, sampleMaterial, sampleGlass, sampleShadowCatcher],
    outputs: ['light'],
    source: function source(defines) {
      return "\n  void bounce(inout Path path, int i, inout SurfaceInteraction si) {\n\n    if (!si.hit) {\n      vec3 irr = path.specularBounce ? sampleBackgroundFromDirection(path.ray.d) : sampleEnvmapFromDirection(path.ray.d);\n\n      // hit a light source (the hdr map)\n      // add contribution from light source\n      // path.misWeight is the multiple importance sampled weight of this light source\n      path.li += path.misWeight * path.beta * irr;\n      path.abort = true;\n      return;\n    }\n\n    #ifdef USE_GLASS\n      if (si.materialType == THIN_GLASS || si.materialType == THICK_GLASS) {\n        sampleGlassSpecular(si, i, path);\n      }\n    #endif\n    #ifdef USE_SHADOW_CATCHER\n      if (si.materialType == SHADOW_CATCHER) {\n        sampleShadowCatcher(si, i, path);\n      }\n    #endif\n    if (si.materialType == STANDARD) {\n      sampleMaterial(si, i, path);\n    }\n\n    // Russian Roulette sampling\n    if (i >= 2) {\n      float q = 1.0 - dot(path.beta, luminance);\n      if (randomSample() < q) {\n        path.abort = true;\n      }\n      path.beta /= 1.0 - q;\n    }\n\n  }\n\n  // Path tracing integrator as described in\n  // http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Path_Tracing.html#\n  vec4 integrator(inout Ray ray) {\n    Path path;\n    path.ray = ray;\n    path.li = vec3(0);\n    path.alpha = 1.0;\n    path.beta = vec3(1.0);\n    path.specularBounce = true;\n    path.abort = false;\n    path.misWeight = 1.0;\n\n    SurfaceInteraction si;\n\n    // first surface interaction from g-buffer\n    surfaceInteractionDirect(vCoord, si);\n\n    // first surface interaction from ray interesction\n    // intersectScene(path.ray, si);\n\n    bounce(path, 1, si);\n\n    // Manually unroll for loop.\n    // Some hardware fails to iterate over a GLSL loop, so we provide this workaround\n    // for (int i = 1; i < defines.bounces + 1, i += 1)\n    // equivelant to\n    ".concat(unrollLoop('i', 2, defines.BOUNCES + 1, 1, "\n      if (path.abort) {\n        return vec4(path.li, path.alpha);\n      }\n      intersectScene(path.ray, si);\n      bounce(path, i, si);\n    "), "\n\n    return vec4(path.li, path.alpha);\n  }\n\n  void main() {\n    initRandom();\n\n    vec2 vCoordAntiAlias = vCoord + jitter;\n\n    vec3 direction = normalize(vec3(vCoordAntiAlias - 0.5, -1.0) * vec3(camera.aspect, 1.0, camera.fov));\n\n    // Thin lens model with depth-of-field\n    // http://www.pbr-book.org/3ed-2018/Camera_Models/Projective_Camera_Models.html#TheThinLensModelandDepthofField\n    // vec2 lensPoint = camera.aperture * sampleCircle(randomSampleVec2());\n    // vec3 focusPoint = -direction * camera.focus / direction.z; // intersect ray direction with focus plane\n\n    // vec3 origin = vec3(lensPoint, 0.0);\n    // direction = normalize(focusPoint - origin);\n\n    // origin = vec3(camera.transform * vec4(origin, 1.0));\n    // direction = mat3(camera.transform) * direction;\n\n    vec3 origin = camera.transform[3].xyz;\n    direction = mat3(camera.transform) * direction;\n\n    Ray cam;\n    initRay(cam, origin, direction);\n\n    vec4 liAndAlpha = integrator(cam);\n\n    if (!(liAndAlpha.x < INF && liAndAlpha.x > -EPS)) {\n      liAndAlpha = vec4(0, 0, 0, 1);\n    }\n\n    out_light = liAndAlpha;\n\n    // Stratified Sampling Sample Count Test\n    // ---------------\n    // Uncomment the following code\n    // Then observe the colors of the image\n    // If:\n    // * The resulting image is pure black\n    //   Extra samples are being passed to the shader that aren't being used.\n    // * The resulting image contains red\n    //   Not enough samples are being passed to the shader\n    // * The resulting image contains only white with some black\n    //   All samples are used by the shader. Correct result!\n\n    // out_light = vec4(0, 0, 0, 1);\n    // if (sampleIndex == SAMPLING_DIMENSIONS) {\n    //   out_light = vec4(1, 1, 1, 1);\n    // } else if (sampleIndex > SAMPLING_DIMENSIONS) {\n    //   out_light = vec4(1, 0, 0, 1);\n    // }\n}\n");
    }
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

  function makeStratifiedSamplerCombined(strataCount, listOfDimensions) {
    var strataObjs = [];

    var _iterator = _createForOfIteratorHelper(listOfDimensions),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var dim = _step.value;
        strataObjs.push(makeStratifiedSampler(strataCount, dim));
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    var combined = [];

    function next() {
      var i = 0;

      var _iterator2 = _createForOfIteratorHelper(strataObjs),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var strata = _step2.value;
          var nums = strata.next();

          var _iterator3 = _createForOfIteratorHelper(nums),
              _step3;

          try {
            for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
              var num = _step3.value;
              combined[i++] = num;
            }
          } catch (err) {
            _iterator3.e(err);
          } finally {
            _iterator3.f();
          }
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      return combined;
    }

    function restart() {
      var _iterator4 = _createForOfIteratorHelper(strataObjs),
          _step4;

      try {
        for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
          var strata = _step4.value;
          strata.restart();
        }
      } catch (err) {
        _iterator4.e(err);
      } finally {
        _iterator4.f();
      }
    }

    return {
      next: next,
      restart: restart,
      strataCount: strataCount
    };
  }

  function makeRayTracePass(gl, _ref) {
    var bounces = _ref.bounces,
        decomposedScene = _ref.decomposedScene,
        fullscreenQuad = _ref.fullscreenQuad,
        materialBuffer = _ref.materialBuffer,
        mergedMesh = _ref.mergedMesh,
        optionalExtensions = _ref.optionalExtensions;
    bounces = clamp(bounces, 1, 6);
    var samplingDimensions = [];

    for (var i = 1; i <= bounces; i++) {
      // specular or diffuse reflection, light importance sampling, next path direction
      samplingDimensions.push(2, 2, 2);

      if (i >= 2) {
        // russian roulette sampling
        // this step is skipped on the first bounce
        samplingDimensions.push(1);
      }
    }

    var samples;
    var renderPass = makeRenderPassFromScene({
      bounces: bounces,
      decomposedScene: decomposedScene,
      fullscreenQuad: fullscreenQuad,
      gl: gl,
      materialBuffer: materialBuffer,
      mergedMesh: mergedMesh,
      optionalExtensions: optionalExtensions,
      samplingDimensions: samplingDimensions
    });

    function setSize(width, height) {
      renderPass.setUniform('pixelSize', 1 / width, 1 / height);
    } // noiseImage is a 32-bit PNG image


    function setNoise(noiseImage) {
      renderPass.setTexture('noiseTex', makeTexture(gl, {
        data: noiseImage,
        wrapS: gl.REPEAT,
        wrapT: gl.REPEAT,
        storage: 'halfFloat'
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

    function setGBuffers(_ref2) {
      var position = _ref2.position,
          normal = _ref2.normal,
          faceNormal = _ref2.faceNormal,
          color = _ref2.color,
          matProps = _ref2.matProps;
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
      bindTextures: bindTextures,
      draw: draw,
      nextSeed: nextSeed,
      outputLocs: renderPass.outputLocs,
      setCamera: setCamera,
      setJitter: setJitter,
      setGBuffers: setGBuffers,
      setNoise: setNoise,
      setSize: setSize,
      setStrataCount: setStrataCount
    };
  }

  function makeRenderPassFromScene(_ref3) {
    var bounces = _ref3.bounces,
        decomposedScene = _ref3.decomposedScene,
        fullscreenQuad = _ref3.fullscreenQuad,
        gl = _ref3.gl,
        materialBuffer = _ref3.materialBuffer,
        mergedMesh = _ref3.mergedMesh,
        optionalExtensions = _ref3.optionalExtensions,
        samplingDimensions = _ref3.samplingDimensions;
    var OES_texture_float_linear = optionalExtensions.OES_texture_float_linear;
    var background = decomposedScene.background,
        directionalLights = decomposedScene.directionalLights,
        ambientLights = decomposedScene.ambientLights,
        environmentLights = decomposedScene.environmentLights;
    var geometry = mergedMesh.geometry,
        materials = mergedMesh.materials,
        materialIndices = mergedMesh.materialIndices; // create bounding volume hierarchy from a static scene

    var bvh = bvhAccel(geometry);
    var flattenedBvh = flattenBvh(bvh);
    var numTris = geometry.index.count / 3;
    var renderPass = makeRenderPass(gl, {
      defines: _objectSpread2({
        OES_texture_float_linear: OES_texture_float_linear,
        BVH_COLUMNS: textureDimensionsFromArray(flattenedBvh.count).columnsLog,
        INDEX_COLUMNS: textureDimensionsFromArray(numTris).columnsLog,
        VERTEX_COLUMNS: textureDimensionsFromArray(geometry.attributes.position.count).columnsLog,
        STACK_SIZE: flattenedBvh.maxDepth,
        BOUNCES: bounces,
        USE_GLASS: materials.some(function (m) {
          return m.transparent;
        }),
        USE_SHADOW_CATCHER: materials.some(function (m) {
          return m.shadowCatcher;
        }),
        SAMPLING_DIMENSIONS: samplingDimensions.reduce(function (a, b) {
          return a + b;
        })
      }, materialBuffer.defines),
      fragment: fragment$1,
      vertex: fullscreenQuad.vertexShader
    });
    renderPass.setTexture('diffuseMap', materialBuffer.textures.diffuseMap);
    renderPass.setTexture('normalMap', materialBuffer.textures.normalMap);
    renderPass.setTexture('pbrMap', materialBuffer.textures.pbrMap);
    renderPass.setTexture('positionBuffer', makeDataTexture(gl, geometry.getAttribute('position').array, 3));
    renderPass.setTexture('normalBuffer', makeDataTexture(gl, geometry.getAttribute('normal').array, 3));
    renderPass.setTexture('uvBuffer', makeDataTexture(gl, geometry.getAttribute('uv').array, 2));
    renderPass.setTexture('bvhBuffer', makeDataTexture(gl, flattenedBvh.buffer, 4));
    var envImage = generateEnvMapFromSceneComponents(directionalLights, ambientLights, environmentLights);
    var envImageTextureObject = makeTexture(gl, {
      data: envImage.data,
      storage: 'halfFloat',
      minFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
      magFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
      width: envImage.width,
      height: envImage.height
    });
    renderPass.setTexture('envMap', envImageTextureObject);
    var backgroundImageTextureObject;

    if (background) {
      var backgroundImage = generateBackgroundMapFromSceneBackground(background);
      backgroundImageTextureObject = makeTexture(gl, {
        data: backgroundImage.data,
        storage: 'halfFloat',
        minFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
        magFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
        width: backgroundImage.width,
        height: backgroundImage.height
      });
    } else {
      backgroundImageTextureObject = envImageTextureObject;
    }

    renderPass.setTexture('backgroundMap', backgroundImageTextureObject);
    var distribution = envMapDistribution(envImage);
    renderPass.setTexture('envMapDistribution', makeTexture(gl, {
      data: distribution.data,
      storage: 'halfFloat',
      width: distribution.width,
      height: distribution.height
    }));
    return renderPass;
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
      width: textureDim.columns,
      height: textureDim.rows
    });
  } // expand array to the given length


  function padArray(typedArray, length) {
    var newArray = new typedArray.constructor(length);
    newArray.set(typedArray);
    return newArray;
  }

  function makeRenderSize(gl) {
    var desiredMsPerFrame = 20;
    var fullWidth;
    var fullHeight;
    var renderWidth;
    var renderHeight;
    var scale = new THREE$1.Vector2(1, 1);
    var pixelsPerFrame = pixelsPerFrameEstimate(gl);

    function setSize(w, h) {
      fullWidth = w;
      fullHeight = h;
      calcDimensions();
    }

    function calcDimensions() {
      var aspectRatio = fullWidth / fullHeight;
      renderWidth = Math.round(clamp(Math.sqrt(pixelsPerFrame * aspectRatio), 1, fullWidth));
      renderHeight = Math.round(clamp(renderWidth / aspectRatio, 1, fullHeight));
      scale.set(renderWidth / fullWidth, renderHeight / fullHeight);
    }

    function adjustSize(elapsedFrameMs) {
      if (!elapsedFrameMs) {
        return;
      } // tweak to find balance. higher = faster convergence, lower = less fluctuations to microstutters


      var strength = 600;
      var error = desiredMsPerFrame - elapsedFrameMs;
      pixelsPerFrame += strength * error;
      pixelsPerFrame = clamp(pixelsPerFrame, 8192, fullWidth * fullHeight);
      calcDimensions();
    }

    return {
      adjustSize: adjustSize,
      setSize: setSize,
      scale: scale,

      get width() {
        return renderWidth;
      },

      get height() {
        return renderHeight;
      }

    };
  }

  function pixelsPerFrameEstimate(gl) {
    var maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);

    if (maxRenderbufferSize <= 8192) {
      return 80000;
    } else if (maxRenderbufferSize === 16384) {
      return 150000;
    } else if (maxRenderbufferSize >= 32768) {
      return 400000;
    }
  }

  var fragment$2 = {
    outputs: ['light'],
    includes: [textureLinear],
    source: "\n  in vec2 vCoord;\n\n  uniform mediump sampler2D lightTex;\n  uniform mediump sampler2D positionTex;\n  uniform vec2 lightScale;\n  uniform vec2 previousLightScale;\n\n  uniform mediump sampler2D previousLightTex;\n  uniform mediump sampler2D previousPositionTex;\n\n  uniform mat4 historyCamera;\n  uniform float blendAmount;\n  uniform vec2 jitter;\n\n  vec2 reproject(vec3 position) {\n    vec4 historyCoord = historyCamera * vec4(position, 1.0);\n    return 0.5 * historyCoord.xy / historyCoord.w + 0.5;\n  }\n\n  float getMeshId(sampler2D meshIdTex, vec2 vCoord) {\n    return floor(texture(meshIdTex, vCoord).w);\n  }\n\n  void main() {\n    vec3 currentPosition = textureLinear(positionTex, vCoord).xyz;\n    float currentMeshId = getMeshId(positionTex, vCoord);\n\n    vec4 currentLight = texture(lightTex, lightScale * vCoord);\n\n    if (currentMeshId == 0.0) {\n      out_light = currentLight;\n      return;\n    }\n\n    vec2 hCoord = reproject(currentPosition) - jitter;\n\n    vec2 hSizef = previousLightScale * vec2(textureSize(previousLightTex, 0));\n    vec2 hSizeInv = 1.0 / hSizef;\n    ivec2 hSize = ivec2(hSizef);\n\n    vec2 hTexelf = hCoord * hSizef - 0.5;\n    ivec2 hTexel = ivec2(hTexelf);\n    vec2 f = fract(hTexelf);\n\n    ivec2 texel[] = ivec2[](\n      hTexel + ivec2(0, 0),\n      hTexel + ivec2(1, 0),\n      hTexel + ivec2(0, 1),\n      hTexel + ivec2(1, 1)\n    );\n\n    float weights[] = float[](\n      (1.0 - f.x) * (1.0 - f.y),\n      f.x * (1.0 - f.y),\n      (1.0 - f.x) * f.y,\n      f.x * f.y\n    );\n\n    vec4 history;\n    float sum;\n\n    // bilinear sampling, rejecting samples that don't have a matching mesh id\n    for (int i = 0; i < 4; i++) {\n      vec2 gCoord = (vec2(texel[i]) + 0.5) * hSizeInv;\n\n      float histMeshId = getMeshId(previousPositionTex, gCoord);\n\n      float isValid = histMeshId != currentMeshId || any(greaterThanEqual(texel[i], hSize)) ? 0.0 : 1.0;\n\n      float weight = isValid * weights[i];\n      history += weight * texelFetch(previousLightTex, texel[i], 0);\n      sum += weight;\n    }\n\n    if (sum > 0.0) {\n      history /= sum;\n    } else {\n      // If all samples of bilinear fail, try a 3x3 box filter\n      hTexel = ivec2(hTexelf + 0.5);\n\n      for (int x = -1; x <= 1; x++) {\n        for (int y = -1; y <= 1; y++) {\n          ivec2 texel = hTexel + ivec2(x, y);\n          vec2 gCoord = (vec2(texel) + 0.5) * hSizeInv;\n\n          float histMeshId = getMeshId(previousPositionTex, gCoord);\n\n          float isValid = histMeshId != currentMeshId || any(greaterThanEqual(texel, hSize)) ? 0.0 : 1.0;\n\n          float weight = isValid;\n          vec4 h = texelFetch(previousLightTex, texel, 0);\n          history += weight * h;\n          sum += weight;\n        }\n      }\n      history = sum > 0.0 ? history / sum : history;\n    }\n\n    if (history.w > MAX_SAMPLES) {\n      history.xyz *= MAX_SAMPLES / history.w;\n      history.w = MAX_SAMPLES;\n    }\n\n    out_light = blendAmount * history + currentLight;\n  }\n"
  };

  function makeReprojectPass(gl, params) {
    var fullscreenQuad = params.fullscreenQuad,
        maxReprojectedSamples = params.maxReprojectedSamples;
    var renderPass = makeRenderPass(gl, {
      defines: {
        MAX_SAMPLES: maxReprojectedSamples.toFixed(1)
      },
      vertex: fullscreenQuad.vertexShader,
      fragment: fragment$2
    });
    var historyCamera = new THREE$1.Matrix4();

    function setPreviousCamera(camera) {
      historyCamera.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      renderPass.setUniform('historyCamera', historyCamera.elements);
    }

    function setJitter(x, y) {
      renderPass.setUniform('jitter', x, y);
    }

    function draw(params) {
      var blendAmount = params.blendAmount,
          light = params.light,
          lightScale = params.lightScale,
          position = params.position,
          previousLight = params.previousLight,
          previousLightScale = params.previousLightScale,
          previousPosition = params.previousPosition;
      renderPass.setUniform('blendAmount', blendAmount);
      renderPass.setUniform('lightScale', lightScale.x, lightScale.y);
      renderPass.setUniform('previousLightScale', previousLightScale.x, previousLightScale.y);
      renderPass.setTexture('lightTex', light);
      renderPass.setTexture('positionTex', position);
      renderPass.setTexture('previousLightTex', previousLight);
      renderPass.setTexture('previousPositionTex', previousPosition);
      renderPass.useProgram();
      fullscreenQuad.draw();
    }

    return {
      draw: draw,
      setJitter: setJitter,
      setPreviousCamera: setPreviousCamera
    };
  }

  var fragment$3 = {
    includes: [textureLinear],
    outputs: ['color'],
    source: "\n  in vec2 vCoord;\n\n  uniform sampler2D lightTex;\n  uniform sampler2D positionTex;\n\n  uniform vec2 lightScale;\n\n  // Tonemapping functions from THREE.js\n\n  vec3 linear(vec3 color) {\n    return color;\n  }\n  // https://www.cs.utah.edu/~reinhard/cdrom/\n  vec3 reinhard(vec3 color) {\n    return clamp(color / (vec3(1.0) + color), vec3(0.0), vec3(1.0));\n  }\n  // http://filmicworlds.com/blog/filmic-tonemapping-operators/\n  #define uncharted2Helper(x) max(((x * (0.15 * x + 0.10 * 0.50) + 0.20 * 0.02) / (x * (0.15 * x + 0.50) + 0.20 * 0.30)) - 0.02 / 0.30, vec3(0.0))\n  const vec3 uncharted2WhitePoint = 1.0 / uncharted2Helper(vec3(WHITE_POINT));\n  vec3 uncharted2( vec3 color ) {\n    // John Hable's filmic operator from Uncharted 2 video game\n    return clamp(uncharted2Helper(color) * uncharted2WhitePoint, vec3(0.0), vec3(1.0));\n  }\n  // http://filmicworlds.com/blog/filmic-tonemapping-operators/\n  vec3 cineon( vec3 color ) {\n    // optimized filmic operator by Jim Hejl and Richard Burgess-Dawson\n    color = max(vec3( 0.0 ), color - 0.004);\n    return pow((color * (6.2 * color + 0.5)) / (color * (6.2 * color + 1.7) + 0.06), vec3(2.2));\n  }\n  // https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/\n  vec3 acesFilmic( vec3 color ) {\n    return clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), vec3(0.0), vec3(1.0));\n  }\n\n  #ifdef EDGE_PRESERVING_UPSCALE\n\n  float getMeshId(sampler2D meshIdTex, vec2 vCoord) {\n    return floor(texture(meshIdTex, vCoord).w);\n  }\n\n  vec4 getUpscaledLight(vec2 coord) {\n    float meshId = getMeshId(positionTex, coord);\n\n    vec2 sizef = lightScale * vec2(textureSize(positionTex, 0));\n    vec2 texelf = coord * sizef - 0.5;\n    ivec2 texel = ivec2(texelf);\n    vec2 f = fract(texelf);\n\n    ivec2 texels[] = ivec2[](\n      texel + ivec2(0, 0),\n      texel + ivec2(1, 0),\n      texel + ivec2(0, 1),\n      texel + ivec2(1, 1)\n    );\n\n    float weights[] = float[](\n      (1.0 - f.x) * (1.0 - f.y),\n      f.x * (1.0 - f.y),\n      (1.0 - f.x) * f.y,\n      f.x * f.y\n    );\n\n    vec4 upscaledLight;\n    float sum;\n    for (int i = 0; i < 4; i++) {\n      vec2 pCoord = (vec2(texels[i]) + 0.5) / sizef;\n      float isValid = getMeshId(positionTex, pCoord) == meshId ? 1.0 : 0.0;\n      float weight = isValid * weights[i];\n      upscaledLight += weight * texelFetch(lightTex, texels[i], 0);\n      sum += weight;\n    }\n\n    if (sum > 0.0) {\n      upscaledLight /= sum;\n    } else {\n      upscaledLight = texture(lightTex, lightScale * coord);\n    }\n\n    return upscaledLight;\n  }\n  #endif\n\n  void main() {\n    #ifdef EDGE_PRESERVING_UPSCALE\n      vec4 upscaledLight = getUpscaledLight(vCoord);\n    #else\n      vec4 upscaledLight = texture(lightTex, lightScale * vCoord);\n    #endif\n\n    // alpha channel stores the number of samples progressively rendered\n    // divide the sum of light by alpha to obtain average contribution of light\n\n    // in addition, alpha contains a scale factor for the shadow catcher material\n    // dividing by alpha normalizes the brightness of the shadow catcher to match the background env map.\n    vec3 light = upscaledLight.rgb / upscaledLight.a;\n\n    light *= EXPOSURE;\n\n    light = TONE_MAPPING(light);\n\n    light = pow(light, vec3(1.0 / 2.2)); // gamma correction\n\n    out_color = vec4(light, 1.0);\n  }\n"
  };

  var _toneMapFunctions;
  var toneMapFunctions = (_toneMapFunctions = {}, _defineProperty(_toneMapFunctions, THREE$1.LinearToneMapping, 'linear'), _defineProperty(_toneMapFunctions, THREE$1.ReinhardToneMapping, 'reinhard'), _defineProperty(_toneMapFunctions, THREE$1.Uncharted2ToneMapping, 'uncharted2'), _defineProperty(_toneMapFunctions, THREE$1.CineonToneMapping, 'cineon'), _defineProperty(_toneMapFunctions, THREE$1.ACESFilmicToneMapping, 'acesFilmic'), _toneMapFunctions);
  function makeToneMapPass(gl, params) {
    var fullscreenQuad = params.fullscreenQuad,
        toneMappingParams = params.toneMappingParams;
    var renderPassConfig = {
      gl: gl,
      defines: {
        TONE_MAPPING: toneMapFunctions[toneMappingParams.toneMapping] || 'linear',
        WHITE_POINT: toneMappingParams.whitePoint.toExponential(),
        // toExponential allows integers to be represented as GLSL floats
        EXPOSURE: toneMappingParams.exposure.toExponential()
      },
      vertex: fullscreenQuad.vertexShader,
      fragment: fragment$3
    };
    renderPassConfig.defines.EDGE_PRESERVING_UPSCALE = true;
    var renderPassUpscale = makeRenderPass(gl, renderPassConfig);
    renderPassConfig.defines.EDGE_PRESERVING_UPSCALE = false;
    var renderPassNative = makeRenderPass(gl, renderPassConfig);

    function draw(params) {
      var light = params.light,
          lightScale = params.lightScale,
          position = params.position;
      var renderPass = lightScale.x !== 1 && lightScale.y !== 1 ? renderPassUpscale : renderPassNative;
      renderPass.setUniform('lightScale', lightScale.x, lightScale.y);
      renderPass.setTexture('lightTex', light);
      renderPass.setTexture('positionTex', position);
      renderPass.useProgram();
      fullscreenQuad.draw();
    }

    return {
      draw: draw
    };
  }

  // Sampling the scene with the RayTracingRenderer can be very slow (<1 fps).
  // This overworks the GPU and tends to lock up the OS, making it unresponsive.
  // To fix this, we can split the screen into smaller tiles, and sample the scene one tile at a time
  // The tile size is set such that each tile takes approximatly a constant amount of time to render.
  // Since the render time of a tile is dependent on the device, we find the desired tile dimensions by measuring
  // the time it takes to render an arbitrarily-set tile size and adjusting the size according to the benchmark.

  function makeTileRender(gl) {
    var desiredMsPerTile = 21;
    var currentTile = -1;
    var numTiles = 1;
    var tileWidth;
    var tileHeight;
    var columns;
    var rows;
    var width = 0;
    var height = 0;
    var totalElapsedMs; // initial number of pixels per rendered tile
    // based on correlation between system performance and max supported render buffer size
    // adjusted dynamically according to system performance

    var pixelsPerTile = pixelsPerTileEstimate(gl);

    function reset() {
      currentTile = -1;
      totalElapsedMs = NaN;
    }

    function setSize(w, h) {
      width = w;
      height = h;
      reset();
      calcTileDimensions();
    }

    function calcTileDimensions() {
      var aspectRatio = width / height; // quantize the width of the tile so that it evenly divides the entire window

      tileWidth = Math.ceil(width / Math.round(width / Math.sqrt(pixelsPerTile * aspectRatio)));
      tileHeight = Math.ceil(tileWidth / aspectRatio);
      columns = Math.ceil(width / tileWidth);
      rows = Math.ceil(height / tileHeight);
      numTiles = columns * rows;
    }

    function updatePixelsPerTile() {
      var msPerTile = totalElapsedMs / numTiles;
      var error = desiredMsPerTile - msPerTile; // tweak to find balance. higher = faster convergence, lower = less fluctuations to microstutters

      var strength = 5000; // sqrt prevents massive fluctuations in pixelsPerTile for the occasional stutter

      pixelsPerTile += strength * Math.sign(error) * Math.sqrt(Math.abs(error));
      pixelsPerTile = clamp(pixelsPerTile, 8192, width * height);
    }

    function nextTile(elapsedFrameMs) {
      currentTile++;
      totalElapsedMs += elapsedFrameMs;

      if (currentTile % numTiles === 0) {
        if (totalElapsedMs) {
          updatePixelsPerTile();
          calcTileDimensions();
        }

        totalElapsedMs = 0;
        currentTile = 0;
      }

      var isLastTile = currentTile === numTiles - 1;
      var x = currentTile % columns;
      var y = Math.floor(currentTile / columns) % rows;
      return {
        x: x * tileWidth,
        y: y * tileHeight,
        tileWidth: tileWidth,
        tileHeight: tileHeight,
        isFirstTile: currentTile === 0,
        isLastTile: isLastTile
      };
    }

    return {
      nextTile: nextTile,
      reset: reset,
      setSize: setSize
    };
  }

  function pixelsPerTileEstimate(gl) {
    var maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);

    if (maxRenderbufferSize <= 8192) {
      return 200000;
    } else if (maxRenderbufferSize === 16384) {
      return 400000;
    } else if (maxRenderbufferSize >= 32768) {
      return 600000;
    }
  }

  var noiseBase64 = 'data:image/png;base64,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';

  function makeRenderingPipeline(_ref) {
    var gl = _ref.gl,
        optionalExtensions = _ref.optionalExtensions,
        scene = _ref.scene,
        toneMappingParams = _ref.toneMappingParams,
        bounces = _ref.bounces;
    var maxReprojectedSamples = 20; // how many samples to render with uniform noise before switching to stratified noise

    var numUniformSamples = 4; // how many partitions of stratified noise should be created
    // higher number results in faster convergence over time, but with lower quality initial samples

    var strataCount = 6; // tile rendering can cause the GPU to stutter, throwing off future benchmarks for the preview frames
    // wait to measure performance until this number of frames have been rendered

    var previewFramesBeforeBenchmark = 2; // used to sample only a portion of the scene to the HDR Buffer to prevent the GPU from locking up from excessive computation

    var tileRender = makeTileRender(gl);
    var previewSize = makeRenderSize(gl);
    var decomposedScene = decomposeScene(scene);
    var mergedMesh = mergeMeshesToGeometry(decomposedScene.meshes);
    var materialBuffer = makeMaterialBuffer(gl, mergedMesh.materials);
    var fullscreenQuad = makeFullscreenQuad(gl);
    var rayTracePass = makeRayTracePass(gl, {
      bounces: bounces,
      decomposedScene: decomposedScene,
      fullscreenQuad: fullscreenQuad,
      materialBuffer: materialBuffer,
      mergedMesh: mergedMesh,
      optionalExtensions: optionalExtensions,
      scene: scene
    });
    var reprojectPass = makeReprojectPass(gl, {
      fullscreenQuad: fullscreenQuad,
      maxReprojectedSamples: maxReprojectedSamples
    });
    var toneMapPass = makeToneMapPass(gl, {
      fullscreenQuad: fullscreenQuad,
      toneMappingParams: toneMappingParams
    });
    var gBufferPass = makeGBufferPass(gl, {
      materialBuffer: materialBuffer,
      mergedMesh: mergedMesh
    });
    var ready = false;
    var noiseImage = new Image();
    noiseImage.src = noiseBase64;

    noiseImage.onload = function () {
      rayTracePass.setNoise(noiseImage);
      ready = true;
    };

    var frameTime;
    var elapsedFrameTime;
    var sampleTime;
    var sampleCount = 0;
    var numPreviewsRendered = 0;
    var firstFrame = true;

    var sampleRenderedCallback = function sampleRenderedCallback() {};

    var lastCamera = new THREE$1.PerspectiveCamera();
    lastCamera.position.set(1, 1, 1);
    lastCamera.updateMatrixWorld();
    var screenWidth = 0;
    var screenHeight = 0;
    var fullscreenScale = new THREE$1.Vector2(1, 1);
    var lastToneMappedScale = fullscreenScale;
    var hdrBuffer;
    var hdrBackBuffer;
    var reprojectBuffer;
    var reprojectBackBuffer;
    var gBuffer;
    var gBufferBack;
    var lastToneMappedTexture;

    function initFrameBuffers(width, height) {
      var makeHdrBuffer = function makeHdrBuffer() {
        return makeFramebuffer(gl, {
          color: {
            0: makeTexture(gl, {
              width: width,
              height: height,
              storage: 'float',
              magFilter: gl.LINEAR,
              minFilter: gl.LINEAR
            })
          }
        });
      };

      var makeReprojectBuffer = function makeReprojectBuffer() {
        return makeFramebuffer(gl, {
          color: {
            0: makeTexture(gl, {
              width: width,
              height: height,
              storage: 'float',
              magFilter: gl.LINEAR,
              minFilter: gl.LINEAR
            })
          }
        });
      };

      hdrBuffer = makeHdrBuffer();
      hdrBackBuffer = makeHdrBuffer();
      reprojectBuffer = makeReprojectBuffer();
      reprojectBackBuffer = makeReprojectBuffer();
      var normalBuffer = makeTexture(gl, {
        width: width,
        height: height,
        storage: 'halfFloat'
      });
      var faceNormalBuffer = makeTexture(gl, {
        width: width,
        height: height,
        storage: 'halfFloat'
      });
      var colorBuffer = makeTexture(gl, {
        width: width,
        height: height,
        storage: 'byte',
        channels: 3
      });
      var matProps = makeTexture(gl, {
        width: width,
        height: height,
        storage: 'byte',
        channels: 2
      });
      var depthTarget = makeDepthTarget(gl, width, height);

      var makeGBuffer = function makeGBuffer() {
        var _color;

        return makeFramebuffer(gl, {
          color: (_color = {}, _defineProperty(_color, gBufferPass.outputLocs.position, makeTexture(gl, {
            width: width,
            height: height,
            storage: 'float'
          })), _defineProperty(_color, gBufferPass.outputLocs.normal, normalBuffer), _defineProperty(_color, gBufferPass.outputLocs.faceNormal, faceNormalBuffer), _defineProperty(_color, gBufferPass.outputLocs.color, colorBuffer), _defineProperty(_color, gBufferPass.outputLocs.matProps, matProps), _color),
          depth: depthTarget
        });
      };

      gBuffer = makeGBuffer();
      gBufferBack = makeGBuffer();
      lastToneMappedTexture = hdrBuffer.color[rayTracePass.outputLocs.light];
    }

    function swapReprojectBuffer() {
      var temp = reprojectBuffer;
      reprojectBuffer = reprojectBackBuffer;
      reprojectBackBuffer = temp;
    }

    function swapGBuffer() {
      var temp = gBuffer;
      gBuffer = gBufferBack;
      gBufferBack = temp;
    }

    function swapHdrBuffer() {
      var temp = hdrBuffer;
      hdrBuffer = hdrBackBuffer;
      hdrBackBuffer = temp;
    } // Shaders will read from the back buffer and draw to the front buffer
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
      previewSize.setSize(w, h);
      initFrameBuffers(w, h);
      firstFrame = true;
    } // called every frame to update clock


    function time(newTime) {
      elapsedFrameTime = newTime - frameTime;
      frameTime = newTime;
    }

    function areCamerasEqual(cam1, cam2) {
      return numberArraysEqual(cam1.matrixWorld.elements, cam2.matrixWorld.elements) && cam1.aspect === cam2.aspect && cam1.fov === cam2.fov;
    }

    function updateSeed(width, height) {
      var useJitter = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
      rayTracePass.setSize(width, height);
      var jitterX = useJitter ? (Math.random() - 0.5) / width : 0;
      var jitterY = useJitter ? (Math.random() - 0.5) / height : 0;
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
        lightScale: lightScale,
        position: gBuffer.color[gBufferPass.outputLocs.position]
      });
      lastToneMappedTexture = lightTexture;
      lastToneMappedScale = lightScale.clone();
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

    function setCameras(camera, lastCamera) {
      rayTracePass.setCamera(camera);
      gBufferPass.setCamera(camera);
      reprojectPass.setPreviousCamera(lastCamera);
      lastCamera.copy(camera);
    }

    function drawPreview() {
      if (sampleCount > 0) {
        swapBuffers();
      }

      if (numPreviewsRendered >= previewFramesBeforeBenchmark) {
        previewSize.adjustSize(elapsedFrameTime);
      }

      updateSeed(previewSize.width, previewSize.height, false);
      renderGBuffer();
      rayTracePass.bindTextures();
      newSampleToBuffer(hdrBuffer, previewSize.width, previewSize.height);
      reprojectBuffer.bind();
      gl.viewport(0, 0, previewSize.width, previewSize.height);
      reprojectPass.draw({
        blendAmount: 1.0,
        light: hdrBuffer.color[0],
        lightScale: previewSize.scale,
        position: gBuffer.color[gBufferPass.outputLocs.position],
        previousLight: lastToneMappedTexture,
        previousLightScale: lastToneMappedScale,
        previousPosition: gBufferBack.color[gBufferPass.outputLocs.position]
      });
      reprojectBuffer.unbind();
      toneMapToScreen(reprojectBuffer.color[0], previewSize.scale);
      swapBuffers();
    }

    function drawTile() {
      var _tileRender$nextTile = tileRender.nextTile(elapsedFrameTime),
          x = _tileRender$nextTile.x,
          y = _tileRender$nextTile.y,
          tileWidth = _tileRender$nextTile.tileWidth,
          tileHeight = _tileRender$nextTile.tileHeight,
          isFirstTile = _tileRender$nextTile.isFirstTile,
          isLastTile = _tileRender$nextTile.isLastTile;

      if (isFirstTile) {
        if (sampleCount === 0) {
          // previous rendered image was a preview image
          clearBuffer(hdrBuffer);
          reprojectPass.setPreviousCamera(lastCamera);
        } else {
          sampleRenderedCallback(sampleCount, frameTime - sampleTime || NaN);
          sampleTime = frameTime;
        }

        updateSeed(screenWidth, screenHeight, true);
        renderGBuffer();
        rayTracePass.bindTextures();
      }

      renderTile(hdrBuffer, x, y, tileWidth, tileHeight);

      if (isLastTile) {
        sampleCount++;
        var blendAmount = clamp(1.0 - sampleCount / maxReprojectedSamples, 0, 1);
        blendAmount *= blendAmount;

        if (blendAmount > 0.0) {
          reprojectBuffer.bind();
          gl.viewport(0, 0, screenWidth, screenHeight);
          reprojectPass.draw({
            blendAmount: blendAmount,
            light: hdrBuffer.color[0],
            lightScale: fullscreenScale,
            position: gBuffer.color[gBufferPass.outputLocs.position],
            previousLight: reprojectBackBuffer.color[0],
            previousLightScale: previewSize.scale,
            previousPosition: gBufferBack.color[gBufferPass.outputLocs.position]
          });
          reprojectBuffer.unbind();
          toneMapToScreen(reprojectBuffer.color[0], fullscreenScale);
        } else {
          toneMapToScreen(hdrBuffer.color[0], fullscreenScale);
        }
      }
    }

    function draw(camera) {
      if (!ready) {
        return;
      }

      if (!areCamerasEqual(camera, lastCamera)) {
        setCameras(camera, lastCamera);

        if (firstFrame) {
          firstFrame = false;
        } else {
          drawPreview();
          numPreviewsRendered++;
        }

        tileRender.reset();
        sampleCount = 0;
      } else {
        drawTile();
        numPreviewsRendered = 0;
      }
    } // debug draw call to measure performance
    // use full resolution buffers every frame
    // reproject every frame


    function drawFull(camera) {
      if (!ready) {
        return;
      }

      swapGBuffer();
      swapReprojectBuffer();

      if (!areCamerasEqual(camera, lastCamera)) {
        sampleCount = 0;
        clearBuffer(hdrBuffer);
      } else {
        sampleCount++;
      }

      setCameras(camera, lastCamera);
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
        previousPosition: gBufferBack.color[gBufferPass.outputLocs.position]
      });
      reprojectBuffer.unbind();
      toneMapToScreen(reprojectBuffer.color[0], fullscreenScale);
    }

    return {
      draw: draw,
      drawFull: drawFull,
      setSize: setSize,
      time: time,
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

  var glRequiredExtensions = ['EXT_color_buffer_float', // enables rendering to float buffers
  'EXT_float_blend'];
  var glOptionalExtensions = ['OES_texture_float_linear' // enables gl.LINEAR texture filtering for float textures,
  ];
  function RayTracingRenderer() {
    var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var canvas = params.canvas || document.createElement('canvas');
    var gl = canvas.getContext('webgl2', {
      alpha: false,
      depth: true,
      stencil: false,
      antialias: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: true
    });
    loadExtensions(gl, glRequiredExtensions);
    var optionalExtensions = loadExtensions(gl, glOptionalExtensions);
    var pipeline = null;
    var size = new THREE$1.Vector2();
    var pixelRatio = 1;
    var module = {
      bounces: 2,
      domElement: canvas,
      maxHardwareUsage: false,
      needsUpdate: true,
      onSampleRendered: null,
      renderWhenOffFocus: true,
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

      module.setSize(size.width, size.height);
      module.needsUpdate = false;
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

    module.getTotalSamplesRendered = function () {
      if (pipeline) {
        return pipeline.getTotalSamplesRendered();
      }
    };

    var isValidTime = 1;
    var currentTime = NaN;
    var syncWarning = false;

    function restartTimer() {
      isValidTime = NaN;
    }

    module.sync = function (t) {
      // the first call to the callback of requestAnimationFrame does not have a time parameter
      // use performance.now() in this case
      currentTime = t || performance.now();
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

      if (isNaN(currentTime)) {
        if (!syncWarning) {
          console.warn('Ray Tracing Renderer warning: For improved performance, please call renderer.sync(time) before render.render(scene, camera), with the time parameter equalling the parameter passed to the callback of requestAnimationFrame');
          syncWarning = true;
        }

        currentTime = performance.now(); // less accurate than requestAnimationFrame's time parameter
      }

      pipeline.time(isValidTime * currentTime);
      isValidTime = 1;
      currentTime = NaN;
      camera.updateMatrixWorld();

      if (module.maxHardwareUsage) {
        // render new sample for the entire screen
        pipeline.drawFull(camera);
      } else {
        // render new sample for a tiled subset of the screen
        pipeline.draw(camera);
      }
    }; // Assume module.render is called using requestAnimationFrame.
    // This means that when the user is on a different browser tab, module.render won't be called.
    // Since the timer should not measure time when module.render is inactive,
    // the timer should be reset when the user switches browser tabs


    document.addEventListener('visibilitychange', restartTimer);

    module.dispose = function () {
      document.removeEventListener('visibilitychange', restartTimer);
      pipeline = null;
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

})));
