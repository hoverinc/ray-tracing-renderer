import { makeRenderPass } from './RenderPass';
import vertex from './glsl/gBuffer.vert';
import fragment from './glsl/gBuffer.frag';

export function makeGBufferPass(gl, { materialBuffer, mergedMesh }) {
  const renderPass = makeRenderPass(gl, {
    defines: materialBuffer.defines,
    vertex,
    fragment
  });

  renderPass.setTexture('diffuseMap', materialBuffer.textures.diffuseMap);
  renderPass.setTexture('normalMap', materialBuffer.textures.normalMap);
  renderPass.setTexture('pbrMap', materialBuffer.textures.pbrMap);

  const geometry = mergedMesh.geometry;

  const elementCount = geometry.getIndex().count;

  const vao = gl.createVertexArray();

  gl.bindVertexArray(vao);

  setAttribute(gl, renderPass.attribLocs.aPosition, geometry.getAttribute('position'));
  setAttribute(gl, renderPass.attribLocs.aNormal, geometry.getAttribute('normal'));
  setAttribute(gl, renderPass.attribLocs.aUv, geometry.getAttribute('uv'));
  setAttribute(gl, renderPass.attribLocs.aMaterialIndex, geometry.getAttribute('materialIndex'));

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.getIndex().array, gl.STATIC_DRAW);

  gl.bindVertexArray(null);

  function setCamera(camera) {
    renderPass.setUniform('view', camera.matrixWorldInverse.elements);
    renderPass.setUniform('proj', camera.projectionMatrix.elements);
  }

  function draw() {
    gl.bindVertexArray(vao);
    renderPass.useProgram();
    gl.enable(gl.DEPTH_TEST);
    gl.drawElements(gl.TRIANGLES, elementCount, gl.UNSIGNED_INT, 0);
    gl.disable(gl.DEPTH_TEST);
  }

  return {
    draw,
    outputLocs: renderPass.outputLocs,
    setCamera
  };
}

function setAttribute(gl, location, bufferAttribute) {
  const { itemSize, array } = bufferAttribute;

  gl.enableVertexAttribArray(location);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);

  if (array instanceof Float32Array) {
    gl.vertexAttribPointer(location, itemSize, gl.FLOAT, false, 0, 0);
  } else if (array instanceof Int32Array) {
    gl.vertexAttribIPointer(location, itemSize, gl.INT, 0, 0);
  } else {
    throw 'Unsupported buffer type';
  }
}
