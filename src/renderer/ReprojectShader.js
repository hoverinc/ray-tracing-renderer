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
    shaderPass.useProgram();

    historyCamera.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

    gl.uniformMatrix4fv(shaderPass.uniforms.historyCamera, false, historyCamera.elements);
  }

  function setJitter(x, y) {
    shaderPass.useProgram();
    gl.uniform2f(shaderPass.uniforms.jitter, x, y);
  }

  function draw(params) {
    const {
      blendAmount,
      light,
      position,
      previousLight,
      previousPosition,
      textureScale = 1.0,
    } = params;

    shaderPass.useProgram();

    gl.uniform1f(shaderPass.uniforms.blendAmount, blendAmount);
    gl.uniform1f(shaderPass.uniforms.textureScale, textureScale);

    shaderPass.setTexture('light', light);
    shaderPass.setTexture('position', position);
    shaderPass.setTexture('previousLight', previousLight);
    shaderPass.setTexture('previousPosition', previousPosition);

    textureAllocator.bind(shaderPass);

    fullscreenQuad.draw();
  }

  return {
    draw,
    setJitter,
    setPreviousCamera,
  };
}
