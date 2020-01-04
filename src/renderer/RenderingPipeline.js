import { makeFullscreenQuad } from './FullscreenQuad';
import { makeRayTracingShader } from './RayTracingShader';
import { makeToneMapShader } from './ToneMapShader';
import { makeFramebuffer } from './Framebuffer';
import { numberArraysEqual } from './util';
import { makeTileRender } from './TileRender';
import { makeTexture } from './Texture';
import { makeReprojectShader } from './ReprojectShader';
import noiseBase64 from './texture/noise';
import { clamp } from './util';
import { PerspectiveCamera, Vector2 } from 'three';

// Important TODO: Refactor this file to get rid of duplicate and confusing code

export function makeRenderingPipeline({
    gl,
    optionalExtensions,
    scene,
    toneMappingParams,
    bounces, // number of global illumination bounces
  }) {

  const reprojectDecay = 0.98;
  const maxReprojectedSamples = Math.round(reprojectDecay / (1 - reprojectDecay));

  // how many samples to render with uniform noise before switching to stratified noise
  const numUniformSamples = 6;

  // how many partitions of stratified noise should be created
  // higher number results in faster convergence over time, but with lower quality initial samples
  const strataCount = 6;

  const fullscreenQuad = makeFullscreenQuad(gl);

  const rayTracingShader = makeRayTracingShader(gl, { bounces, fullscreenQuad, optionalExtensions, scene });

  const reprojectShader = makeReprojectShader(gl, { fullscreenQuad, maxReprojectedSamples });

  const toneMapShader = makeToneMapShader(gl, {
    fullscreenQuad, optionalExtensions, toneMappingParams
  });

  // used to sample only a portion of the scene to the HDR Buffer to prevent the GPU from locking up from excessive computation
  const tileRender = makeTileRender(gl);

  const clearToBlack = new Float32Array([0, 0, 0, 0]);

  let ready = false;
  const noiseImage = new Image();
  noiseImage.src = noiseBase64;
  noiseImage.onload = () => {
    rayTracingShader.setNoise(noiseImage);
    ready = true;
  };

  let screenWidth = 0;
  let screenHeight = 0;

  let previewWidth = 0;
  let previewHeight = 0;

  let previewScale = new Vector2(1, 1);
  const fullscreenScale = new Vector2(1, 1);

  let hdrBuffer;
  let hdrBackBuffer;
  let reprojectBuffer;
  let reprojectBackBuffer;

  let lastToneMappedScale;
  let lastToneMappedTexture;

  const lastCamera = new PerspectiveCamera();
  lastCamera.position.set(1, 1, 1);
  lastCamera.updateMatrixWorld();

  let sampleCount = 0;

  let sampleRenderedCallback = () => {};

  function initFrameBuffers(width, height) {
    const floatTex = () => makeTexture(gl, { width, height, storage: 'float' });

    const makeHdrBuffer = () => makeFramebuffer(gl, {
        attachments: {
          [rayTracingShader.outputs.light]: floatTex(),
          [rayTracingShader.outputs.position]: floatTex(),
        }
      });

    const makeReprojectBuffer = () => makeFramebuffer(gl, {
        attachments: { 0: floatTex() }
      });

    hdrBuffer = makeHdrBuffer();
    hdrBackBuffer = makeHdrBuffer();

    reprojectBuffer = makeReprojectBuffer();
    reprojectBackBuffer = makeReprojectBuffer();

    lastToneMappedScale = fullscreenScale;
    lastToneMappedTexture = hdrBuffer.attachments[rayTracingShader.outputs.light];
  }

  function swapReprojectBuffer() {
    let temp = reprojectBuffer;
    reprojectBuffer = reprojectBackBuffer;
    reprojectBackBuffer = temp;
  }

  function swapHdrBuffer() {
    let temp = hdrBuffer;
    hdrBuffer = hdrBackBuffer;
    hdrBackBuffer = temp;
  }

  // Shaders will read from the back buffer and draw to the front buffer
  // Buffers are swapped after every render
  function swapBuffers() {
    swapHdrBuffer();
    swapReprojectBuffer();
  }

  function setPreviewBufferDimensions() {
    const desiredTimeForPreview = 10;
    const numPixelsForPreview = desiredTimeForPreview / tileRender.getTimePerPixel();

    const aspectRatio = screenWidth / screenHeight;

    previewWidth = Math.round(clamp(Math.sqrt(numPixelsForPreview * aspectRatio), 1, screenWidth));
    previewHeight = Math.round(clamp(previewWidth / aspectRatio, 1, screenHeight));
    previewScale.set(previewWidth / screenWidth, previewHeight / screenHeight);
  }

  function areCamerasEqual(cam1, cam2) {
    return numberArraysEqual(cam1.matrixWorld.elements, cam2.matrixWorld.elements) &&
      cam1.aspect === cam2.aspect &&
      cam1.fov === cam2.fov &&
      cam1.focus === cam2.focus;
  }

  function clearBuffer(buffer) {
    buffer.bind();
    gl.clear(gl.COLOR_BUFFER_BIT);
    buffer.unbind();
  }

  function addSampleToBuffer(buffer, width, height) {
    buffer.bind();

    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);

    gl.clearBufferfv(gl.COLOR, rayTracingShader.outputs.position, clearToBlack);

    gl.viewport(0, 0, width, height);
    rayTracingShader.draw();

    gl.disable(gl.BLEND);
    buffer.unbind();
  }

  function newSampleToBuffer(buffer, width, height) {
    buffer.bind();
    gl.viewport(0, 0, width, height);
    rayTracingShader.draw();
    buffer.unbind();
  }

  function toneMapToScreen(texture, textureScale) {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    toneMapShader.draw({
      hdrTexture: texture,
      textureScale
    });

    lastToneMappedTexture = texture;
    lastToneMappedScale = textureScale;
  }

  function renderTile(buffer, x, y, width, height) {
    gl.scissor(x, y, width, height);
    gl.enable(gl.SCISSOR_TEST);
    addSampleToBuffer(buffer, screenWidth, screenHeight);
    gl.disable(gl.SCISSOR_TEST);
  }

  function updateSeed(width, height) {
    rayTracingShader.setSize(width, height);

    const jitterX = (Math.random() - 0.5) / width;
    const jitterY = (Math.random() - 0.5) / height;
    rayTracingShader.setJitter(jitterX, jitterY);
    reprojectShader.setJitter(jitterX, jitterY);

    if (sampleCount === 0) {
      rayTracingShader.setStrataCount(1);
    } else if (sampleCount === numUniformSamples) {
      rayTracingShader.setStrataCount(strataCount);
    } else {
      rayTracingShader.nextSeed();
    }

    rayTracingShader.bindTextures();
  }


  function drawPreview(camera, lastCamera) {
    if (sampleCount > 0) {
      swapBuffers();
    }

    sampleCount = 0;
    tileRender.reset();
    setPreviewBufferDimensions();

    rayTracingShader.setCamera(camera);
    reprojectShader.setPreviousCamera(lastCamera);
    lastCamera.copy(camera);

    updateSeed(previewWidth, previewHeight);
    newSampleToBuffer(hdrBuffer, previewWidth, previewHeight);

    reprojectBuffer.bind();
    gl.viewport(0, 0, previewWidth, previewHeight);
    reprojectShader.draw({
      blendAmount: reprojectDecay,
      light: hdrBuffer.attachments[rayTracingShader.outputs.light],
      position: hdrBuffer.attachments[rayTracingShader.outputs.position],
      textureScale: previewScale,
      previousLight: lastToneMappedTexture,
      previousPosition: hdrBackBuffer.attachments[rayTracingShader.outputs.position],
      previousTextureScale: lastToneMappedScale,
    });
    reprojectBuffer.unbind();

    toneMapToScreen(reprojectBuffer.attachments[0], previewScale);

    swapBuffers();
  }

  function drawTile() {
    const { x, y, tileWidth, tileHeight, isFirstTile, isLastTile } = tileRender.nextTile();

    // move to isLastTile?
    if (isFirstTile) {

      if (sampleCount === 0) {
        clearBuffer(hdrBuffer);
        reprojectShader.setPreviousCamera(lastCamera);
      }

      updateSeed(screenWidth, screenHeight);
    }

    renderTile(hdrBuffer, x, y, tileWidth, tileHeight);

    if (isLastTile) {
      sampleCount++;

      let blendAmount = clamp(1.0 - sampleCount / maxReprojectedSamples, 0, 1);
      blendAmount *= blendAmount;

      if (blendAmount > 0.0) {
        reprojectBuffer.bind();
        gl.viewport(0, 0, screenWidth, screenHeight);
        reprojectShader.draw({
          blendAmount,
          light: hdrBuffer.attachments[rayTracingShader.outputs.light],
          position: hdrBuffer.attachments[rayTracingShader.outputs.position],
          textureScale: fullscreenScale,
          previousLight: reprojectBackBuffer.attachments[0],
          previousPosition: hdrBackBuffer.attachments[rayTracingShader.outputs.position],
          previousTextureScale: previewScale,
        });
        reprojectBuffer.unbind();

        toneMapToScreen(reprojectBuffer.attachments[0], fullscreenScale);
      } else {
        toneMapToScreen(hdrBuffer.attachments[rayTracingShader.outputs.light], fullscreenScale);
      }

      sampleRenderedCallback(sampleCount);
    }
  }

  function drawTiled(camera) {
    if (!ready) {
      return;
    }

    if (!areCamerasEqual(camera, lastCamera)) {
      drawPreview(camera, lastCamera);
    } else {
      drawTile();
    }
  }

  // debug draw call to measure performance
  // use full resolution buffers every frame
  // reproject every frame
  function drawFull(camera) {
    if (!ready) {
      return;
    }

    if (sampleCount === 0) {
      reprojectShader.setPreviousCamera(lastCamera);
    }

    if (!areCamerasEqual(camera, lastCamera)) {
      sampleCount = 0;
      rayTracingShader.setCamera(camera);
      lastCamera.copy(camera);
      swapHdrBuffer();
      clearBuffer(hdrBuffer);
    } else {
      sampleCount++;
    }

    updateSeed(screenWidth, screenHeight);

    addSampleToBuffer(hdrBuffer, screenWidth, screenHeight);

    reprojectBuffer.bind();
    gl.viewport(0, 0, screenWidth, screenHeight);
    reprojectShader.draw({
      blendAmount: 1.0,
      light: hdrBuffer.attachments[rayTracingShader.outputs.light],
      position: hdrBuffer.attachments[rayTracingShader.outputs.position],
      previousLight: reprojectBackBuffer.attachments[0],
      previousPosition: hdrBackBuffer.attachments[rayTracingShader.outputs.position],
      textureScale: fullscreenScale,
      previousTextureScale: fullscreenScale

    });
    reprojectBuffer.unbind();

    toneMapToScreen(reprojectBuffer.attachments[0], fullscreenScale);

    swapReprojectBuffer();
  }

  function setSize(w, h) {
    screenWidth = w;
    screenHeight = h;

    tileRender.setSize(w, h);
    initFrameBuffers(w, h);
  }

  return {
    drawTiled,
    drawFull,
    restartTimer: tileRender.restartTimer,
    setSize,
    getTotalSamplesRendered() {
      return sampleCount;
    },
    set onSampleRendered(cb) {
      sampleRenderedCallback = cb;
    },
    get onSampleRendered() {
      return sampleRenderedCallback;
    }
  };
}
