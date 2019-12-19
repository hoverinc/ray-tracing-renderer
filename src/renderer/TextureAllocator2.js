export function makeTextureAllocator2(gl) {
  function bind(shaderPass) {
    const textures = shaderPass.textures;

    let i = 0;
    for (let name in textures) {
      const tex = shaderPass.textures[name];

      let unit = 30 + i++;

      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(tex.target, tex.texture);
      gl.uniform1i(shaderPass.uniforms[name], unit);
    }
  }

  return {
    bind
  };
}
