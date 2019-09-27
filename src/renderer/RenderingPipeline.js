import { makeFullscreenQuad } from './FullscreenQuad';
import { makeRayTracingShader } from './RayTracingShader';
import { makeToneMapShader } from './ToneMapShader';
import { makeFramebuffer } from './Framebuffer';
import { numberArraysEqual, clamp } from './util';
import { makeTileRender } from './TileRender';
import { LensCamera } from '../LensCamera';
import { makeTextureAllocator } from './TextureAllocator';
import noiseBase64 from './texture/noise';

// Important TODO: Refactor this file to get rid of duplicate and confusing code

export function makeRenderingPipeline({
    gl,
    optionalExtensions,
    scene,
    toneMappingParams,
    bounces, // number of global illumination bounces
  }) {

  let ready = false;

  const fullscreenQuad = makeFullscreenQuad(gl);
  const textureAllocator = makeTextureAllocator(gl);
  const rayTracingShader = makeRayTracingShader({gl, optionalExtensions, fullscreenQuad, textureAllocator, scene, bounces});
  const toneMapShader = makeToneMapShader({gl, optionalExtensions, fullscreenQuad, textureAllocator, toneMappingParams});

  const noiseImage = new Image();
  noiseImage.src = noiseBase64;
  noiseImage.onload = () => {
    rayTracingShader.setNoise(noiseImage);
    ready = true;
  };

  const useLinearFiltering = optionalExtensions.OES_texture_float_linear;

  // full resolution buffer representing the rendered scene with HDR lighting
  const hdrBuffer = makeFramebuffer({
    gl,
    renderTarget: { storage: 'float' }
  });

  // lower resolution buffer used for the first frame
  const hdrPreviewBuffer = makeFramebuffer({
    gl,
    renderTarget: { storage: 'float' },
    useLinearFiltering
  });

  // used to sample only a portion of the scene to the HDR Buffer to prevent the GPU from locking up from excessive computation
  const tileRender = makeTileRender(gl);

  const lastCamera = new LensCamera();

  // how many samples to render with uniform noise before switching to stratified noise
  const numUniformSamples = 6;

  // how many partitions of stratified noise should be created
  // higher number results in faster convergence over time, but with lower quality initial samples
  const strataCount = 6;

  let sampleCount = 0;

  let sampleRenderedCallback = () => {};

  function clear() {
    hdrBuffer.bind();
    gl.clear(gl.COLOR_BUFFER_BIT);
    hdrBuffer.unbind();

    sampleCount = 0;
    tileRender.reset();
  }

  function initFirstSample(camera) {
    lastCamera.copy(camera);
    rayTracingShader.setCamera(camera);
    rayTracingShader.useStratifiedSampling(false);
    clear();
  }

  function setPreviewBufferDimensions() {
    const aspectRatio = hdrBuffer.width / hdrBuffer.height;
    const desiredTimeForPreview = 16; // 60 fps
    const numPixelsForPreview = desiredTimeForPreview / tileRender.getTimePerPixel();
    const previewWidth = clamp(Math.sqrt(numPixelsForPreview * aspectRatio), 1, hdrBuffer.width);
    const previewHeight = clamp(previewWidth / aspectRatio, 1, hdrBuffer.height);
    if (previewWidth !== hdrPreviewBuffer.width) {
      hdrPreviewBuffer.setSize(previewWidth, previewHeight);
    }
  }

  function camerasEqual(cam1, cam2) {
    return numberArraysEqual(cam1.matrixWorld.elements, cam2.matrixWorld.elements) &&
      cam1.aspect === cam2.aspect &&
      cam1.fov === cam2.fov &&
      cam1.focus === cam2.focus &&
      cam1.aperture === cam2.aperture;
  }

  function addSampleToBuffer(buffer) {
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);
    buffer.bind();
    gl.viewport(0, 0, buffer.width, buffer.height);
    rayTracingShader.draw();
    buffer.unbind();
    gl.disable(gl.BLEND);
  }

  function newSampleToBuffer(buffer) {
    buffer.bind();
    gl.viewport(0, 0, buffer.width, buffer.height);
    rayTracingShader.draw();
    buffer.unbind();
  }

  function renderPreview() {
    newSampleToBuffer(hdrPreviewBuffer);

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    toneMapShader.draw({
      texture: hdrPreviewBuffer.texture,
    });
  }

  function renderTile(x, y, width, height) {
    gl.scissor(x, y, width, height);
    gl.enable(gl.SCISSOR_TEST);
    addSampleToBuffer(hdrBuffer);
    gl.disable(gl.SCISSOR_TEST);
  }

  function hdrBufferToScreen() {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    toneMapShader.draw({
      texture: hdrBuffer.texture,
    });
  }

  function updateSeed() {
    if (sampleCount === 2) {
      rayTracingShader.useStratifiedSampling(true);
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
    } else if (!camerasEqual(camera, lastCamera)) {
      initFirstSample(camera);
      setPreviewBufferDimensions();
      renderPreview();
    } else {
      const { x, y, tileWidth, tileHeight, isFirstTile, isLastTile } = tileRender.nextTile();

      if (isFirstTile) {
        sampleCount++;
        updateSeed();
      }

      renderTile(x, y, tileWidth, tileHeight);

      if (isLastTile) {
        hdrBufferToScreen();
        sampleRenderedCallback(sampleCount);
      }
    }
  }

  function drawOffscreenTile(camera) {
    if (!ready) {
      return;
    } else if (!camerasEqual(camera, lastCamera)) {
      initFirstSample(camera);
    }

    const { x, y, tileWidth, tileHeight, isFirstTile, isLastTile } = tileRender.nextTile();

    if (isFirstTile) {
      sampleCount++;
      updateSeed();
    }

    renderTile(x, y, tileWidth, tileHeight);

    if (isLastTile) {
      sampleRenderedCallback(sampleCount);
    }
  }

  function drawFull(camera) {
    if (!ready) {
      return;
    } else if (!camerasEqual(camera, lastCamera)) {
      initFirstSample(camera);
    }

    sampleCount++;

    updateSeed();
    addSampleToBuffer(hdrBuffer);
    hdrBufferToScreen();
  }

  function setSize(width, height) {
    rayTracingShader.setSize(width, height);
    hdrBuffer.setSize(width, height);
    tileRender.setSize(width, height);
    clear();
  }

  return {
    drawTile,
    drawOffscreenTile,
    drawFull,
    restartTimer: tileRender.restartTimer,
    setRenderTime: tileRender.setRenderTime,
    setSize,
    hdrBufferToScreen,
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
