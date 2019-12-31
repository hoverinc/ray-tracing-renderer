import { getUniforms } from './glUtil';


export function makeUniformSetter(gl, program) {
  const uniformInfo = getUniforms(gl, program);

  const typeMap = {
    [gl.FLOAT]: glName(1, 'f'),
    [gl.FLOAT_VEC2]: glName(2, 'f'),
    [gl.FLOAT_VEC3]: glName(3, 'f'),
    [gl.FLOAT_VEC4]: glName(4, 'f'),
    [gl.INT]: glName(1, 'i'),
    [gl.INT_VEC2]: glName(2, 'i'),
    [gl.INT_VEC2]: glName(3, 'i'),
    [gl.INT_VEC2]: glName(4, 'i'),
    [gl.SAMPLER_2D]: glName(1, 'i'),
    [gl.SAMPLER_2D_ARRAY]: glName(1, 'i'),
    [gl.FLOAT_MAT2]: glNameMatrix(2, 2),
    [gl.FLOAT_MAT3]: glNameMatrix(3, 3),
    [gl.FLOAT_MAT4]: glNameMatrix(4, 4)
  };

  const uniforms = {};
  const needsUpload = [];

  for (let { name, type, location } of uniformInfo) {
    const uniform = {
      type,
      location
    };

    uniform.set = (v0, v1, v2, v3) => {
      uniform.v0 = v0;
      uniform.v1 = v1;
      uniform.v2 = v2;
      uniform.v3 = v3;
      needsUpload.push(uniform);
    };

    uniforms[name] = uniform;
  }

  function upload() {
    while (needsUpload.length > 0) {

      const { type, location, v0, v1, v2, v3 } = needsUpload.pop();

      if (v0.length) {
        if (typeMap[type].matrix) {
          const array = v0;
          const transpose = v1 || false;
          gl[typeMap[type].matrix](location, transpose, array);
        } else {
          gl[typeMap[type].array](location, v0);
        }
      } else {
        gl[typeMap[type].values](location, v0, v1, v2, v3);
      }
    }

  }

  return {
    uniforms,
    upload,
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
