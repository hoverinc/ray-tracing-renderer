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
  }));

  const program = createProgram(gl, fullscreenQuad.vertexShader, fragmentShader);
  const uniforms = getUniforms(gl, program);

  const hdrBufferLocation = textureAllocator.reserveSlot();
  const historyBufferLocation = textureAllocator.reserveSlot();

  const historyCamera = new THREE.Matrix4();

  function setPreviousCamera(camera) {
    gl.useProgram(program);

    historyCamera.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

    gl.uniformMatrix4fv(uniforms.historyCamera, false, historyCamera.elements);
  }

  function setBlendAmount(x) {
    gl.useProgram(program);
    gl.uniform1f(uniforms.blendAmount, clamp(x, 0, 1));
  }

  function setJitter(x, y) {
    gl.useProgram(program);
    gl.uniform2f(uniforms.jitter, x, y);
  }

  function draw(hdrBuffer, historyBuffer) {
    gl.useProgram(program);

    hdrBufferLocation.bind(uniforms.hdrBuffer, hdrBuffer);
    historyBufferLocation.bind(uniforms.historyBuffer, historyBuffer);

    fullscreenQuad.draw();
  }

  return {
    draw,
    setBlendAmount,
    setJitter,
    setPreviousCamera,
  };
}
