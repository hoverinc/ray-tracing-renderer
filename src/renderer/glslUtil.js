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
