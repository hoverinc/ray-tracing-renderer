import { BufferGeometry, BufferAttribute } from 'three';
import { addFlatGeometryIndices } from './addGeometryIndices';

export function mergeMeshesToGeometry(meshes) {

  let vertexCount = 0;
  let indexCount = 0;

  const geometryAndMaterialIndex = [];
  const materialIndexMap = new Map();

  for (const mesh of meshes) {
    const geometry = mesh.geometry.clone();

    const index = geometry.getIndex();
    if (!index) {
      addFlatGeometryIndices(geometry);
    }

    geometry.applyMatrix(mesh.matrixWorld);

    if (!geometry.getAttribute('normal')) {
      geometry.computeVertexNormals();
    }

    vertexCount += geometry.getAttribute('position').count;
    indexCount += geometry.getIndex().count;

    const material = mesh.material;
    let materialIndex = materialIndexMap.get(material);
    if (materialIndex === undefined) {
      materialIndex = materialIndexMap.size;
      materialIndexMap.set(material, materialIndex);
    }

    geometryAndMaterialIndex.push({
      geometry,
      materialIndex
    });
  }

  const { geometry, materialIndices } = mergeGeometry(geometryAndMaterialIndex, vertexCount, indexCount);

  return {
    geometry,
    materialIndices,
    materials: Array.from(materialIndexMap.keys())
  };
}


function mergeGeometry(geometryAndMaterialIndex, vertexCount, indexCount) {
  const position = new BufferAttribute(new Float32Array(3 * vertexCount), 3, false);
  const normal = new BufferAttribute(new Float32Array(3 * vertexCount), 3, false);
  const uv = new BufferAttribute(new Float32Array(2 * vertexCount), 2, false);
  const index = new BufferAttribute(new Uint32Array(indexCount), 1, false);

  const materialIndices = [];

  const bg = new BufferGeometry();
  bg.addAttribute('position', position);
  bg.addAttribute('normal', normal);
  bg.addAttribute('uv', uv);
  bg.setIndex(index);

  let vertexIndex = 0;
  let indexIndex = 0;

  for (const { geometry, materialIndex } of geometryAndMaterialIndex) {
    bg.merge(geometry, vertexIndex);

    const meshIndex = geometry.getIndex();
    for (let k = 0; k < meshIndex.count; k++) {
      index.setX(indexIndex + k, vertexIndex + meshIndex.getX(k));
    }

    const triangleCount = meshIndex.count / 3;
    for (let k = 0; k < triangleCount; k++) {
      materialIndices.push(materialIndex);
    }

    vertexIndex += geometry.getAttribute('position').count;
    indexIndex += meshIndex.count;
  }

  return { geometry: bg, materialIndices };
}
