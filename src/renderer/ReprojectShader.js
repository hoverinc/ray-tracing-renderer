import fragString from './glsl/reproject.frag';
import { createShader, createProgram, getUniforms } from './glUtil';
import { rayTracingRenderTargets } from './RayTracingShader';
import { clamp } from './util';
import * as THREE from 'three';

export function makeReprojectShader(params) {
  const {
    fullscreenQuad,
    gl,
    textureAllocator,
  } = params;

  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragString({
    rayTracingRenderTargets,
    defines: {

    }
  }));

  const program = createProgram(gl, fullscreenQuad.vertexShader, fragmentShader);
  const uniforms = getUniforms(gl, program);

  const hdrBufferLocation = textureAllocator.reserveSlot();
  const historyBufferLocation = textureAllocator.reserveSlot();

  function setPreviousCamera(camera) {
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.historyCameraInv, false, camera.matrixWorldInverse.elements);
    gl.uniformMatrix4fv(uniforms.historyCameraProj, false, camera.projectionMatrix.elements);
  }

  function setAmount(amount) {
    gl.useProgram(program);
    gl.uniform1f(uniforms.amount, clamp(amount, 0, 1));
  }

  function draw(hdrBuffer, historyBuffer) {
    gl.useProgram(program);

    hdrBufferLocation.bind(uniforms.hdrBuffer, hdrBuffer);
    historyBufferLocation.bind(uniforms.historyBuffer, historyBuffer);

    fullscreenQuad.draw();
  }

  return {
    draw,
    setAmount,
    setPreviousCamera,
  };
}
