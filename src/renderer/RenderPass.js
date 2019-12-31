import { compileShader, createProgram } from './glUtil';
import { makeUniformSetter } from './UniformSetter';

export function makeRenderPass(gl, params) {
  const {
    defines,
    fragment,
    vertex,
  } = params;

  const vertexCompiled = vertex instanceof WebGLShader ? vertex : makeVertexShader(gl, params);

  const fragmentCompiled = fragment instanceof WebGLShader ? fragment : makeFragmentShader(gl, params);

  const program = createProgram(gl, vertexCompiled, fragmentCompiled);

  let outputs;
  if (Array.isArray(fragment.outputs)) {
    outputs = {};
    for (let i = 0; i < fragment.outputs.length; i++) {
      outputs[fragment.outputs[i]] = i;
    }
  }

  return {
    ...makeRenderPassFromProgram(gl, program),
    outputs
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
  const uniforms = uniformSetter.uniforms;

  const textures = {};

  function setTexture(name, texture) {
    if (!uniforms[name]) {
      console.error('Sampler with name', name, 'does not exist');
    }

    textures[name] = texture;
  }

  function useProgram() {
    gl.useProgram(program);
    uniformSetter.upload();
  }

  return {
    program,
    setTexture,
    textures,
    uniforms,
    useProgram,
  };
}

function makeShaderStage(gl, type, shader, defines) {
  let str = '#version 300 es\nprecision mediump float;\nprecision mediump int;\n';

  str += addDefines(defines);

  if (type === gl.FRAGMENT_SHADER) {
    str += addOutputs(shader.outputs);
  }

  str += addIncludes(shader.includes, defines);

  if (typeof shader.source === 'function') {
    str += shader.source(defines);
  } else if (typeof shader.source === 'string') {
    str += shader.source;
  } else {
    console.error('Provide a shader source string');
  }

  return compileShader(gl, type, str);
}

function addDefines(defines) {
  let str = '';

  if (typeof defines !== 'object') {
    return str;
  }

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

  if (!Array.isArray(outputs)) {
    console.error('Provide render target outputs for shader');
    return str;
  }

  for (let i = 0; i < outputs.length; i++) {
    str += `layout(location = ${i}) out vec4 out_${outputs[i]};\n`;
  }

  return str;
}

function addIncludes(includes, defines) {
  let str = '';

  if (!Array.isArray(includes)) {
    return str;
  }

  for (let include of includes) {
    if (typeof include === 'function') {
      str += include(defines);
    } else {
      str += include;
    }
  }

  return str;
}
