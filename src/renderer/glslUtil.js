export function unrollLoop(indexName, start, limit, step, code) {
  let unrolled = `int ${indexName};\n`;

  for (let i = start; (step > 0 && i < limit) || (step < 0 && i > limit); i += step) {
    unrolled += `${indexName} = ${i};\n`;
    unrolled += code;
  }

  return unrolled;
}

export function addDefines(params) {
  let defines = '';

  for (let [name, value] of Object.entries(params)) {
    // don't define falsy values such as false, 0, and ''.
    // this adds support for #ifdef on falsy values
    if (value) {
      defines += `#define ${name} ${value}\n`;
    }
  }

  return defines;
}

export function renderTargetSet(renderTargets) {
  let outputs = '';

  const names = renderTargets.names;

  for (let i = 0; i < names.length; i++) {
    outputs += `layout(location = ${i}) out vec4 out_${names[i]};\n`;
  }

  return outputs;
}

export function renderTargetGet(texture, renderTargets) {
  let inputs = '';

  inputs += `uniform mediump sampler2DArray ${texture};\n`;

  const names = renderTargets.names;

  for (let i = 0; i < names.length; i++) {
    inputs += `#define ${texture}_${names[i]} ${i}\n`;
  }

  return inputs;
}
