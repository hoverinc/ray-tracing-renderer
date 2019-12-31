import fragment from './glsl/reproject.frag';
import { makeShaderPass } from './ShaderPass';
import * as THREE from 'three';

export function makeReprojectShader(gl, params) {
  const {
    fullscreenQuad,
    maxReprojectedSamples,
    textureAllocator,
  } = params;

  const shaderPass = makeShaderPass(gl, {
      defines: {
        MAX_SAMPLES: maxReprojectedSamples.toFixed(1)
      },
      vertex: fullscreenQuad.vertexShader,
      fragment
    });

  const historyCamera = new THREE.Matrix4();

  function setPreviousCamera(camera) {
    historyCamera.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

    shaderPass.uniforms.historyCamera.set(historyCamera.elements);
  }

  function setJitter(x, y) {
    shaderPass.uniforms.jitter.set(x, y);
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

    shaderPass.uniforms.blendAmount.set(blendAmount);
    shaderPass.uniforms.textureScale.set(textureScale.x, textureScale.y);
    shaderPass.uniforms.previousTextureScale.set(previousTextureScale.x, previousTextureScale.y);

    shaderPass.setTexture('light', light);
    shaderPass.setTexture('position', position);
    shaderPass.setTexture('previousLight', previousLight);
    shaderPass.setTexture('previousPosition', previousPosition);

    textureAllocator.bind(shaderPass);

    shaderPass.useProgram();
    fullscreenQuad.draw();
  }

  return {
    draw,
    setJitter,
    setPreviousCamera,
  };
}
