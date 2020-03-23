import fragment from './glsl/reproject.frag';
import { makeRenderPass } from './RenderPass';
import * as THREE from 'three';

export function makeReprojectPass(gl, params) {
  const {
    fullscreenQuad,
    maxReprojectedSamples,
  } = params;

  const renderPassParams = {
    defines: {
      MAX_SAMPLES: maxReprojectedSamples.toFixed(1)
    },
    vertex: fullscreenQuad.vertexShader,
    fragment
  };

  renderPassParams.defines.REPROJECT = true;
  const renderPassReproject = makeRenderPass(gl, renderPassParams);

  renderPassParams.defines.REPROJECT = false;
  const renderPassBlend = makeRenderPass(gl, renderPassParams);

  const historyCamera = new THREE.Matrix4();

  function setPreviousCamera(camera) {
    historyCamera.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  }

  let jitterX = 0;
  let jitterY = 0;
  function setJitter(x, y) {
    jitterX = x;
    jitterY = y;
  }

  function draw(params) {
    const {
      blendAmount,
      light,
      lightScale,
      position,
      matProps,
      previousLight,
      previousLightScale,
      previousPosition,
      reprojectHistory,
    } = params;

    const renderPass = reprojectHistory ?  renderPassBlend : renderPassReproject;

    renderPass.setUniform('blendAmount', blendAmount);
    renderPass.setUniform('lightScale', lightScale.x, lightScale.y);
    renderPass.setUniform('previousLightScale', previousLightScale.x, previousLightScale.y);
    renderPass.setUniform('jitter', jitterX, jitterY);
    renderPass.setUniform('historyCamera', historyCamera.elements);

<<<<<<< HEAD
    renderPass.setTexture('diffuseSpecularTex', light);
    renderPass.setTexture('positionTex', position);
    renderPass.setTexture('matPropsTex', matProps);
    renderPass.setTexture('previousDiffuseSpecularTex', previousLight);
=======
    renderPass.setTexture('lightTex', light);
    renderPass.setTexture('positionTex', position);
    renderPass.setTexture('previousLightTex', previousLight);
>>>>>>> master
    renderPass.setTexture('previousPositionTex', previousPosition);

    renderPass.useProgram();
    fullscreenQuad.draw();
  }

  return {
    draw,
    setJitter,
    setPreviousCamera,
    outputLocs: renderPassReproject.outputLocs
  };
}
