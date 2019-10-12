// targets is array of { name: string, storage: 'byte' | 'float'}
export function makeRenderTargets(storage, names) {
  return {
    storage,
    names,
    glslHeader() {
      let outputs = '';
      for (const { name, index } of targets) {
        outputs += `layout(location = ${index}) out vec4 renderTarget_${name};\n`;
      }
      return outputs;
    }
  };
}
