export function makeRenderTargets(targets)
{
  return {
    targets,
    glslOutput() {
      let outputs = '';
      for (let i = 0; i < targets; i++) {
        outputs += `layout(location = ${i} ) out vec4 ${targets[i].name}\n`;
      }
      return outputs;
    }
  };
}
