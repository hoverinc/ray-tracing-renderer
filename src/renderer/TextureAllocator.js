export function makeTextureAllocator(gl) {
  function bind(renderPass) {
    const textures = renderPass.textures;

    let i = 0;
    for (let name in textures) {
      const tex = renderPass.textures[name];

      let unit = 1 + i++;

      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(tex.target, tex.texture);
      renderPass.uniforms[name].set(unit);
    }
  }

  return {
    bind
  };
}
