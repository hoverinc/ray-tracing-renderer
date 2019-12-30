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

export function makeToneMapShader(gl, params) {
  const {
    fullscreenQuad,
    // optionalExtensions,
    textureAllocator,
    toneMappingParams
  } = params;

  // const { OES_texture_float_linear } = optionalExtensions;
  const { toneMapping, whitePoint, exposure } = toneMappingParams;

  const shaderPass = makeShaderPass(gl, {
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
      textureScaleX = 1,
      textureScaleY = 1
    } = params;

    shaderPass.useProgram();

    gl.uniform2f(shaderPass.uniforms.textureScale, textureScaleX, textureScaleY);

    shaderPass.setTexture('hdrBuffer', hdrTexture);

    textureAllocator.bind(shaderPass);

    fullscreenQuad.draw();
  }

  return {
    draw
  };
}
