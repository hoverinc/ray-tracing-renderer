export function makeTextureAllocator(gl) {
  function bind(shaderPass) {
    const textures = shaderPass.textures;

    let i = 0;
    for (let name in textures) {
      const tex = shaderPass.textures[name];

      let unit = 1 + i++;

      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(tex.target, tex.texture);
      shaderPass.uniforms[name].set(unit);
    }
  }

  return {
    bind
  };
}
