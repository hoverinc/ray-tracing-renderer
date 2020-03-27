import { decomposeScene } from './decomposeScene';
import { makeFramebuffer } from './Framebuffer';
import { makeFullscreenQuad } from './FullscreenQuad';
import { makeGBufferPass } from './GBufferPass';
import { makeMaterialBuffer } from './MaterialBuffer';
import { mergeMeshesToGeometry } from './mergeMeshesToGeometry';
import { makeRayTracePass } from './RayTracePass';
import { makeRenderSize } from './RenderSize';
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

  // tile rendering can cause the GPU to stutter, throwing off future benchmarks for the preview frames
  // wait to measure performance until this number of frames have been rendered
  const previewFramesBeforeBenchmark = 2;

  // used to sample only a portion of the scene to the HDR Buffer to prevent the GPU from locking up from excessive computation
  const tileRender = makeTileRender(gl);

  const previewSize = makeRenderSize(gl);

  const decomposedScene = decomposeScene(scene);

  const mergedMesh = mergeMeshesToGeometry(decomposedScene.meshes);

  const materialBuffer = makeMaterialBuffer(gl, mergedMesh.materials);

  const fullscreenQuad = makeFullscreenQuad(gl);

  const rayTracePass = makeRayTracePass(gl, { bounces, decomposedScene, fullscreenQuad, materialBuffer, mergedMesh, optionalExtensions, scene });

  const reprojectPass = makeReprojectPass(gl, { fullscreenQuad, maxReprojectedSamples });

  const toneMapPass = makeToneMapPass(gl, { fullscreenQuad, toneMappingParams });

  const gBufferPass = makeGBufferPass(gl, { materialBuffer, mergedMesh });

  let ready = false;

  const noiseImage = new Image();
  noiseImage.src = noiseBase64;
  noiseImage.onload = () => {
    rayTracePass.setNoise(noiseImage);
    ready = true;
  };

  let frameTime;
  let elapsedFrameTime;
  let sampleTime;

  let sampleCount = 0;
  let numPreviewsRendered = 0;

  let firstFrame = true;

  let sampleRenderedCallback = () => {};

  const lastCamera = new PerspectiveCamera();
  lastCamera.position.set(1, 1, 1);
  lastCamera.updateMatrixWorld();

  let screenWidth = 0;
  let screenHeight = 0;

  const fullscreenScale = new Vector2(1, 1);

  let lastToneMappedScale = fullscreenScale;

  let hdrBuffer;
  let hdrBackBuffer;
  let reprojectBuffer;
  let reprojectBackBuffer;

  let gBuffer;
  let gBufferBack;

  let lastToneMappedTexture;

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
    previewSize.setSize(w, h);
    initFrameBuffers(w, h);
    firstFrame = true;
  }

  // called every frame to update clock
  function time(newTime) {
    elapsedFrameTime = newTime - frameTime;
    frameTime = newTime;
  }

  function areCamerasEqual(cam1, cam2) {
    return numberArraysEqual(cam1.matrixWorld.elements, cam2.matrixWorld.elements) &&
      cam1.aspect === cam2.aspect &&
      cam1.fov === cam2.fov;
  }

  function updateSeed(width, height, useJitter = true) {
    rayTracePass.setSize(width, height);

    const jitterX = useJitter ? (Math.random() - 0.5) / width : 0;
    const jitterY = useJitter ? (Math.random() - 0.5) / height : 0;
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
    lastToneMappedScale = lightScale.clone();
  }

  function renderGBuffer() {
    gBuffer.bind();
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

  function setCameras(camera, lastCamera) {
    rayTracePass.setCamera(camera);
    gBufferPass.setCamera(camera);
    reprojectPass.setPreviousCamera(lastCamera);
    lastCamera.copy(camera);
  }

  function drawPreview() {
    if (sampleCount > 0) {
      swapBuffers();
    }

    if (numPreviewsRendered >= previewFramesBeforeBenchmark) {
      previewSize.adjustSize(elapsedFrameTime);
    }

    updateSeed(previewSize.width, previewSize.height, false);

    renderGBuffer();

    rayTracePass.bindTextures();
    newSampleToBuffer(hdrBuffer, previewSize.width, previewSize.height);

    reprojectBuffer.bind();
    gl.viewport(0, 0, previewSize.width, previewSize.height);
    reprojectPass.draw({
      blendAmount: 1.0,
      light: hdrBuffer.color[0],
      lightScale: previewSize.scale,
      position: gBuffer.color[gBufferPass.outputLocs.position],
      previousLight: lastToneMappedTexture,
      previousLightScale: lastToneMappedScale,
      previousPosition: gBufferBack.color[gBufferPass.outputLocs.position],
    });
    reprojectBuffer.unbind();

    toneMapToScreen(reprojectBuffer.color[0], previewSize.scale);

    swapBuffers();
  }

  function drawTile() {
    const { x, y, tileWidth, tileHeight, isFirstTile, isLastTile } = tileRender.nextTile(elapsedFrameTime);

    if (isFirstTile) {

      if (sampleCount === 0) { // previous rendered image was a preview image
        clearBuffer(hdrBuffer);
        reprojectPass.setPreviousCamera(lastCamera);
      } else {
        sampleRenderedCallback(sampleCount, frameTime - sampleTime || NaN);
        sampleTime = frameTime;
      }

      updateSeed(screenWidth, screenHeight, true);
      renderGBuffer();
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
          previousLightScale: previewSize.scale,
          previousPosition: gBufferBack.color[gBufferPass.outputLocs.position],
        });
        reprojectBuffer.unbind();

        toneMapToScreen(reprojectBuffer.color[0], fullscreenScale);
      } else {
        toneMapToScreen(hdrBuffer.color[0], fullscreenScale);
      }
    }
  }

  function draw(camera) {
    if (!ready) {
      return;
    }

    if (!areCamerasEqual(camera, lastCamera)) {
      setCameras(camera, lastCamera);

      if (firstFrame) {
        firstFrame = false;
      } else {
        drawPreview(camera, lastCamera);
        numPreviewsRendered++;
      }
      tileRender.reset();
      sampleCount = 0;
    } else {
      drawTile();
      numPreviewsRendered = 0;
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

    if (!areCamerasEqual(camera, lastCamera)) {
      sampleCount = 0;
      clearBuffer(hdrBuffer);
    } else {
      sampleCount++;
    }

    setCameras(camera, lastCamera);

    updateSeed(screenWidth, screenHeight, true);

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
    setSize,
    time,
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
