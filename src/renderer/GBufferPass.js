import { makeRenderPass } from './RenderPass';
import vertex from './glsl/gBuffer.vert';
import fragment from './glsl/gBuffer.frag';
import { Matrix4 } from 'three';

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
  uploadAttributes(gl, renderPass, geometry);
  gl.bindVertexArray(null);

  let jitterX = 0;
  let jitterY = 0;
  function setJitter(x, y) {
    jitterX = x;
    jitterY = y;
  }

  let currentCamera;
  function setCamera(camera) {
    currentCamera = camera;
  }

  function calcCamera() {
    projView.copy(currentCamera.projectionMatrix);

    projView.elements[8] += 2 * jitterX;
    projView.elements[9] += 2 * jitterY;

    projView.multiply(currentCamera.matrixWorldInverse);
    renderPass.setUniform('projView', projView.elements);
  }

  let projView = new Matrix4();

  function draw() {
    calcCamera();
    gl.bindVertexArray(vao);
    renderPass.useProgram();
    gl.enable(gl.DEPTH_TEST);
    gl.drawElements(gl.TRIANGLES, elementCount, gl.UNSIGNED_INT, 0);
    gl.disable(gl.DEPTH_TEST);
  }

  return {
    draw,
    outputLocs: renderPass.outputLocs,
    setCamera,
    setJitter
  };
}

function uploadAttributes(gl, renderPass, geometry) {
  setAttribute(gl, renderPass.attribLocs.aPosition, geometry.getAttribute('position'));
  setAttribute(gl, renderPass.attribLocs.aNormal, geometry.getAttribute('normal'));
  setAttribute(gl, renderPass.attribLocs.aUv, geometry.getAttribute('uv'));
  setAttribute(gl, renderPass.attribLocs.aMaterialMeshIndex, geometry.getAttribute('materialMeshIndex'));

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.getIndex().array, gl.STATIC_DRAW);
}

function setAttribute(gl, location, bufferAttribute) {
  if (location === undefined) {
    return;
  }

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
