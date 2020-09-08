import { decomposeScene } from './decomposeScene';
import { makeEnvMap } from './envMap';
import { makeFramebuffer } from './Framebuffer';
import { makeFullscreenQuad } from './FullscreenQuad';
import { makeGBufferPass } from './GBufferPass';
import { makeMaterialBuffer } from './MaterialBuffer';
import { mergeMeshesToGeometry } from './mergeMeshesToGeometry';
import { makeRayTracePass } from './RayTracePass';
import { makeRenderSize } from './RenderSize';
import { makeReprojectPass } from './ReprojectPass';
import { makeAlbedoSeparationPass } from './AlbedoSeparationPass';
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

  const maxSmoothSurfaceSamples = 5;
  const maxRoughSurfaceSamples = 100;
  const maxSamples = Math.max(maxRoughSurfaceSamples, maxSmoothSurfaceSamples);

  // how many samples to render with uniform noise before switching to stratified noise
  const numUniformSamples = 5;

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

  const envMapTextures = makeEnvMap(gl, { decomposedScene, optionalExtensions });

  const fullscreenQuad = makeFullscreenQuad(gl);

  const rayTracePass = makeRayTracePass(gl, { bounces, envMapTextures, fullscreenQuad, materialBuffer, mergedMesh, optionalExtensions });

  const reprojectPass = makeReprojectPass(gl, { fullscreenQuad, maxRoughSurfaceSamples, maxSmoothSurfaceSamples });

  const toneMapPass = makeToneMapPass(gl, { envMapTextures, fullscreenQuad, toneMappingParams });

  const gBufferPass = makeGBufferPass(gl, { materialBuffer, mergedMesh });

  const albedoSeparationPass = makeAlbedoSeparationPass(gl, { fullscreenQuad });

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

  const screenSize = new Vector2();

  const fullscreenScale = new Vector2(1, 1);

  let lastToneMappedScale = fullscreenScale;

  // TODO refactor: Move frame buffer creation to respective shader pass

  let hdrBuffer;
  let hdrBackBuffer;
  let reprojectBuffer;
  let reprojectBackBuffer;

  let gBuffer;
  let gBufferBack;

  let diffuseSpecularAlbedoBuffer;

  let lastToneMappedTexture;

  function initFrameBuffers(width, height) {

    function makeHdrBuffer(outputLocs) {
      const texture = makeTexture(gl, { width, height, length: 2, storage: 'halfFloat', magFilter: gl.LINEAR, minFilter: gl.LINEAR });
      return makeFramebuffer(gl, {
        colorAttachments: [
          { location: outputLocs.diffuse, layer: 0, texture },
          { location: outputLocs.specular, layer: 1, texture },
        ]
      });
    }

    hdrBuffer = makeHdrBuffer(rayTracePass.outputLocs);
    hdrBackBuffer = makeHdrBuffer(rayTracePass.outputLocs);

    reprojectBuffer = makeHdrBuffer(reprojectPass.outputLocs);
    reprojectBackBuffer = makeHdrBuffer(reprojectPass.outputLocs);

    const normalBuffer = makeTexture(gl, { width, height, storage: 'halfFloat' });
    const faceNormalBuffer = makeTexture(gl, { width, height, storage: 'halfFloat' });
    const albedoBuffer = makeTexture(gl, { width, height, storage: 'byte', channels: 4});
    const matProps = makeTexture(gl, { width, height, storage: 'byte', channels: 2 });

    const depthTarget = makeDepthTarget(gl, width, height);

    function makeGBuffer() {
      const positionBuffer = makeTexture(gl, { width, height, storage: 'float' });

      return makeFramebuffer(gl, {
        colorAttachments: [
          { location: gBufferPass.outputLocs.position, texture: positionBuffer},
          { location: gBufferPass.outputLocs.normal, texture: normalBuffer },
          { location: gBufferPass.outputLocs.faceNormal, texture: faceNormalBuffer },
          { location: gBufferPass.outputLocs.albedo, texture: albedoBuffer },
          { location: gBufferPass.outputLocs.matProps, texture: matProps },
        ],
        depthAttachment: depthTarget
      });
    }

    gBuffer = makeGBuffer();
    gBufferBack = makeGBuffer();

    // halfFloat enables more precise antialiasing over byte
    const diffuseSpecularAlbedo = makeTexture(gl, { width, height, length: 2, storage: 'halfFloat' });

    diffuseSpecularAlbedoBuffer = makeFramebuffer(gl, {
      colorAttachments: [
        { location: albedoSeparationPass.outputLocs.diffuseAlbedo, texture: diffuseSpecularAlbedo, layer: 0 },
        { location: albedoSeparationPass.outputLocs.specularAlbedo, texture: diffuseSpecularAlbedo, layer: 1 },
      ]
    });

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
    screenSize.width = w;
    screenSize.height = h;

    tileRender.setSize(w, h);
    previewSize.setSize(w, h);
    initFrameBuffers(w, h);
    firstFrame = true;
  }

  // called every frame to update clock
  function sync(newTime) {
    elapsedFrameTime = newTime - frameTime;
    frameTime = newTime;
  }

  function areCamerasEqual(cam1, cam2) {
    return numberArraysEqual(cam1.matrixWorld.elements, cam2.matrixWorld.elements) &&
      cam1.aspect === cam2.aspect &&
      cam1.fov === cam2.fov;
  }

  function setCameras(camera, lastCamera) {
    rayTracePass.setCamera(camera);
    gBufferPass.setCamera(camera);
    toneMapPass.setCamera(camera);
    reprojectPass.setPreviousCamera(lastCamera);
    lastCamera.copy(camera);
  }

  function updateSeed(size, useJitter = true) {
    rayTracePass.setSize(size.width, size.height);

    const jitterX = useJitter ? (Math.random() - 0.5) / size.width : 0;
    const jitterY = useJitter ? (Math.random() - 0.5) / size.height : 0;
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

  function addSampleToBuffer(buffer, size) {
    buffer.bind();

    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);

    gl.viewport(0, 0, size.width, size.height);
    rayTracePass.draw();

    gl.disable(gl.BLEND);
    buffer.unbind();
  }

  function newSampleToBuffer(buffer, size) {
    buffer.bind();
    gl.viewport(0, 0, size.width, size.height);
    rayTracePass.draw();
    buffer.unbind();
  }

  function renderGBuffer(sampleCount) {
    gBuffer.bind();

    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

    gl.viewport(0, 0, screenSize.width, screenSize.height);
    gBufferPass.draw();
    gBuffer.unbind();

    // separate albedo into diffuse and specular component
    // antialias results by blending
    diffuseSpecularAlbedoBuffer.bind();
    const cumulativeAvg = 1.0 / (sampleCount + 1);
    gl.blendFunc(gl.CONSTANT_COLOR, gl.ONE_MINUS_CONSTANT_COLOR);
    gl.blendColor(cumulativeAvg, cumulativeAvg, cumulativeAvg, cumulativeAvg);
    gl.enable(gl.BLEND);

    albedoSeparationPass.draw({
      albedo: gBuffer.color[gBufferPass.outputLocs.albedo],
      matProps: gBuffer.color[gBufferPass.outputLocs.matProps]
    });

    gl.disable(gl.BLEND);
    diffuseSpecularAlbedoBuffer.unbind();

    rayTracePass.setGBuffers({
      position: gBuffer.color[gBufferPass.outputLocs.position],
      normal: gBuffer.color[gBufferPass.outputLocs.normal],
      faceNormal: gBuffer.color[gBufferPass.outputLocs.faceNormal],
      albedo: gBuffer.color[gBufferPass.outputLocs.albedo],
      matProps: gBuffer.color[gBufferPass.outputLocs.matProps]
    });
  }

  function reproject({ size, blendAmount, lightScale, previousLight, previousLightScale, reprojectPosition = true }) {
    reprojectBuffer.bind();
    gl.viewport(0, 0, size.width, size.height);
    reprojectPass.draw({
      blendAmount,
      light: hdrBuffer.color[0],
      lightScale,
      position: gBuffer.color[gBufferPass.outputLocs.position],
      matProps: gBuffer.color[gBufferPass.outputLocs.matProps],
      previousLight,
      previousLightScale,
      previousPosition: gBufferBack.color[gBufferPass.outputLocs.position],
      reprojectPosition
    });
    reprojectBuffer.unbind();
  }

  function renderTile(buffer, x, y, width, height) {
    gl.scissor(x, y, width, height);
    gl.enable(gl.SCISSOR_TEST);
    addSampleToBuffer(buffer, screenSize);
    gl.disable(gl.SCISSOR_TEST);
  }

  function toneMapToScreen(lightTexture, lightScale) {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    toneMapPass.draw({
      light: lightTexture,
      lightScale,
      position: gBuffer.color[gBufferPass.outputLocs.position],
      diffuseSpecularAlbedo: diffuseSpecularAlbedoBuffer.color[0],
    });

    lastToneMappedTexture = lightTexture;
    lastToneMappedScale = lightScale.clone();
  }

  function drawPreview() {
    if (sampleCount > 0) {
      swapBuffers();
    }

    if (numPreviewsRendered >= previewFramesBeforeBenchmark) {
      previewSize.adjustSize(elapsedFrameTime);
    }

    updateSeed(previewSize, false);

    renderGBuffer(sampleCount);

    rayTracePass.bindTextures();
    newSampleToBuffer(hdrBuffer, previewSize);

    reproject({
      size: previewSize,
      blendAmount: 1.0,
      lightScale: previewSize.scale,
      previousLight: lastToneMappedTexture,
      previousLightScale: lastToneMappedScale,
      reprojectPosition: true
    });

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

      updateSeed(screenSize, true);
      renderGBuffer(sampleCount);
      rayTracePass.bindTextures();
    }

    renderTile(hdrBuffer, x, y, tileWidth, tileHeight);

    if (isLastTile) {
      sampleCount++;

      let blendAmount = clamp(1.0 - sampleCount / maxSamples, 0, 1);
      blendAmount *= blendAmount;

      if (blendAmount > 0.0) {
        reproject({
          size: screenSize,
          blendAmount,
          lightScale: fullscreenScale,
          previousLight: reprojectBackBuffer.color[0],
          previousLightScale: previewSize.scale,
          reprojectPosition: sampleCount === 0 // Only blend frames and don't reproject positions after camera stays still
        });

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

    updateSeed(screenSize, true);

    renderGBuffer(sampleCount);

    rayTracePass.bindTextures();
    addSampleToBuffer(hdrBuffer, screenSize);

    reproject({
      size: screenSize,
      // blendAmount: 1.0,
      blendAmount: 1,
      lightScale: fullscreenScale,
      previousLight: reprojectBackBuffer.color[0],
      previousLightScale: fullscreenScale,
      reprojectPosition: sampleCount === 0
    });

    toneMapToScreen(reprojectBuffer.color[0], fullscreenScale);
    // toneMapToScreen(hdrBuffer.color[0], fullscreenScale);
  }

  return {
    draw,
    drawFull,
    setSize,
    sync,
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
