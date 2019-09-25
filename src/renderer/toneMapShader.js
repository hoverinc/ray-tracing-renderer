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

export function makeToneMapShader({
    gl,
    optionalExtensions,
    fullscreenQuad,
    textureAllocator,
    toneMappingParams
  }) {

  const { OES_texture_float_linear } = optionalExtensions;
  const { toneMapping, whitePoint, exposure } = toneMappingParams;

  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragString({
    OES_texture_float_linear,
    toneMapping: toneMapFunctions[toneMapping] || 'linear',
    whitePoint: whitePoint.toExponential(), // toExponential allows integers to be represented as GLSL floats
    exposure: exposure.toExponential()
  }));
  const program = createProgram(gl, fullscreenQuad.vertexShader, fragmentShader);

  const uniforms = getUniforms(gl, program);
  const bindFramebuffer = textureAllocator.reserveSlot();

  function draw({ texture }) {
    gl.useProgram(program);

    bindFramebuffer(uniforms.image, texture);

    fullscreenQuad.draw();
  }

  return {
    draw
  };
}
