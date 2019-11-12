import { decomposeScene } from './decomposeScene';
import { makeFramebuffer } from './Framebuffer';
import { makeFullscreenQuad } from './FullscreenQuad';
import { makeGBufferShader, gBufferRenderTargets } from './GBufferShader';
import { mergeMeshesToGeometry } from './mergeMeshesToGeometry';
import noiseBase64 from './texture/noise.js';
import { makeRayTracingShader, rayTracingRenderTargets } from './RayTracingShader';
import { PerspectiveCamera } from 'three';
import { makeTextureAllocator } from './TextureAllocator';
import { makeToneMapShader } from './ToneMapShader';
import { makeMultiplyShader } from './MultiplyShader';
import { makeBlurShader } from './BlurShader';
import { numberArraysEqual } from './util';


export function makeRenderingPipeline(params) {
  let lightBufferWidth;
  let lightBufferHeight;
  let canvasWidth;
  let canvasHeight;
  let lightBufferMultiplier;
  const {
    bounces, gl, optionalExtensions, scene, toneMappingParams
  } = params;

  const decomposedScene = decomposeScene(scene);

  if (decomposedScene.meshes.length === 0) {
    throw 'RayTracingRenderer: Scene contains no renderable meshes.';
  }

  const mergedMeshes = mergeMeshesToGeometry(decomposedScene.meshes);

  const textureAllocator = makeTextureAllocator(gl);
  const fullscreenQuad = makeFullscreenQuad(gl);

  const gBufferShader = makeGBufferShader({ geometry: mergedMeshes.geometry, materials: mergedMeshes.materials, textureAllocator, gl });
  const rayTracingShader = makeRayTracingShader({ bounces, decomposedScene, fullscreenQuad, gl, mergedMeshes, optionalExtensions, textureAllocator});
  const toneMapShader = makeToneMapShader({ gl, fullscreenQuad, optionalExtensions, textureAllocator, toneMappingParams });
  const multiplyShader = makeMultiplyShader({ gl, fullscreenQuad, optionalExtensions, textureAllocator });
  const blurShader = makeBlurShader({ gl, fullscreenQuad, optionalExtensions, textureAllocator });

  let ready = false;
  const noiseImage = new Image();
  noiseImage.src = noiseBase64;
  noiseImage.onload = () => {
    rayTracingShader.setNoise(noiseImage);
    ready = true;
  };

  const gBuffer = makeFramebuffer({
    depth: true,
    gl,
    renderTarget: gBufferRenderTargets
  });

  const hdrBuffer = makeFramebuffer({
    gl,
    renderTarget: rayTracingRenderTargets,
  });

  // const blendBuffer = makeFramebuffer({
  //   gl,
  //   renderTarget: rayTracingRenderTargets,
  // });

  const blendBuffer = makeFramebuffer({
    gl,
    renderTarget: rayTracingRenderTargets,
  });

  gl.enable(gl.DEPTH_TEST);

  const lastCamera = new PerspectiveCamera();

  rayTracingShader.useStratifiedSampling(true);
  rayTracingShader.setStrataCount(5);

  function drawFull(camera) {
    if (!ready) {
      return;
    }

    if (!camerasEqual(camera, lastCamera)) {
      lastCamera.copy(camera);
      rayTracingShader.setCamera(camera);

      hdrBuffer.bind();
      gl.clear(gl.COLOR_BUFFER_BIT);
      hdrBuffer.unbind();

      blendBuffer.bind();
      gl.clear(gl.COLOR_BUFFER_BIT);
      blendBuffer.unbind();

      gBuffer.bind();
      gl.viewport(0, 0, canvasWidth, canvasHeight);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gBufferShader.draw(camera);
      gBuffer.unbind();
      rayTracingShader.restartSamples();
    }
    hdrBuffer.bind();
    gl.viewport(0, 0, lightBufferWidth, lightBufferHeight);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);
    rayTracingShader.draw(gBuffer.texture);
    rayTracingShader.nextSeed();
    gl.disable(gl.BLEND);
    hdrBuffer.unbind();

    blendBuffer.bind();
    gl.viewport(0, 0, canvasWidth, canvasHeight);
    gl.clear(gl.COLOR_BUFFER_BIT);
    multiplyShader.draw(gBuffer.texture, hdrBuffer.texture);
    blendBuffer.unbind();

    gl.viewport(0, 0, canvasWidth, canvasHeight);
    toneMapShader.draw(blendBuffer.texture);
  }

  function setSize(width, height) {
    lightBufferMultiplier = 1.0;

    lightBufferWidth = width * lightBufferMultiplier;
    lightBufferHeight = height * lightBufferMultiplier;
    canvasWidth = width;
    canvasHeight = height;

    gBuffer.setSize(width, height);
    gl.viewport(0, 0, width, height);
    hdrBuffer.setSize(lightBufferWidth, lightBufferHeight);
    blendBuffer.setSize(width, height);
    rayTracingShader.setSize(lightBufferWidth, lightBufferHeight);
    rayTracingShader.gBufferInput(gBuffer.texture);
  }

  return {
    drawFull,
    drawTile: drawFull,
    setSize,
    setRenderTime() {},
    restartTimer() {},
  };
}

function camerasEqual(cam1, cam2) {
  return numberArraysEqual(cam1.matrixWorld.elements, cam2.matrixWorld.elements) &&
    cam1.aspect === cam2.aspect &&
    cam1.fov === cam2.fov;
}
