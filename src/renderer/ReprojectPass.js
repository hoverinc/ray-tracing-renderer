import fragment from './glsl/reproject.frag';
import { makeRenderPass } from './RenderPass';
import * as THREE from 'three';

export function makeReprojectPass(gl, params) {
  const {
    fullscreenQuad,
    maxReprojectedSamples,
  } = params;

  const renderPass = makeRenderPass(gl, {
      defines: {
        MAX_SAMPLES: maxReprojectedSamples.toFixed(1)
      },
      vertex: fullscreenQuad.vertexShader,
      fragment
    });

  const historyCamera = new THREE.Matrix4();

  function setPreviousCamera(camera) {
    historyCamera.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

    renderPass.setUniform('historyCamera', historyCamera.elements);
  }

  function setJitter(x, y) {
    renderPass.setUniform('jitter', x, y);
  }

  function draw(params) {
    const {
      blendAmount,
      light,
      position,
      previousLight,
      previousPosition,
      textureScale,
      previousTextureScale,
    } = params;

    renderPass.setUniform('blendAmount', blendAmount);
    renderPass.setUniform('textureScale', textureScale.x, textureScale.y);
    renderPass.setUniform('previousTextureScale', previousTextureScale.x, previousTextureScale.y);

    renderPass.setTexture('light', light);
    renderPass.setTexture('position', position);
    renderPass.setTexture('previousLight', previousLight);
    renderPass.setTexture('previousPosition', previousPosition);

    renderPass.useProgram();
    fullscreenQuad.draw();
  }

  return {
    draw,
    setJitter,
    setPreviousCamera,
  };
}
