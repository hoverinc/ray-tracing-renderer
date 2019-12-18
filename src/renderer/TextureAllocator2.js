export function makeTextureAllocator2(gl) {

  const maxUnits = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);

  const shaderMap = new WeakMap();

  const textureMap = new WeakMap();

  const availableUnits = [];

  for (let i = 1; i < maxUnits; i++) {
    availableUnits.push(i);
  }

  function bind(shaderPass) {
    const textures = shaderPass.textures;

    let lastUsedTextures = shaderMap.get(textures);

    if (!lastUsedTextures) {
      lastUsedTextures = {};
      shaderMap.set(textures, lastUsedTextures);
    }

    for (let name in textures) {
      const tex = shaderPass.textures[name];

      if (lastUsedTextures[name]) {
        const lastTex = lastUsedTextures[name];
        if (lastTex === tex) {
          return;
        } else {
          const lastTextureMap = textureMap.get(lastTex);
          lastTextureMap.count--;

          if (lastTextureMap.count <= 0) {
            availableUnits.push(lastTextureMap.unit);
          }
        }
      }

      lastUsedTextures[name] = tex;

      let activeTexture = textureMap.get(tex);
      if (activeTexture) {
        activeTexture.count++;
      } else {
        activeTexture = {
           unit: availableUnits.pop(),
           count: 1
        };

        textureMap.set(tex, activeTexture);
      }

      gl.activeTexture(gl.TEXTURE0 + activeTexture.unit);
      gl.bindTexture(tex.target, tex.texture);
      gl.uniform1i(shaderPass.uniforms[name], activeTexture.unit);
    }
  }

  return {
    bind
  };
}
