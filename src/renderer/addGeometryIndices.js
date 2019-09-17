import { BufferAttribute } from 'three';

export function addFlatGeometryIndices(geometry) {
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

//TODO: Add UV support
export function addSmoothGeometryIndices(geometry) {
  const position = geometry.getAttribute('position');

  if (!position) {
    console.warn('No position attribute');
    return;
  }

  const index = [];
  const newPosition = [];

  const vertMap = {};

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const key = `${x}|${y}|${z}`;

    if (vertMap[key] !== undefined) {
      index.push(vertMap[key]);
    } else {
      newPosition.push(x, y, z);
      const newIndex = newPosition.length / 3 - 1;
      index.push(newIndex);
      vertMap[key] = newIndex;
    }
  }
  const bg = geometry.clone();
  bg.setIndex(new BufferAttribute(new Uint32Array(index), 1, false));

  const newPositionAttribute = new BufferAttribute(new Float32Array(newPosition), 3, false);
  bg.addAttribute('position', newPositionAttribute);

  geometry.computeVertexNormals();

  return bg;
}
