import { createShader, createProgram, getAttributes, getUniforms } from './glUtil';
import gBufferVert from './glsl/gBuffer.vert';
import gBufferFrag from './glsl/gBuffer.frag';
import { makeRenderTargets } from './RenderTargets';
import { uploadBuffers } from './uploadBuffers';
import { getTexturesFromMaterials } from './texturesFromMaterials';
import { ThinMaterial, ThickMaterial, ShadowCatcherMaterial } from '../constants';
import { makeTexture } from './Texture';

export const gBufferRenderTargets = makeRenderTargets({
      storage: 'float',
      names: ['albedo', 'normal', 'position', 'uvAndMeshId']
});

export function makeGBufferShader(params) {
  const {
    geometry,
    materials,
    textureAllocator,
    gl
  } = params;

  const maps = getTexturesFromMaterials(materials, ['map', 'normalMap']);

  const vertShader = createShader(gl, gl.VERTEX_SHADER, gBufferVert());
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, gBufferFrag({
    gBufferRenderTargets,
    defines: {
      NUM_MATERIALS: materials.length,
      NUM_DIFFUSE_MAPS: maps.map.textures.length,
      NUM_NORMAL_MAPS: maps.normalMap.textures.length,
    }
  }));
  const program = createProgram(gl, vertShader, fragShader);

  gl.useProgram(program);

  const attributes = getAttributes(gl, program);
  const uniforms = getUniforms(gl, program);

  const bufferData = {};

  bufferData.color = materials.map(m => m.color);
  bufferData.roughness = materials.map(m => m.roughness);
  bufferData.metalness = materials.map(m => m.metalness);
  bufferData.normalScale = materials.map(m => m.normalScale);

  bufferData.type = materials.map(m => {
    if (m.shadowCatcher) {
      return ShadowCatcherMaterial;
    }
    if (m.transparent) {
      return m.solid ? ThickMaterial : ThinMaterial;
    }
  });

  if (maps.map.textures.length > 0) {
    const { relativeSizes, texture } = makeTextureArray(gl, maps.map.textures, true);
    textureAllocator.bind(uniforms.diffuseMap, texture);
    bufferData.diffuseMapSize = relativeSizes;
    bufferData.diffuseMapIndex = maps.map.indices;
  }

  if (maps.normalMap.textures.length > 0) {
    const { relativeSizes, texture } = makeTextureArray(gl, maps.normalMap.textures, false);
    textureAllocator.bind(uniforms.normalMap, texture);
    bufferData.normalMapSize = relativeSizes;
    bufferData.normalMapIndex = maps.normalMap.indices;
  }

  uploadBuffers(gl, program, bufferData, 'GBufferMaterials');

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


  function setSize(width, height) {
    gl.useProgram(program);
    gl.uniform2f(uniforms.resolution, width, height);
  }

  function updateSeed(t) {
    gl.useProgram(program);
    gl.uniform1f(uniforms.seed, t);
  }

  return {
    draw(camera) {
      gl.bindVertexArray(vao);

      gl.useProgram(program);
      gl.uniformMatrix4fv(uniforms.projection, false, camera.projectionMatrix.elements);
      gl.uniformMatrix4fv(uniforms.view, false, camera.matrixWorldInverse.elements);
      gl.drawElements(gl.TRIANGLES, elementCount, gl.UNSIGNED_INT, 0);

      gl.bindVertexArray(null);
    },
    setSize,
    updateSeed,
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

function maxImageSize(images) {
  const maxSize = {
    width: 0,
    height: 0
  };

  for (const image of images) {
    maxSize.width = Math.max(maxSize.width, image.width);
    maxSize.height = Math.max(maxSize.height, image.height);
  }

  const relativeSizes = [];
  for (const image of images) {
    relativeSizes.push(image.width / maxSize.width);
    relativeSizes.push(image.height / maxSize.height);
  }

  return { maxSize, relativeSizes };
}

function makeTextureArray(gl, textures, gammaCorrection = false) {
  const images = textures.map(t => t.image);
  const flipY = textures.map(t => t.flipY);
  const { maxSize, relativeSizes } = maxImageSize(images);

  // create GL Array Texture from individual textures
  const texture = makeTexture(gl, {
    width: maxSize.width,
    height: maxSize.height,
    gammaCorrection,
    data: images,
    flipY,
    channels: 3
  });

  return {
   texture,
   relativeSizes
  };
}