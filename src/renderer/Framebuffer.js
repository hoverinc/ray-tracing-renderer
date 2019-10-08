import { makeDepthTexture, makeTexture } from "./Texture";

export function makeFramebuffer(params) {
  const {
    depth = false, // use depth buffer
    gl,
    linearFiltering = false, // linearly filter textures

    // A single render target in the form { storage: 'byte' | 'float' }
    // Or multiple render targets passed as a RenderTargets object
    renderTarget
  } = params;
  console.log(renderTarget);
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

    if (Array.isArray(renderTarget.targets)) {
      texture = initMultipleTextures(gl, width, height, linearFiltering, renderTarget);
    } else {
      texture = initSingleTexture(gl, width, height, linearFiltering, renderTarget);
    }

    if (depth) {
      const depthTexture = makeDepthTexture(gl, {
        width,
        height
      });
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, depthTexture.target, depthTexture.texture, 0);
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

function initSingleTexture(gl, width, height, linearFiltering, { storage }) {
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

function initMultipleTextures(gl, width, height, linearFiltering, renderTargets) {
  const texture = {};
  const drawBuffers = [];

  for (const { name, storage, index } of renderTargets.targets) {
    const t = makeTexture(gl, {
      width,
      height,
      storage,
      minFilter: linearFiltering ? gl.LINEAR : gl.NEAREST,
      magFilter: linearFiltering ? gl.LINEAR : gl.NEAREST,
      channels: 4
    });

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, t.target, t.texture, 0);

    texture[name] = t;
    drawBuffers.push(gl.COLOR_ATTACHMENT0 + index);
  }

  gl.drawBuffers(drawBuffers);

  return texture;
}
