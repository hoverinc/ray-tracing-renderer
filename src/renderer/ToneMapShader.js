import fragString from './glsl/toneMap.frag';
import { createShader, createProgram, getUniforms } from './glUtil';
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
    optionalExtensions,
    renderTargets,
    textureAllocator,
    toneMappingParams
  } = params;

  const { OES_texture_float_linear } = optionalExtensions;
  const { toneMapping, whitePoint, exposure } = toneMappingParams;

  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragString({
    renderTargets,
    defines: {
      OES_texture_float_linear,
      toneMapping: toneMapFunctions[toneMapping] || 'linear',
      whitePoint: whitePoint.toExponential(), // toExponential allows integers to be represented as GLSL floats
      exposure: exposure.toExponential()
    }
  }));
  const program = createProgram(gl, fullscreenQuad.vertexShader, fragmentShader);

  const uniforms = getUniforms(gl, program);
  const image = textureAllocator.reserveSlot();

  function draw({ texture }) {
    gl.useProgram(program);

    image.bind(uniforms.image, texture);

    fullscreenQuad.draw();
  }

  return {
    draw
  };
}
