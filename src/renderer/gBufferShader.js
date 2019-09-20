import { createShader, createProgram, getAttributes, getUniforms } from './glUtil';
import { makeRenderTargets } from './renderTargets';
import gBufferVert from './glsl/gBuffer.vert';
import gBufferFrag from './glsl/gBuffer.frag';

export function makeGBufferShader(params) {
  const {
    geometry,
    gl
  } = params;

  const renderTargets = makeRenderTargets([
    {
      name: 'position',
      storage: 'float',
    },
    {
      name: 'normal',
      storage: 'float'
    }
  ]);

  const vertShader = createShader(gl, gl.VERTEX_SHADER, gBufferVert());
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, gBufferFrag(renderTargets));
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

  const elementCount = geometry.getIndex().count;

  return {
    draw(camera) {
      gl.bindVertexArray(vao);
      gl.useProgram(program);
      gl.uniformMatrix4fv(uniforms.projection, false, camera.projectionMatrix.elements);
      gl.uniformMatrix4fv(uniforms.view, false, camera.matrixWorldInverse.elements);
      gl.drawElements(gl.TRIANGLES, elementCount, gl.UNSIGNED_INT, 0);
    },
    renderTargets
  };
}
