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

  const renderPassConfig = {
    gl,
    defines: {
      TONE_MAPPING: toneMapFunctions[toneMappingParams.toneMapping] || 'linear',
      WHITE_POINT: toneMappingParams.whitePoint.toExponential(), // toExponential allows integers to be represented as GLSL floats
      EXPOSURE: toneMappingParams.exposure.toExponential()
    },
    vertex: fullscreenQuad.vertexShader,
    fragment,
  };

  renderPassConfig.defines.EDGE_PRESERVING_UPSCALE = true;
  const renderPassUpscale = makeRenderPass(gl, renderPassConfig);

  renderPassConfig.defines.EDGE_PRESERVING_UPSCALE = false;
  const renderPassNative = makeRenderPass(gl, renderPassConfig);

  function draw(params) {
    const {
      light,
      lightScale,
      position
    } = params;

    const renderPass =
      lightScale.x !== 1 && lightScale.y !== 1 ?
      renderPassUpscale :
      renderPassNative;

    renderPass.setUniform('lightScale', lightScale.x, lightScale.y);
    renderPass.setTexture('lightTex', light);
    renderPass.setTexture('positionTex', position);

    renderPass.useProgram();
    fullscreenQuad.draw();
  }

  return {
    draw
  };
}
