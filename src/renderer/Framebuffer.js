export function makeFramebuffer(gl, { colorAttachments, depthAttachment }) {

  const framebuffer = gl.createFramebuffer();

  function bind() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  }

  function unbind() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function init() {
    bind();

    const locationToTex = {};

    const drawBuffers = [];

    if (!Array.isArray(colorAttachments)) {
      colorAttachments = [colorAttachments];
    }

    for (let attachment of colorAttachments) {
      const glLocation = attachTexture(gl, attachment);
      drawBuffers.push(glLocation);
      locationToTex[attachment.location || 0] = attachment.texture;
    }

    drawBuffers.sort(); // glDrawBuffers requires the color attachments to be specified in order

    gl.drawBuffers(drawBuffers);

    if (depthAttachment) {
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, depthAttachment.target, depthAttachment.texture);
    }

    unbind();

    return locationToTex;
  }

  const locationToTex = init();

  return {
    color: locationToTex,
    bind,
    unbind
  };
}

function attachTexture(gl, attachment){
  const { texture, location = 0, layer} = attachment;

  const glLocation = gl.COLOR_ATTACHMENT0 + location;

  if (layer !== undefined) {
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, glLocation, texture.texture, 0, layer);
  } else {
    gl.framebufferTexture2D(gl.FRAMEBUFFER, glLocation, texture.target, texture.texture, 0);
  }

  return glLocation;
}
