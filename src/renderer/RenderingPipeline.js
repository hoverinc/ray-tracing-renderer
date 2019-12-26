import { makeFullscreenQuad } from './FullscreenQuad';
import { makeRayTracingShader } from './RayTracingShader';
import { makeToneMapShader } from './ToneMapShader';
import { makeFramebuffer } from './Framebuffer';
import { numberArraysEqual } from './util';
import { makeTileRender } from './TileRender';
import { makeTexture } from './Texture';
import { makeTextureAllocator } from './TextureAllocator';
import { makeReprojectShader } from './ReprojectShader';
import noiseBase64 from './texture/noise';
import { clamp } from './util';
import { PerspectiveCamera } from 'three';

// Important TODO: Refactor this file to get rid of duplicate and confusing code

export function makeRenderingPipeline({
    gl,
    optionalExtensions,
    scene,
    toneMappingParams,
    bounces, // number of global illumination bounces
  }) {

  let ready = false;

  const reprojectDecay = 0.975;
  const maxReprojectedSamples = Math.round(reprojectDecay / (1 - reprojectDecay));

  const fullscreenQuad = makeFullscreenQuad(gl);

  const textureAllocator = makeTextureAllocator(gl);

  const rayTracingShader = makeRayTracingShader({bounces, fullscreenQuad, gl, optionalExtensions, scene, textureAllocator});

  const reprojectShader = makeReprojectShader({ fullscreenQuad, gl, maxReprojectedSamples, textureAllocator });

  const toneMapShader = makeToneMapShader({
    fullscreenQuad, gl, optionalExtensions, textureAllocator, toneMappingParams
  });

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

  let previewScale = 1;

  let hdrBuffer;

  // let lastToneMappedBuffer = reprojectPreviewBuffer;

  const clearToBlack = new Float32Array([0, 0, 0, 0]);

  // used to sample only a portion of the scene to the HDR Buffer to prevent the GPU from locking up from excessive computation
  const tileRender = makeTileRender(gl);

  const lastCamera = new PerspectiveCamera();
  lastCamera.position.set(1, 1, 1);
  lastCamera.updateMatrixWorld();

  // how many samples to render with uniform noise before switching to stratified noise
  const numUniformSamples = 6;

  // how many partitions of stratified noise should be created
  // higher number results in faster convergence over time, but with lower quality initial samples
  const strataCount = 6;

  let sampleCount = 1;

  let sampleRenderedCallback = () => {};

  function makeRayTracingFrameBuffer(width, height) {
    return makeFramebuffer({
      gl,
      attachments: {
        [rayTracingShader.outputs.light]: makeTexture(gl, { width, height, storage: 'float' }),
        [rayTracingShader.outputs.position]: makeTexture(gl, { width, height, storage: 'float' })
      }
    });
  }

  function initFirstSample() {
    sampleCount = 1;
    tileRender.reset();
  }

  function setPreviewBufferDimensions() {
    const desiredTimeForPreview = 10;
    const numPixelsForPreview = desiredTimeForPreview / tileRender.getTimePerPixel();

    const aspectRatio = screenWidth / screenHeight;

    previewWidth = Math.round(clamp(Math.sqrt(numPixelsForPreview * aspectRatio), 1, screenWidth));
    previewHeight = Math.round(clamp(previewWidth / aspectRatio, 1, screenHeight));
    previewScale = previewWidth / screenWidth;
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

  function toneMapToScreen(buffer, textureScale) {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    toneMapShader.draw(buffer.attachments[rayTracingShader.outputs.light], textureScale);
    // lastToneMappedBuffer = buffer;
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

    if ( sampleCount === 1) {
      rayTracingShader.setStrataCount(1);
    } else if (sampleCount === numUniformSamples) {
      rayTracingShader.setStrataCount(strataCount);
    } else {
      rayTracingShader.nextSeed();
    }

    rayTracingShader.bindTextures();
  }

  function drawTile(camera) {
    if (!ready) {
      return;
    }

    if (sampleCount === 1) {
      reprojectShader.setPreviousCamera(lastCamera);
    }

    if (!areCamerasEqual(camera, lastCamera)) {
      initFirstSample();
      setPreviewBufferDimensions();

      rayTracingShader.setCamera(camera);

      updateSeed(previewWidth, previewHeight); // scale this
      newSampleToBuffer(hdrBuffer, previewWidth, previewHeight);

      // reprojectShader.setBlendAmount(reprojectDecay);

      // const temp = historyBuffer;
      // historyBuffer = reprojectPreviewBuffer;
      // reprojectPreviewBuffer = temp;

      // reprojectPreviewBuffer.bind();
      // gl.viewport(0, 0, reprojectPreviewBuffer.width, reprojectPreviewBuffer.height);
      // reprojectShader.draw(hdrPreviewBuffer.texture, lastToneMappedBuffer.texture);
      // reprojectPreviewBuffer.unbind();

      // toneMapToScreen(reprojectPreviewBuffer);

      toneMapToScreen(hdrBuffer, previewScale);

      clearBuffer(hdrBuffer);
      lastCamera.copy(camera);
    } else {
      const { x, y, tileWidth, tileHeight, isFirstTile, isLastTile } = tileRender.nextTile();

      if (isFirstTile) {
        sampleCount++;
        updateSeed(screenWidth, screenHeight);
      }

      renderTile(hdrBuffer, x, y, tileWidth, tileHeight);

      if (isLastTile) {
        // let blendAmount = clamp(1.0 - sampleCount / maxReprojectedSamples, 0, 1);
        // blendAmount *= blendAmount;

        // if (blendAmount > 0.0) {
        //   reprojectShader.setBlendAmount(blendAmount);
        //   reprojectBuffer.bind();
        //   gl.viewport(0, 0, reprojectBuffer.width, reprojectBuffer.height);
        //   reprojectShader.draw(hdrBuffer.texture, reprojectPreviewBuffer.texture);
        //   reprojectBuffer.unbind();

        //   toneMapToScreen(reprojectBuffer);
        // } else {
          toneMapToScreen(hdrBuffer, 1);
        // }

        sampleRenderedCallback(sampleCount);
      }
    }
  }

  // debug draw call to measure performance
  // use full resolution buffers every frame
  // reproject every frame
  function drawFull(camera) {
    if (!ready) {
      return;
    }

    if (sampleCount === 1) {
      reprojectShader.setPreviousCamera(lastCamera);
    }

    if (!areCamerasEqual(camera, lastCamera)) {
      sampleCount = 1;

      rayTracingShader.setCamera(camera);

      clearBuffer(hdrBuffer);
      lastCamera.copy(camera);
    } else {
      sampleCount++;
    }

    updateSeed(screenWidth, screenHeight);

    addSampleToBuffer(hdrBuffer, screenWidth, screenHeight);

    // let blendAmount = clamp(1.0 - sampleCount / maxReprojectedSamples, 0, 1);
    // blendAmount *= blendAmount;
    // reprojectShader.setBlendAmount(blendAmount);

    // if (historyBuffer.width !== hdrBuffer.width) {
    //   historyBuffer.setSize(hdrBuffer.width, hdrBuffer.height);
    // }

    // const temp = historyBuffer;
    // historyBuffer = reprojectBuffer;
    // reprojectBuffer = temp;

    // reprojectBuffer.bind();
    // gl.viewport(0, 0, reprojectBuffer.width, reprojectBuffer.height);
    // reprojectShader.draw(hdrBuffer.texture, historyBuffer.texture);
    // reprojectBuffer.unbind();

    // toneMapToScreen(reprojectBuffer);
    toneMapToScreen(hdrBuffer);
  }

  function setSize(w, h) {
    screenWidth = w;
    screenHeight = h;

    tileRender.setSize(w, h);
    hdrBuffer = makeRayTracingFrameBuffer(w, h);
    initFirstSample();

    // hdrBuffer.setSize(w, h);
    // reprojectBuffer.setSize(w, h);
  }

  return {
    drawTile,
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
