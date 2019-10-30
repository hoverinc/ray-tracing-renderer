import { makeTexture } from "./Texture";

export function makeFramebuffer(params) {
  const {
    gl,
    linearFiltering = false, // linearly filter textures

    // A single render target in the form { storage: 'byte' | 'float' }
    // Or multiple render targets passed as a RenderTargets object
    renderTarget
  } = params;

  const framebuffer = gl.createFramebuffer();
  let texture;

  let width = 0;
  let height = 0;

  function bind() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  }

  function unbind() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function setSize(w, h) {
    this.bind();

    width = Math.floor(w);
    height = Math.floor(h);

    if (renderTarget.isRenderTargets) {
      // RenderTargets object
      texture = initArrayTexture(gl, width, height, linearFiltering, renderTarget);
    } else {
      // single render target in the form { storage }
      texture = initTexture(gl, width, height, linearFiltering, renderTarget);
    }

    this.unbind();
  }

  function copyToScreen() {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.blitFramebuffer(0, 0, width, height, 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  }

  return {
    bind,
    copyToScreen,
    get height() {
      return height;
    },
    setSize,
    get texture() {
      return texture;
    },
    unbind,
    get width() {
      return width;
    },
  };
}

function initTexture(gl, width, height, linearFiltering, { storage }) {
  const texture = makeTexture(gl, {
    width,
    height,
    storage,
    minFilter: linearFiltering ? gl.LINEAR : gl.NEAREST,
    magFilter: linearFiltering ? gl.LINEAR : gl.NEAREST,
    channels: 4
  });
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, texture.target, texture.texture, 0);

  return texture;
}

function initArrayTexture(gl, width, height, linearFiltering, { storage, names }) {
  const drawBuffers = [];

  const texture = makeTexture(gl, {
    width,
    height,
    length: names.length,
    storage: storage,
    minFilter: linearFiltering ? gl.LINEAR : gl.NEAREST,
    magFilter: linearFiltering ? gl.LINEAR : gl.NEAREST,
    channels: 4
  });

  for (let i = 0; i < names.length; i++) {
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, texture.texture, 0, i);
    drawBuffers.push(gl.COLOR_ATTACHMENT0 + i);
  }

  gl.drawBuffers(drawBuffers);

  return texture;
}
