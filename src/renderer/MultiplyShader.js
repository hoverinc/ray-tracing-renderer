import fragString from './glsl/multiply.frag';
import { createShader, createProgram, getUniforms } from './glUtil';
import * as THREE from 'three';

export function makeMultiplyShader(params) {
  const {
    fullscreenQuad,
    gl,
    optionalExtensions,
    textureAllocator,
  } = params;

  const { OES_texture_float_linear } = optionalExtensions;

  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragString({
    OES_texture_float_linear,
  }));
  const program = createProgram(gl, fullscreenQuad.vertexShader, fragmentShader);

  const uniforms = getUniforms(gl, program);
  const imageA = textureAllocator.reserveSlot();
  const imageB = textureAllocator.reserveSlot();

  function draw({ textureA, textureB }) {
    gl.useProgram(program);

    imageA.bind(uniforms.imageA, textureA);
    imageB.bind(uniforms.imageB, textureB);

    fullscreenQuad.draw();
  }

  return {
    draw
  };
}
