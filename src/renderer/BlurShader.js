import fragString from './glsl/blur.frag';
import { createShader, createProgram, getUniforms } from './glUtil';
import { rayTracingRenderTargets } from './RayTracingShader';
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
    rayTracingRenderTargets,
    defines: {
      OES_texture_float_linear,
    }
  }));
  const program = createProgram(gl, fullscreenQuad.vertexShader, fragmentShader);

  const uniforms = getUniforms(gl, program);
  const hdrBufferLocation = textureAllocator.reserveSlot();

  function draw(hdrBuffer) {
    gl.useProgram(program);

    hdrBufferLocation.bind(uniforms.hdrBuffer, hdrBuffer);

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
