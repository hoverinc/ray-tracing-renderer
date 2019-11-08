import { BufferGeometry, BufferAttribute } from 'three';

export function mergeMeshesToGeometry(meshes) {

  let vertexCount = 0;
  let indexCount = 0;

  const geometryAndMaterialIndex = [];
  const materialIndexMap = new Map();

  for (const mesh of meshes) {
    const geometry = cloneBufferGeometry(mesh.geometry, ['position', 'normal', 'uv']);

    const index = geometry.getIndex();
    if (!index) {
      addFlatGeometryIndices(geometry);
    }

    geometry.applyMatrix(mesh.matrixWorld);

    if (!geometry.getAttribute('normal')) {
      geometry.computeVertexNormals();
    } else {
      geometry.normalizeNormals();
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
  const meshId = new BufferAttribute(new Int32Array(vertexCount), 1, false);
  const index = new BufferAttribute(new Uint32Array(indexCount), 1, false);

  const materialIndices = [];

  const bg = new BufferGeometry();
  bg.addAttribute('position', position);
  bg.addAttribute('normal', normal);
  bg.addAttribute('uv', uv);
  bg.addAttribute('meshId', meshId);
  bg.setIndex(index);

  let currentVertex = 0;
  let currentIndex = 0;
  let currentMeshId = 0;

  for (const { geometry, materialIndex } of geometryAndMaterialIndex) {
    const vertexCount = geometry.getAttribute('position').count;
    bg.merge(geometry, currentVertex);

    for (let i = 0; i < vertexCount; i++) {
      meshId.setX(currentVertex + i, materialIndex);
    }

    const meshIndex = geometry.getIndex();
    for (let i = 0; i < meshIndex.count; i++) {
      index.setX(currentIndex + i, currentVertex + meshIndex.getX(i));
    }

    const triangleCount = meshIndex.count / 3;
    for (let i = 0; i < triangleCount; i++) {
      materialIndices.push(materialIndex);
    }

    currentVertex += vertexCount;
    currentIndex += meshIndex.count;
    currentMeshId++;
  }

  return { geometry: bg, materialIndices };
}

// Similar to buffergeometry.clone(), except we only copy
// specific attributes instead of everything
function cloneBufferGeometry(bufferGeometry, attributes) {
  const newGeometry = new BufferGeometry();

  for (const name of attributes) {
    const attrib = bufferGeometry.getAttribute(name);
    if (attrib) {
      newGeometry.addAttribute(name, attrib.clone());
    }
  }

  const index = bufferGeometry.getIndex();
  if (index) {
    newGeometry.setIndex(index);
  }

  return newGeometry;
}

function addFlatGeometryIndices(geometry) {
  const position = geometry.getAttribute('position');

  if (!position) {
    console.warn('No position attribute');
    return;
  }

  const index = new Uint32Array(position.count);

  for (let i = 0; i < index.length; i++) {
    index[i] = i;
  }

  geometry.setIndex(new BufferAttribute(index, 1, false));

  return geometry;
}
