export function makeTextureAllocator(gl) {
  // texture unit 0 reserved for setting parameters on new textures
  let nextUnit = 1;

  function bindGl(uniform, { target, texture }, unit) {
    if (!uniform) {
      // uniform location does not exist
      return;
    }

    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(target, texture);
    gl.uniform1i(uniform, unit);
  }

  function bind(uniform, textureObj) {
    bindGl(uniform, textureObj, nextUnit++);
  }

  function reserveSlot() {
    const unit = nextUnit++;
    return (uniform, textureObj) => {
      bindGl(uniform, textureObj, unit);
    };
  }

  return {
    bind,
    reserveSlot
  };
}
