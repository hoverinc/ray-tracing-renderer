// targets is array of { name: string, storage: 'byte' | 'float'}
export function makeRenderTargets(targets) {

  for (let i = 0; i < targets.length; i++) {
    targets[i].index = i;
  }

  return {
    targets,
    glslOutput() {
      let outputs = '';
      for (const { name, index } of targets) {
        outputs += `layout(location = ${index}) out vec4 out_${name};\n`;
      }
      return outputs;
    }
  };
}
