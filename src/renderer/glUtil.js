export function loadExtensions(gl, extensions) {
  const supported = {};
  for (const name of extensions) {
    supported[name] = gl.getExtension(name);
  }
  return supported;
}

export function createShader(gl, type, source) {
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

export function createProgram(gl, vertexShader, fragmentShader, transformVaryings, transformBufferMode) {
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

export function getAttributes(gl, program) {
  const attributes = {};

  const count = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < count; i++) {
    const { name } = gl.getActiveAttrib(program, i);
    if (name) {
      attributes[name] = i;
    }
  }

  return attributes;
}

export function getUniforms(gl, program) {
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

export function makeUniformBuffer(gl, program, blockName) {
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
