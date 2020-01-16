export function loadExtensions(gl, extensions) {
  const supported = {};
  for (const name of extensions) {
    supported[name] = gl.getExtension(name);
  }
  return supported;
}

export function compileShader(gl, type, source) {
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

export function getUniforms(gl, program) {
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

export function getAttributes(gl, program) {
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
