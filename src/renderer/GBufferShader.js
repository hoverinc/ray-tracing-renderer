import { createShader, createProgram, getAttributes, getUniforms } from './glUtil';
import gBufferVert from './glsl/gBuffer.vert';
import gBufferFrag from './glsl/gBuffer.frag';
import { makeRenderTargets } from './RenderTargets';

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
    },
    {
      name: 'uvAndMeshId',
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

  setAttribute(gl, attributes.a_position, geometry.getAttribute('position'));
  setAttribute(gl, attributes.a_normal, geometry.getAttribute('normal'));
  setAttribute(gl, attributes.a_uv, geometry.getAttribute('uv'));
  setAttribute(gl, attributes.a_meshId, geometry.getAttribute('meshId'));

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.getIndex().array, gl.STATIC_DRAW);

  const elementCount = geometry.getIndex().count;

  gl.bindVertexArray(null);

  return {
    draw(camera) {
      gl.bindVertexArray(vao);

      gl.useProgram(program);
      gl.uniformMatrix4fv(uniforms.projection, false, camera.projectionMatrix.elements);
      gl.uniformMatrix4fv(uniforms.view, false, camera.matrixWorldInverse.elements);
      gl.drawElements(gl.TRIANGLES, elementCount, gl.UNSIGNED_INT, 0);

      gl.bindVertexArray(null);
    },
    renderTargets
  };
}

function setAttribute(gl, location, bufferAttribute) {
  const { itemSize, array } = bufferAttribute;

  gl.enableVertexAttribArray(location);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);

  if (array instanceof Float32Array) {
    gl.vertexAttribPointer(location, itemSize, gl.FLOAT, false, 0, 0);
    // gl.vertexAttrib4f(location, 0, 0, 0, 0);
  } else if (array instanceof Int32Array) {
    gl.vertexAttribIPointer(location, itemSize, gl.INT, 0, 0);
    // gl.vertexAttribI4ui(location, 0, 0, 0, 0);
    // gl.vertexAttrib4f(location, 0, 0, 0, 0);

  } else {
    throw 'Unsupported buffer type';
  }
}
