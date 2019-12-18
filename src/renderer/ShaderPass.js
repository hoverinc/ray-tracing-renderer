/*
makeShaderPass({
  fragment: GLShader | {outputs: Array[string], source: string}
  vertex: GLShader | { source: string }
  defines: Object~
}) : shader

shader.setTexture(samplerName: string, tex: Texture)
shader.bindTextures() // calls GlBindTexture on each texture set with setTexture

shader.program : GlProgram
shader.uniforms: { [uniformName: string] : GLUniformLocation }
*/

import { compileShader, createProgram, getUniforms } from './glUtil';

export function makeShaderPass(params) {
  const {
    defines,
    fragment,
    gl,
    vertex,
  } = params;

  const vertexCompiled = vertex instanceof WebGLShader ? vertex : makeVertexShader(params);

  const fragmentCompiled = fragment instanceof WebGLShader ? fragment : makeFragmentShader(params);

  const program = createProgram(gl, vertexCompiled, fragmentCompiled);

  return makeShaderPassFromProgram(gl, program);
}

export function makeVertexShader({ defines, gl, vertex }) {
  return makeShaderStage(gl, gl.VERTEX_SHADER, vertex, defines);
}

export function makeFragmentShader({ defines, fragment, gl }) {
  return makeShaderStage(gl, gl.FRAGMENT_SHADER, fragment, defines);
}

function makeShaderPassFromProgram(gl, program) {
  const uniforms = getUniforms(gl, program);

  const textures = {};

  function setTexture(name, texture) {
    if (!uniforms[name]) {
      console.error('Sampler with name', name, 'does not exist');
    }

    textures[name] = texture;
  }

  return {
    program,
    setTexture,
    textures,
    uniforms,
    useProgram() {
      gl.useProgram(program);
    }
  };
}

function makeShaderStage(gl, type, shader, defines) {

  let str = '#version 300 es\nprecision mediump float;\nprecision mediump int;\n';

  str += addDefines(defines);

  if (type === gl.FRAGMENT_SHADER) {
    str += addOutputs(shader.outputs);
  }

  str += addIncludes(shader.includes);

  if (typeof shader.source === 'string') {
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

function addIncludes(includes) {
  let str = '';

  if (Array.isArray(includes)) {
    return str;
  }

  for (let include of includes) {
    str += include;
  }

  return str;
}
