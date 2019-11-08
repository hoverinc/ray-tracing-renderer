import fragString from './glsl/blur.frag';
import { createShader, createProgram, getUniforms } from './glUtil';
import * as THREE from 'three';

export function makeBlurShader(params) {
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
  const image = textureAllocator.reserveSlot();

  function draw({ texture }) {
    gl.useProgram(program);

    image.bind(uniforms.image, texture);

    fullscreenQuad.draw();
  }

  function setSize({ width, height }) {
    gl.useProgram(program);
    gl.uniform2f(uniforms.pixelSize, 1.0 / width, 1.0 / height);
  }
  return {
    draw,
    setSize,
  };
}
