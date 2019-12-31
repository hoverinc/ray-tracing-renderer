import fragment from './glsl/reproject.frag';
import { makeRenderPass } from './RenderPass';
import * as THREE from 'three';

export function makeReprojectShader(gl, params) {
  const {
    fullscreenQuad,
    maxReprojectedSamples,
    textureAllocator,
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

    renderPass.uniforms.historyCamera.set(historyCamera.elements);
  }

  function setJitter(x, y) {
    renderPass.uniforms.jitter.set(x, y);
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

    renderPass.uniforms.blendAmount.set(blendAmount);
    renderPass.uniforms.textureScale.set(textureScale.x, textureScale.y);
    renderPass.uniforms.previousTextureScale.set(previousTextureScale.x, previousTextureScale.y);

    renderPass.setTexture('light', light);
    renderPass.setTexture('position', position);
    renderPass.setTexture('previousLight', previousLight);
    renderPass.setTexture('previousPosition', previousPosition);

    textureAllocator.bind(renderPass);

    renderPass.useProgram();
    fullscreenQuad.draw();
  }

  return {
    draw,
    setJitter,
    setPreviousCamera,
  };
}
