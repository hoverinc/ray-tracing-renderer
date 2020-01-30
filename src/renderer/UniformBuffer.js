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
