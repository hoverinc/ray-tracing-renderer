import { ThinMaterial, ThickMaterial, ShadowCatcherMaterial } from '../constants';
import materialBufferChunk from './glsl/chunks/materialBuffer.glsl';
import { makeUniformBuffer } from './UniformBuffer';
import { makeRenderPass } from "./RenderPass";
import { makeTexture } from './Texture';
import { getTexturesFromMaterials, mergeTexturesFromMaterials } from './texturesFromMaterials';

export function makeMaterialBuffer(gl, materials) {
  const maps = getTexturesFromMaterials(materials, ['map', 'normalMap']);
  const pbrMap = mergeTexturesFromMaterials(materials, ['roughnessMap', 'metalnessMap']);

  const textures = {};

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
    textures.diffuseMap = texture;
    bufferData.diffuseMapSize = relativeSizes;
    bufferData.diffuseMapIndex = maps.map.indices;
  }

  if (maps.normalMap.textures.length > 0) {
    const { relativeSizes, texture } = makeTextureArray(gl, maps.normalMap.textures, false);
    textures.normalMap = texture;
    bufferData.normalMapSize = relativeSizes;
    bufferData.normalMapIndex = maps.normalMap.indices;
  }

  if (pbrMap.textures.length > 0) {
    const { relativeSizes, texture } = makeTextureArray(gl, pbrMap.textures, false);
    textures.pbrMap = texture;
    bufferData.pbrMapSize = relativeSizes;
    bufferData.roughnessMapIndex = pbrMap.indices.roughnessMap;
    bufferData.metalnessMapIndex = pbrMap.indices.metalnessMap;
  }

  const defines = {
    NUM_MATERIALS: materials.length,
    NUM_DIFFUSE_MAPS: maps.map.textures.length,
    NUM_NORMAL_MAPS: maps.normalMap.textures.length,
    NUM_DIFFUSE_NORMAL_MAPS: Math.max(maps.map.textures.length, maps.normalMap.textures.length),
    NUM_PBR_MAPS: pbrMap.textures.length,
  };

  // create temporary shader program including the Material uniform buffer
  // used to query the compiled structure of the uniform buffer
  const renderPass = makeRenderPass(gl, {
    vertex: {
      source: `void main() {}`
    },
    fragment: {
      includes: [ materialBufferChunk ],
      source: `void main() {}`
    },
    defines
  });

  uploadToUniformBuffer(gl, renderPass.program, bufferData);

  return { defines, textures };
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
    channels: 3,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR,
  });

  return {
   texture,
   relativeSizes
  };
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


// Upload arrays to uniform buffer objects
// Packs different arrays into vec4's to take advantage of GLSL's std140 memory layout

function uploadToUniformBuffer(gl, program, bufferData) {
  const materialBuffer = makeUniformBuffer(gl, program, 'Materials');

  materialBuffer.set('Materials.colorAndMaterialType[0]', interleave(
    { data: [].concat(...bufferData.color.map(d => d.toArray())), channels: 3 },
    { data: bufferData.type, channels: 1}
  ));

  materialBuffer.set('Materials.roughnessMetalnessNormalScale[0]', interleave(
    { data: bufferData.roughness, channels: 1 },
    { data: bufferData.metalness, channels: 1 },
    { data: [].concat(...bufferData.normalScale.map(d => d.toArray())), channels: 2 }
  ));

  materialBuffer.set('Materials.diffuseNormalRoughnessMetalnessMapIndex[0]', interleave(
    { data: bufferData.diffuseMapIndex, channels: 1 },
    { data: bufferData.normalMapIndex, channels: 1 },
    { data: bufferData.roughnessMapIndex, channels: 1 },
    { data: bufferData.metalnessMapIndex, channels: 1 }
  ));

  materialBuffer.set('Materials.diffuseNormalMapSize[0]', interleave(
    { data: bufferData.diffuseMapSize, channels: 2 },
    { data: bufferData.normalMapSize, channels: 2 }
  ));

  materialBuffer.set('Materials.pbrMapSize[0]', bufferData.pbrMapSize);

  materialBuffer.bind(0);
}

function interleave(...arrays) {
  let maxLength = 0;
  for (let i = 0; i < arrays.length; i++) {
    const a = arrays[i];
    const l = a.data ? a.data.length / a.channels : 0;
    maxLength = Math.max(maxLength, l);
  }

  const interleaved = [];
  for (let i = 0; i < maxLength; i++) {
    for (let j = 0; j < arrays.length; j++) {
      const { data = [], channels } = arrays[j];
      for (let c = 0; c < channels; c++) {
        interleaved.push(data[i * channels + c]);
      }
    }
  }

  return interleaved;
}
