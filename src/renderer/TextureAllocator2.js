export function makeTextureAllocator2(gl) {

  const maxUnits = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);

  const shaderUnitMap = new WeakMap();

  const availableUnits = [];

  for (let i = 1; i < maxUnits; i++) {
    availableUnits.push(i);
  }

  function bind(shaderPass) {
    const textures = shaderPass.textures;

    let shaderUnits = shaderUnitMap.get(textures);

    if (!shaderUnits) {
      shaderUnits = {};
      for (let name in textures) {
        shaderUnits[name] = { unit: -1, tex: null };
      }
      shaderUnitMap.set(shaderPass.textures, shaderUnits);
    }

    for (let name in textures) {
      const tex = shaderPass.textures[name];

      let unit;

      if (shaderUnits[name].tex) {
        if (shaderUnits[name].tex === tex) {
          return;
        } else {
          const oldUnit = shaderUnits[name].unit;

          unit = availableUnits.pop();
          shaderUnits[name].unit = unit;
          shaderUnits[name].tex = tex;

          availableUnits.push(oldUnit);
        }
      } else {
        unit = availableUnits.pop();
        shaderUnits[name].unit = unit;
        shaderUnits[name].tex = tex;
      }

      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(tex.target, tex.texture);
      gl.uniform1i(shaderPass.uniforms[name], unit);
    }
  }

  return {
    bind
  };
}
