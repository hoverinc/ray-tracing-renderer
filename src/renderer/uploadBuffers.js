import { makeUniformBuffer } from './glUtil';

// Upload arrays to uniform buffer objects
// Packs different arrays into vec4's to take advantage of GLSL's std140 memory layout

export function uploadBuffers(gl, program, bufferData) {
  const materialBuffer = makeUniformBuffer(gl, program, 'Materials');

  const {
    color = [],
    roughness = [],
    metalness = [],
    normalScale = [],
    type = [],
    diffuseMapIndex = [],
    diffuseMapSize = [],
    normalMapIndex = [],
    normalMapSize = [],
    roughnessMapIndex = [],
    metalnessMapIndex = [],
    pbrMapSize = [],
  } = bufferData;

  materialBuffer.set('Materials.colorAndMaterialType[0]', interleave(
    { data: [].concat(...color.map(d => d.toArray())), channels: 3 },
    { data: type, channels: 1}
  ));

  materialBuffer.set('Materials.roughnessMetalnessNormalScale[0]', interleave(
    { data: roughness, channels: 1 },
    { data: metalness, channels: 1 },
    { data: [].concat(...normalScale.map(d => d.toArray())), channels: 2 }
  ));

  materialBuffer.set('Materials.diffuseNormalRoughnessMetalnessMapIndex[0]', interleave(
    { data: diffuseMapIndex, channels: 1 },
    { data: normalMapIndex, channels: 1 },
    { data: roughnessMapIndex, channels: 1 },
    { data: metalnessMapIndex, channels: 1 }
  ));

  materialBuffer.set('Materials.diffuseNormalMapSize[0]', interleave(
    { data: diffuseMapSize, channels: 2 },
    { data: normalMapSize, channels: 2 }
  ));

  materialBuffer.set('Materials.pbrMapSize[0]', pbrMapSize);

  materialBuffer.bind(0);
}

function interleave(...arrays) {
  const maxLength = arrays.reduce((m, a) => {
    return Math.max(m, a.data.length / a.channels);
  }, 0);

  const interleaved = [];
  for (let i = 0; i < maxLength; i++) {
    for (let j = 0; j < arrays.length; j++) {
      const { data, channels } = arrays[j];
      for (let c = 0; c < channels; c++) {
        interleaved.push(data[i * channels + c]);
      }
    }
  }

  return interleaved;
}
