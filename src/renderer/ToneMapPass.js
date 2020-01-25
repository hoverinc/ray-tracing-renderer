import fragment from './glsl/toneMap.frag';
import { makeRenderPass } from './RenderPass';
import * as THREE from 'three';

const toneMapFunctions = {
  [THREE.LinearToneMapping]: 'linear',
  [THREE.ReinhardToneMapping]: 'reinhard',
  [THREE.Uncharted2ToneMapping]: 'uncharted2',
  [THREE.CineonToneMapping]: 'cineon',
  [THREE.ACESFilmicToneMapping]: 'acesFilmic'
};

export function makeToneMapPass(gl, params) {
  const {
    fullscreenQuad,
    toneMappingParams
  } = params;

  const { toneMapping, whitePoint, exposure } = toneMappingParams;

  const renderPass = makeRenderPass(gl, {
    gl,
    defines: {
      TONE_MAPPING: toneMapFunctions[toneMapping] || 'linear',
      WHITE_POINT: whitePoint.toExponential(), // toExponential allows integers to be represented as GLSL floats
      EXPOSURE: exposure.toExponential()
    },
    vertex: fullscreenQuad.vertexShader,
    fragment,
  });

  function draw(params) {
    const {
      light,
      lightScale,
      position
    } = params;

    renderPass.setUniform('lightScale', lightScale.x, lightScale.y);

    renderPass.setTexture('light', light);
    renderPass.setTexture('position', position);

    renderPass.useProgram();
    fullscreenQuad.draw();
  }

  return {
    draw
  };
}
