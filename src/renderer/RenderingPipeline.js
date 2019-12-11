import { makeFullscreenQuad } from './FullscreenQuad';
import { makeRayTracingShader, rayTracingRenderTargets } from './RayTracingShader';
import { makeToneMapShader } from './ToneMapShader';
import { makeFramebuffer } from './Framebuffer';
import { numberArraysEqual, clamp } from './util';
import { makeTileRender } from './TileRender';
import { LensCamera } from '../LensCamera';
import { makeTextureAllocator } from './TextureAllocator';
import { makeReprojectShader } from './ReprojectShader';
import * as THREE from 'three';
import noiseBase64 from './texture/noise';
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

  // full resolution buffer representing the rendered scene with HDR lighting
  let hdrBuffer = makeFramebuffer({
    gl,
    renderTarget: rayTracingRenderTargets,
  });

  let hdrPreviewBuffer = makeFramebuffer({
    gl,
    renderTarget: rayTracingRenderTargets,
  });

  let historyBuffer = makeFramebuffer({
    gl,
    renderTarget: rayTracingRenderTargets,
    linearFiltering: true
  });

  let reprojectBuffer = makeFramebuffer({
    gl,
    renderTarget: rayTracingRenderTargets
  });

  let reprojectPreviewBuffer = makeFramebuffer({
    gl,
    renderTarget: rayTracingRenderTargets,
    linearFiltering: true
  });

  let lastToneMappedBuffer = reprojectPreviewBuffer;

  const clearToBlack = new Float32Array([0, 0, 0, 0]);

  // used to sample only a portion of the scene to the HDR Buffer to prevent the GPU from locking up from excessive computation
  const tileRender = makeTileRender(gl);

  const lastCamera = new PerspectiveCamera();

  // how many samples to render with uniform noise before switching to stratified noise
  const numUniformSamples = 6;

  // how many partitions of stratified noise should be created
  // higher number results in faster convergence over time, but with lower quality initial samples
  const strataCount = 6;

  let sampleCount = 1;

  let sampleRenderedCallback = () => {};

  function initFirstSample() {
    sampleCount = 1;
    tileRender.reset();
  }

  function setPreviewBufferDimensions() {
    const desiredTimeForPreview = 10;
    const numPixelsForPreview = desiredTimeForPreview / tileRender.getTimePerPixel();

    const aspectRatio = hdrBuffer.width / hdrBuffer.height;
    const previewWidth = Math.round(clamp(Math.sqrt(numPixelsForPreview * aspectRatio), 1, hdrBuffer.width));
    const previewHeight = Math.round(clamp(previewWidth / aspectRatio, 1, hdrBuffer.height));

    const diff = Math.abs(previewWidth - hdrPreviewBuffer.width) / previewWidth;
    if (diff > 0.05) { // don't bother resizing if the buffer size is only slightly different
      hdrPreviewBuffer.setSize(previewWidth, previewHeight);
      reprojectPreviewBuffer.setSize(previewWidth, previewHeight);
      historyBuffer.setSize(previewWidth, previewHeight);
    }
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

  function addSampleToBuffer(buffer) {
    buffer.bind();

    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);

    gl.clearBufferfv(gl.COLOR, rayTracingRenderTargets.location.position, clearToBlack);

    gl.viewport(0, 0, buffer.width, buffer.height);
    rayTracingShader.draw();

    gl.disable(gl.BLEND);
    buffer.unbind();
  }

  function newSampleToBuffer(buffer) {
    buffer.bind();
    gl.viewport(0, 0, buffer.width, buffer.height);
    rayTracingShader.draw();
    buffer.unbind();
  }

  function toneMapToScreen(buffer) {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    toneMapShader.draw(buffer.texture);
    lastToneMappedBuffer = buffer;
  }

  function renderTile(buffer, x, y, width, height) {
    gl.scissor(x, y, width, height);
    gl.enable(gl.SCISSOR_TEST);
    addSampleToBuffer(buffer);
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
      updateSeed(hdrPreviewBuffer.width, hdrPreviewBuffer.height);
      newSampleToBuffer(hdrPreviewBuffer);

      reprojectShader.setBlendAmount(reprojectDecay);

      const temp = historyBuffer;
      historyBuffer = reprojectPreviewBuffer;
      reprojectPreviewBuffer = temp;

      reprojectPreviewBuffer.bind();
      gl.viewport(0, 0, reprojectPreviewBuffer.width, reprojectPreviewBuffer.height);
      reprojectShader.draw(hdrPreviewBuffer.texture, lastToneMappedBuffer.texture);
      reprojectPreviewBuffer.unbind();

      toneMapToScreen(reprojectPreviewBuffer);

      clearBuffer(hdrBuffer);
      lastCamera.copy(camera);
    } else {
      const { x, y, tileWidth, tileHeight, isFirstTile, isLastTile } = tileRender.nextTile();

      if (isFirstTile) {
        sampleCount++;
        updateSeed(hdrBuffer.width, hdrBuffer.height);
      }

      renderTile(hdrBuffer, x, y, tileWidth, tileHeight);

      if (isLastTile) {
        let blendAmount = clamp(1.0 - sampleCount / maxReprojectedSamples, 0, 1);
        blendAmount *= blendAmount;

        if (blendAmount > 0.0) {
          reprojectShader.setBlendAmount(blendAmount);
          reprojectBuffer.bind();
          gl.viewport(0, 0, reprojectBuffer.width, reprojectBuffer.height);
          reprojectShader.draw(hdrBuffer.texture, reprojectPreviewBuffer.texture);
          reprojectBuffer.unbind();

          toneMapToScreen(reprojectBuffer);
        } else {
          toneMapToScreen(hdrBuffer);
        }

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

    updateSeed(hdrBuffer.width, hdrBuffer.height);

    addSampleToBuffer(hdrBuffer);

    let blendAmount = clamp(1.0 - sampleCount / maxReprojectedSamples, 0, 1);
    blendAmount *= blendAmount;
    reprojectShader.setBlendAmount(blendAmount);

    if (historyBuffer.width !== hdrBuffer.width) {
      historyBuffer.setSize(hdrBuffer.width, hdrBuffer.height);
    }

    const temp = historyBuffer;
    historyBuffer = reprojectBuffer;
    reprojectBuffer = temp;

    reprojectBuffer.bind();
    gl.viewport(0, 0, reprojectBuffer.width, reprojectBuffer.height);
    reprojectShader.draw(hdrBuffer.texture, historyBuffer.texture);
    reprojectBuffer.unbind();

    toneMapToScreen(reprojectBuffer);
  }

  function setSize(w, h) {
    rayTracingShader.setSize(w, h);
    tileRender.setSize(w, h);
    hdrBuffer.setSize(w, h);
    reprojectBuffer.setSize(w, h);
    initFirstSample();
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
