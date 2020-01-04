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

export function makeToneMapShader(gl, params) {
  const {
    fullscreenQuad,
    // optionalExtensions,
    toneMappingParams
  } = params;

  // const { OES_texture_float_linear } = optionalExtensions;
  const { toneMapping, whitePoint, exposure } = toneMappingParams;

  const renderPass = makeRenderPass(gl, {
    gl,
    defines: {
      // OES_texture_float_linear,
      TONE_MAPPING: toneMapFunctions[toneMapping] || 'linear',
      WHITE_POINT: whitePoint.toExponential(), // toExponential allows integers to be represented as GLSL floats
      EXPOSURE: exposure.toExponential()
    },
    vertex: fullscreenQuad.vertexShader,
    fragment,
  });

  function draw(params) {
    const {
      hdrTexture,
      textureScale
    } = params;

    renderPass.setUniform('textureScale', textureScale.x, textureScale.y);

    renderPass.setTexture('hdrBuffer', hdrTexture);

    renderPass.useProgram();
    fullscreenQuad.draw();
  }

  return {
    draw
  };
}
