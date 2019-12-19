import fragment from './glsl/toneMap.frag';
import { makeShaderPass } from './ShaderPass';
import * as THREE from 'three';

const toneMapFunctions = {
  [THREE.LinearToneMapping]: 'linear',
  [THREE.ReinhardToneMapping]: 'reinhard',
  [THREE.Uncharted2ToneMapping]: 'uncharted2',
  [THREE.CineonToneMapping]: 'cineon',
  [THREE.ACESFilmicToneMapping]: 'acesFilmic'
};

export function makeToneMapShader(params) {
  const {
    fullscreenQuad,
    gl,
    // optionalExtensions,
    textureAllocator,
    toneMappingParams
  } = params;

  // const { OES_texture_float_linear } = optionalExtensions;
  const { toneMapping, whitePoint, exposure } = toneMappingParams;

  const shaderPass = makeShaderPass({
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

  function draw(texture) {
    shaderPass.useProgram();

    shaderPass.setTexture('hdrBuffer', texture);

    textureAllocator.bind(shaderPass);

    fullscreenQuad.draw();
  }

  return {
    draw
  };
}
