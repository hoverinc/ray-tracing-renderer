import { getUniforms } from './glUtil';

let typeMap;

export function makeUniformSetter(gl, program) {
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

  const failedUnis = new Set();

  function setUniform(name, v0, v1, v2, v3) {
    // v0 - v4 are the values to be passed to the uniform
    // v0 can either be a number or an array, and v1-v3 are optional
    const uni = uniforms[name];

    if (!uni) {
      if (!failedUnis.has(name)) {
        console.warn(`Uniform "${name}" does not exist in shader`);
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
