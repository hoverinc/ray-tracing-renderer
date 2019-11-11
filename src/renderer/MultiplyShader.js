import fragString from './glsl/multiply.frag';
import { createShader, createProgram, getUniforms } from './glUtil';
import { rayTracingRenderTargets } from './RayTracingShader';
import { gBufferRenderTargets } from './GBufferShader';
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
    gBufferRenderTargets,
    rayTracingRenderTargets,
    defines: {
      OES_texture_float_linear,
    }
  }));
  const program = createProgram(gl, fullscreenQuad.vertexShader, fragmentShader);
  const uniforms = getUniforms(gl, program);

  const gBufferLocation = textureAllocator.reserveSlot();
  const hdrBufferLocation = textureAllocator.reserveSlot();

  function draw(gBuffer, hdrBuffer) {
    gl.useProgram(program);

    gBufferLocation.bind(uniforms.gBuffer, gBuffer);
    hdrBufferLocation.bind(uniforms.hdrBuffer, hdrBuffer);

    fullscreenQuad.draw();
  }

  return {
    draw
  };
}
