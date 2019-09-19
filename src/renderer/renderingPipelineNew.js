import { decomposeScene } from './decomposeScene';
import { makeFramebuffer } from './frameBuffer';
import { makeFullscreenQuad } from './fullscreenQuad';
import { createShader, createProgram, getAttributes, getUniforms } from './glUtil';
import { mergeMeshesToGeometry } from './mergeMeshesToGeometry';
import { makeRenderTargets } from './renderTargets';
import { makeTextureAllocator } from './textureAllocator';
import { makeToneMapShader } from './toneMapShader';
import gBufferVert from './glsl/gBuffer.vert';
import gBufferFrag from './glsl/gBuffer.frag';

// Important TODO: Refactor this file to get rid of duplicate and confusing code

export function makeRenderingPipeline(params) {

  const {
    gl, optionalExtensions, scene, toneMappingParams
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

  const textureAllocator = makeTextureAllocator(gl);
  const fullscreenQuad = makeFullscreenQuad(gl);

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

  const rt = makeFramebuffer({
    depth: true,
    gl,
    renderTargets
  });

  const toneMapShader = makeToneMapShader({gl, fullscreenQuad, optionalExtensions, textureAllocator, toneMappingParams });

  function drawFull(camera) {
    gl.bindVertexArray(vao);
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.projection, false, camera.projectionMatrix.elements);
    gl.uniformMatrix4fv(uniforms.view, false, camera.matrixWorldInverse.elements);

    rt.bind();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, elementCount, gl.UNSIGNED_INT, 0);
    rt.unbind();

    toneMapShader.draw({texture: rt.texture});
  }

  function setSize(width, height) {
    gl.viewport(0, 0, width, height);
    rt.setSize(width, height);
  }

  return {
    drawFull,
    setSize,
    setRenderTime() {},
    restartTimer() {},
  };
}
