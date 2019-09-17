import { decomposeScene } from './decomposeScene';
import { createShader, createProgram, getAttributes, getUniforms } from './glUtil';
import gBufferVert from './glsl/gBuffer.vert';
import gBufferFrag from './glsl/gBuffer.frag';
import { mergeMeshesToGeometry } from './mergeMeshesToGeometry';

// Important TODO: Refactor this file to get rid of duplicate and confusing code

export function makeRenderingPipeline(params) {

  const {
    gl, scene
  } = params;

  const { meshes } = decomposeScene(scene);
  const { geometry } = mergeMeshesToGeometry(meshes);
  const elementCount = geometry.getIndex().count;

  const vertShader = createShader(gl, gl.VERTEX_SHADER, gBufferVert());
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, gBufferFrag());
  const program = createProgram(gl, vertShader, fragShader);

  gl.useProgram(program);

  const attributes = getAttributes(gl, program);
  const uniforms = getUniforms(gl, program);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  gl.enableVertexAttribArray(attributes.a_position);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, geometry.getAttribute('position').array, gl.STATIC_DRAW);
  gl.vertexAttribPointer(attributes.a_position, 3, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(attributes.a_normal);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, geometry.getAttribute('normal').array, gl.STATIC_DRAW);
  gl.vertexAttribPointer(attributes.a_normal, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.getIndex().array, gl.STATIC_DRAW);

  gl.enable(gl.DEPTH_TEST);

  function drawFull(camera) {
    gl.uniformMatrix4fv(uniforms.projection, false, camera.projectionMatrix.elements);
    gl.uniformMatrix4fv(uniforms.cameraInverse, false, camera.matrixWorldInverse.elements);
    gl.drawElements(gl.TRIANGLES, elementCount, gl.UNSIGNED_INT, 0);
  }

  function setSize(width, height) {
    gl.viewport(0, 0, width, height);
  }

  return {
    drawFull,
    setSize,
    setRenderTime() {},
    restartTimer() {},
  };
}
