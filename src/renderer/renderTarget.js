import { makeTexture } from "./texture";

export function makeRenderTarget(gl, storage, linearFiltering) {
  const framebuffer = gl.createFramebuffer();
  let texture;
  let width = 0;
  let height = 0;

  function setSize(w, h) {
    width = Math.floor(w);
    height = Math.floor(h);
    texture = makeTexture(gl, {
      width,
      height,
      storage,
      minFilter: linearFiltering ? gl.LINEAR : gl.NEAREST,
      magFilter: linearFiltering ? gl.LINEAR : gl.NEAREST,
      channels: 4
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, texture.target, texture.texture, 0);
  }

  function bind() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  }

  function unbind() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function copyToScreen() {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.blitFramebuffer(0, 0, width, height, 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  }

  return Object.freeze({
    setSize,
    bind,
    unbind,
    copyToScreen,
    get texture() {
      return texture;
    },
    get width() {
      return width;
    },
    get height() {
      return height;
    },
  });
}

export function makeRenderTargetFloat(gl, linearFiltering) {
  return makeRenderTarget(gl, 'float', linearFiltering);
}

export function makeRenderTargetByte(gl, linearFiltering) {
  return makeRenderTarget(gl, 'byte', linearFiltering);
}
