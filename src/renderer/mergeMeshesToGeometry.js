import { BufferGeometry, BufferAttribute } from 'three';

export function mergeMeshesToGeometry(meshes) {

  let vertexCount = 0;
  let indexCount = 0;

  const bakedGeometries = [];
  const materialIndexMap = new Map();
  const materialIndices = [];

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

    const indices = geometry.getIndex().count;

    vertexCount += geometry.getAttribute('position').count;
    indexCount += indices;

    const material = mesh.material;
    let materialIndex = materialIndexMap.get(material);
    if (materialIndex === undefined) {
      materialIndex = materialIndexMap.size;
      materialIndexMap.set(material, materialIndex);
    }

    const tris = indices / 3;
    for (let i = 0; i < tris; i++) {
      materialIndices.push(materialIndex);
    }

    bakedGeometries.push(geometry);
  }

  return {
    geometry: mergeGeometry(bakedGeometries, vertexCount, indexCount),
    materialIndices,
    materials: Array.from(materialIndexMap.keys())
  };
}

function mergeGeometry(geometries, vertexCount, indexCount) {
  const position = new BufferAttribute(new Float32Array(3 * vertexCount), 3, false);
  const normal = new BufferAttribute(new Float32Array(3 * vertexCount), 3, false);
  const uv = new BufferAttribute(new Float32Array(2 * vertexCount), 2, false);
  const index = new BufferAttribute(new Uint32Array(indexCount), 1, false);

  const mergedGeo = new BufferGeometry();

  mergedGeo.addAttribute('position', position);
  mergedGeo.addAttribute('normal', normal);
  mergedGeo.addAttribute('uv', uv);
  mergedGeo.setIndex(index);

  let currentVertex = 0;
  let currentIndex = 0;

  for (const geometry of geometries) {
    const vertexCount = geometry.getAttribute('position').count;
    mergedGeo.merge(geometry, currentVertex);

    const meshIndex = geometry.getIndex();
    for (let i = 0; i < meshIndex.count; i++) {
      index.setX(currentIndex + i, currentVertex + meshIndex.getX(i));
    }

    currentVertex += vertexCount;
    currentIndex += meshIndex.count;
  }

  return mergedGeo;
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
