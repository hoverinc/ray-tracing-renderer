// targets is array of { name: string, storage: 'byte' | 'float'}
export function makeRenderTargets({storage, names}) {
  const location = {};

  for (let i = 0; i < names.length; i++) {
    location[names[i]] = i;
  }

  return {
    isRenderTargets: true,
    storage,
    names,
    location,
    get(textureName) {
      let inputs = '';

      inputs += `uniform mediump sampler2DArray ${textureName};\n`;

      for (let i = 0; i < names.length; i++) {
        inputs += `#define ${textureName}_${names[i]} ${i}\n`;
      }

      return inputs;
    },
    set() {
      let outputs = '';

      for (let i = 0; i < names.length; i++) {
        outputs += `layout(location = ${i}) out vec4 out_${names[i]};\n`;
      }

      return outputs;
    }
  };
}
