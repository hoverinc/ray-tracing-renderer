import { compileShader, createProgram, getAttributes } from './glUtil';
import { makeUniformSetter } from './UniformSetter';

export function makeRenderPass(gl, params) {
  const {
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

export function makeVertexShader(gl, { defines, vertex }) {
  return makeShaderStage(gl, gl.VERTEX_SHADER, vertex, defines);
}

export function makeFragmentShader(gl, { defines, fragment }) {
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
