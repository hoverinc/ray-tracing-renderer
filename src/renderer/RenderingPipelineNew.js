import { decomposeScene } from './decomposeScene';
import { makeFramebuffer } from './FrameBuffer';
import { makeFullscreenQuad } from './FullscreenQuad';
import { makeGBufferShader } from './GBufferShader';
import { mergeMeshesToGeometry } from './mergeMeshesToGeometry';
import noiseBase64 from './texture/noise.js';
import { makeRayTracingShader } from './RayTracingShader';
import { PerspectiveCamera } from 'three';
import { makeTextureAllocator } from './TextureAllocator';
import { makeToneMapShader } from './ToneMapShader';
import { numberArraysEqual, clamp } from './util';


export function makeRenderingPipeline(params) {

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

  const gBufferShader = makeGBufferShader({ geometry: mergedMeshes.geometry, gl });
  const rayTracingShader = makeRayTracingShader({ bounces, decomposedScene, fullscreenQuad, gl, mergedMeshes, optionalExtensions, textureAllocator});
  const toneMapShader = makeToneMapShader({ gl, fullscreenQuad, optionalExtensions, textureAllocator, toneMappingParams });

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
    renderTargets: gBufferShader.renderTargets
  });

  const hdrBuffer = makeFramebuffer({
    gl,
    renderTarget: {
      storage: 'float'
    }
  });

  gl.enable(gl.DEPTH_TEST);

  const lastCamera = new PerspectiveCamera();

  // rayTracingShader.gBufferInput(gBuffer.texture);
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

      gBuffer.bind();
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gBufferShader.draw(camera);
      gBuffer.unbind();
    }

    hdrBuffer.bind();
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);
    rayTracingShader.draw();
    rayTracingShader.nextSeed();
    gl.disable(gl.BLEND);
    hdrBuffer.unbind();

    toneMapShader.draw({ texture: hdrBuffer.texture });
  }

  function setSize(width, height) {
    gl.viewport(0, 0, width, height);
    gBuffer.setSize(width, height);
    hdrBuffer.setSize(width, height);
    rayTracingShader.setSize(width, height);
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
