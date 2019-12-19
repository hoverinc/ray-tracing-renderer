import fragment from './glsl/reproject.frag';
import { makeShaderPass } from './ShaderPass';
import * as THREE from 'three';

export function makeReprojectShader(params) {
  const {
    fullscreenQuad,
    gl,
    maxReprojectedSamples,
    textureAllocator,
  } = params;

  const shaderPass = makeShaderPass({
      gl,
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

  function setBlendAmount(x) {
    shaderPass.useProgram();
    gl.uniform1f(shaderPass.uniforms.blendAmount, x);
  }

  function setJitter(x, y) {
    shaderPass.useProgram();
    gl.uniform2f(shaderPass.uniforms.jitter, x, y);
  }

  function draw(hdrBuffer, historyBuffer) {
    shaderPass.useProgram();

    shaderPass.setTexture('hdrBuffer', hdrBuffer);
    shaderPass.setTexture('historyBuffer', historyBuffer);

    textureAllocator.bind(shaderPass);

    fullscreenQuad.draw();
  }

  return {
    draw,
    setBlendAmount,
    setJitter,
    setPreviousCamera,
  };
}
