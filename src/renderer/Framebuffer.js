export function makeFramebuffer(gl, { attachments }) {

  const framebuffer = gl.createFramebuffer();

  function bind() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  }

  function unbind() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function init() {
    bind();

    const drawBuffers = [];

    for (let location in attachments) {
      location = Number(location);

      if (location === undefined) {
        console.error('invalid location');
      }

      const tex = attachments[location];
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + location, tex.target, tex.texture, 0);
      drawBuffers.push(gl.COLOR_ATTACHMENT0 + location);
    }

    gl.drawBuffers(drawBuffers);

    unbind();
  }

  init();

  return {
    attachments,
    bind,
    unbind
  };
}
