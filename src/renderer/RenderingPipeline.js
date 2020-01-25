import { decomposeScene } from './decomposeScene';
import { makeFramebuffer } from './Framebuffer';
import { makeFullscreenQuad } from './FullscreenQuad';
import { makeGBufferPass } from './GBufferPass';
import { makeMaterialBuffer } from './MaterialBuffer';
import { mergeMeshesToGeometry } from './mergeMeshesToGeometry';
import { makeRayTracePass } from './RayTracePass';
import { makeReprojectPass } from './ReprojectPass';
import { makeToneMapPass } from './ToneMapPass';
import { clamp, numberArraysEqual } from './util';
import { makeTileRender } from './TileRender';
import { makeDepthTarget, makeTexture } from './Texture';
import noiseBase64 from './texture/noise';
import { PerspectiveCamera, Vector2 } from 'three';

export function makeRenderingPipeline({
    gl,
    optionalExtensions,
    scene,
    toneMappingParams,
    bounces, // number of global illumination bounces
  }) {

  const maxReprojectedSamples = 20;

  // how many samples to render with uniform noise before switching to stratified noise
  const numUniformSamples = 4;

  // how many partitions of stratified noise should be created
  // higher number results in faster convergence over time, but with lower quality initial samples
  const strataCount = 6;

  const decomposedScene = decomposeScene(scene);

  const mergedMesh = mergeMeshesToGeometry(decomposedScene.meshes);

  const materialBuffer = makeMaterialBuffer(gl, mergedMesh.materials);

  const fullscreenQuad = makeFullscreenQuad(gl);

  const rayTracePass = makeRayTracePass(gl, { bounces, decomposedScene, fullscreenQuad, materialBuffer, mergedMesh, optionalExtensions, scene });

  const reprojectPass = makeReprojectPass(gl, { fullscreenQuad, maxReprojectedSamples });

  const toneMapPass = makeToneMapPass(gl, { fullscreenQuad, toneMappingParams });

  const gBufferPass = makeGBufferPass(gl, { materialBuffer, mergedMesh });

  // used to sample only a portion of the scene to the HDR Buffer to prevent the GPU from locking up from excessive computation
  const tileRender = makeTileRender(gl);

  let ready = false;
  const noiseImage = new Image();
  noiseImage.src = noiseBase64;
  noiseImage.onload = () => {
    rayTracePass.setNoise(noiseImage);
    ready = true;
  };

  let screenWidth = 0;
  let screenHeight = 0;

  let previewWidth = 0;
  let previewHeight = 0;

  const previewScale = new Vector2(1, 1);
  const fullscreenScale = new Vector2(1, 1);

  let lastToneMappedTexture;
  let lastToneMappedScale;

  const lastCamera = new PerspectiveCamera();
  lastCamera.position.set(1, 1, 1);
  lastCamera.updateMatrixWorld();

  let sampleCount = 0;

  let sampleRenderedCallback = () => {};

  let hdrBuffer;
  let hdrBackBuffer;
  let reprojectBuffer;
  let reprojectBackBuffer;

  let gBuffer;
  let gBufferBack;

  function initFrameBuffers(width, height) {
    const makeHdrBuffer = () => makeFramebuffer(gl, {
      color: { 0: makeTexture(gl, { width, height, storage: 'float', magFilter: gl.LINEAR, minFilter: gl.LINEAR }) }
    });

    const makeReprojectBuffer = () => makeFramebuffer(gl, {
        color: { 0: makeTexture(gl, { width, height, storage: 'float', magFilter: gl.LINEAR, minFilter: gl.LINEAR }) }
      });

    hdrBuffer = makeHdrBuffer();
    hdrBackBuffer = makeHdrBuffer();

    reprojectBuffer = makeReprojectBuffer();
    reprojectBackBuffer = makeReprojectBuffer();

    const normalBuffer = makeTexture(gl, { width, height, storage: 'halfFloat' });
    const faceNormalBuffer = makeTexture(gl, { width, height, storage: 'halfFloat' });
    const colorBuffer = makeTexture(gl, { width, height, storage: 'byte', channels: 3 });
    const matProps = makeTexture(gl, { width, height, storage: 'byte', channels: 2 });
    const depthTarget = makeDepthTarget(gl, width, height);

    const makeGBuffer = () => makeFramebuffer(gl, {
      color: {
        [gBufferPass.outputLocs.position]: makeTexture(gl, { width, height, storage: 'float' }),
        [gBufferPass.outputLocs.normal]: normalBuffer,
        [gBufferPass.outputLocs.faceNormal]: faceNormalBuffer,
        [gBufferPass.outputLocs.color]: colorBuffer,
        [gBufferPass.outputLocs.matProps]: matProps,
      },
      depth: depthTarget
    });

    gBuffer = makeGBuffer();
    gBufferBack = makeGBuffer();

    lastToneMappedTexture = hdrBuffer.color[rayTracePass.outputLocs.light];
    lastToneMappedScale = fullscreenScale;
  }

  function swapReprojectBuffer() {
    let temp = reprojectBuffer;
    reprojectBuffer = reprojectBackBuffer;
    reprojectBackBuffer = temp;
  }

  function swapGBuffer() {
    let temp = gBuffer;
    gBuffer = gBufferBack;
    gBufferBack = temp;
  }

  function swapHdrBuffer() {
    let temp = hdrBuffer;
    hdrBuffer = hdrBackBuffer;
    hdrBackBuffer = temp;
  }

  // Shaders will read from the back buffer and draw to the front buffer
  // Buffers are swapped after every render
  function swapBuffers() {
    swapReprojectBuffer();
    swapGBuffer();
    swapHdrBuffer();
  }

  function setSize(w, h) {
    screenWidth = w;
    screenHeight = h;

    tileRender.setSize(w, h);
    initFrameBuffers(w, h);
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

    gl.viewport(0, 0, width, height);
    rayTracePass.draw();

    gl.disable(gl.BLEND);
    buffer.unbind();
  }

  function newSampleToBuffer(buffer, width, height) {
    buffer.bind();
    gl.viewport(0, 0, width, height);
    rayTracePass.draw();
    buffer.unbind();
  }

  function toneMapToScreen(lightTexture, lightScale) {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    toneMapPass.draw({
      light: lightTexture,
      lightScale,
      position: gBuffer.color[gBufferPass.outputLocs.position],
    });

    lastToneMappedTexture = lightTexture;
    lastToneMappedScale = lightScale;
  }

  function renderGBuffer(camera) {
    gBuffer.bind();
    gBufferPass.setCamera(camera);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, screenWidth, screenHeight);
    gBufferPass.draw();
    gBuffer.unbind();

    rayTracePass.setGBuffers({
      position: gBuffer.color[gBufferPass.outputLocs.position],
      normal: gBuffer.color[gBufferPass.outputLocs.normal],
      faceNormal: gBuffer.color[gBufferPass.outputLocs.faceNormal],
      color: gBuffer.color[gBufferPass.outputLocs.color],
      matProps: gBuffer.color[gBufferPass.outputLocs.matProps]
    });
  }

  function renderTile(buffer, x, y, width, height) {
    gl.scissor(x, y, width, height);
    gl.enable(gl.SCISSOR_TEST);
    addSampleToBuffer(buffer, screenWidth, screenHeight);
    gl.disable(gl.SCISSOR_TEST);
  }

  function updateSeed(width, height) {
    rayTracePass.setSize(width, height);

    const jitterX = (Math.random() - 0.5) / width;
    const jitterY = (Math.random() - 0.5) / height;
    gBufferPass.setJitter(jitterX, jitterY);
    rayTracePass.setJitter(jitterX, jitterY);
    reprojectPass.setJitter(jitterX, jitterY);

    if (sampleCount === 0) {
      rayTracePass.setStrataCount(1);
    } else if (sampleCount === numUniformSamples) {
      rayTracePass.setStrataCount(strataCount);
    } else {
      rayTracePass.nextSeed();
    }
  }

  function drawPreview(camera, lastCamera) {
    if (sampleCount > 0) {
      swapBuffers();
    }

    sampleCount = 0;
    tileRender.reset();
    setPreviewBufferDimensions();

    updateSeed(previewWidth, previewHeight);

    rayTracePass.setCamera(camera);
    reprojectPass.setPreviousCamera(lastCamera);
    lastCamera.copy(camera);

    renderGBuffer(camera);

    rayTracePass.bindTextures();
    newSampleToBuffer(hdrBuffer, previewWidth, previewHeight);

    reprojectBuffer.bind();
    gl.viewport(0, 0, previewWidth, previewHeight);
    reprojectPass.draw({
      blendAmount: 1.0,
      light: hdrBuffer.color[0],
      lightScale: previewScale,
      position: gBuffer.color[gBufferPass.outputLocs.position],
      previousLight: lastToneMappedTexture,
      previousLightScale: lastToneMappedScale,
      previousPosition: gBufferBack.color[gBufferPass.outputLocs.position],
    });
    reprojectBuffer.unbind();

    toneMapToScreen(reprojectBuffer.color[0], previewScale);

    swapBuffers();
  }

  function drawTile(camera) {
    const { x, y, tileWidth, tileHeight, isFirstTile, isLastTile } = tileRender.nextTile();

    // move to isLastTile?
    if (isFirstTile) {

      if (sampleCount === 0) { // previous rendered image was a preview image
        clearBuffer(hdrBuffer);
        reprojectPass.setPreviousCamera(lastCamera);
      }

      updateSeed(screenWidth, screenHeight);
      renderGBuffer(camera);
      rayTracePass.bindTextures();
    }

    renderTile(hdrBuffer, x, y, tileWidth, tileHeight);

    if (isLastTile) {
      sampleCount++;

      let blendAmount = clamp(1.0 - sampleCount / maxReprojectedSamples, 0, 1);
      blendAmount *= blendAmount;

      if (blendAmount > 0.0) {
        reprojectBuffer.bind();
        gl.viewport(0, 0, screenWidth, screenHeight);
        reprojectPass.draw({
          blendAmount,
          light: hdrBuffer.color[0],
          lightScale: fullscreenScale,
          position: gBuffer.color[gBufferPass.outputLocs.position],
          previousLight: reprojectBackBuffer.color[0],
          previousLightScale: previewScale,
          previousPosition: gBufferBack.color[gBufferPass.outputLocs.position],
        });
        reprojectBuffer.unbind();

        toneMapToScreen(reprojectBuffer.color[0], fullscreenScale);
      } else {
        toneMapToScreen(hdrBuffer.color[0], fullscreenScale);
      }

      sampleRenderedCallback(sampleCount);
    }
  }

  function draw(camera) {
    if (!ready) {
      return;
    }

    if (!areCamerasEqual(camera, lastCamera)) {
      drawPreview(camera, lastCamera);
    } else {
      drawTile(camera);
    }
  }

  // debug draw call to measure performance
  // use full resolution buffers every frame
  // reproject every frame
  function drawFull(camera) {
    if (!ready) {
      return;
    }

    swapGBuffer();
    swapReprojectBuffer();

    if (sampleCount === 0) {
      reprojectPass.setPreviousCamera(lastCamera);
    }

    if (!areCamerasEqual(camera, lastCamera)) {
      sampleCount = 0;
      rayTracePass.setCamera(camera);
      lastCamera.copy(camera);
      clearBuffer(hdrBuffer);
    } else {
      sampleCount++;
    }

    updateSeed(screenWidth, screenHeight);

    renderGBuffer(camera);

    rayTracePass.bindTextures();
    addSampleToBuffer(hdrBuffer, screenWidth, screenHeight);

    reprojectBuffer.bind();
    gl.viewport(0, 0, screenWidth, screenHeight);
    reprojectPass.draw({
      blendAmount: 1.0,
      light: hdrBuffer.color[0],
      lightScale: fullscreenScale,
      position: gBuffer.color[gBufferPass.outputLocs.position],
      previousLight: lastToneMappedTexture,
      previousLightScale: lastToneMappedScale,
      previousPosition: gBufferBack.color[gBufferPass.outputLocs.position],
    });
    reprojectBuffer.unbind();

    toneMapToScreen(reprojectBuffer.color[0], fullscreenScale);
  }

  return {
    draw,
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
