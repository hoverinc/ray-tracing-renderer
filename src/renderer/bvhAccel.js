// Create a bounding volume hierarchy of scene geometry
// Uses the surface area heuristic (SAH) algorithm for efficient partitioning
// http://www.pbr-book.org/3ed-2018/Primitives_and_Intersection_Acceleration/Bounding_Volume_Hierarchies.html

import { Box3, Vector3 }  from 'three';
import { partition, nthElement } from './bvhUtil';

const size = new Vector3();

export function bvhAccel(geometry) {
  const primitiveInfo = makePrimitiveInfo(geometry);
  const node = recursiveBuild(primitiveInfo, 0, primitiveInfo.length);

  return node;
}

export function flattenBvh(bvh) {
  const flat = [];
  const isBounds = [];

  const splitAxisMap = {
    x: 0,
    y: 1,
    z: 2
  };

  let maxDepth = 1;
  const traverse = (node, depth = 1) => {

    maxDepth = Math.max(depth, maxDepth);

    if (node.primitives) {
      for (let i = 0; i < node.primitives.length; i++) {
        const p = node.primitives[i];
        flat.push(
          p.indices[0], p.indices[1], p.indices[2], node.primitives.length,
          p.faceNormal.x, p.faceNormal.y, p.faceNormal.z, p.materialIndex
        );
        isBounds.push(false);
      }
    } else {
      const bounds = node.bounds;

      flat.push(
        bounds.min.x, bounds.min.y, bounds.min.z, splitAxisMap[node.splitAxis],
        bounds.max.x, bounds.max.y, bounds.max.z, null // pointer to second shild
      );

      const i = flat.length - 1;
      isBounds.push(true);

      traverse(node.child0, depth + 1);
      flat[i] = flat.length / 4; // pointer to second child
      traverse(node.child1, depth + 1);
    }
  };

  traverse(bvh);

  const buffer = new ArrayBuffer(4 * flat.length);
  const floatView = new Float32Array(buffer);
  const intView = new Int32Array(buffer);

  for (let i = 0; i < isBounds.length; i++) {
    let k = 8 * i;

    if (isBounds[i]) {
      floatView[k] = flat[k];
      floatView[k + 1] = flat[k + 1];
      floatView[k + 2] = flat[k + 2];
      intView[k + 3] = flat[k + 3];
    } else {
      intView[k] = flat[k];
      intView[k + 1] = flat[k + 1];
      intView[k + 2] = flat[k + 2];
      intView[k + 3] = -flat[k + 3]; // negative signals to shader that this node is a triangle
    }

    floatView[k + 4] = flat[k + 4];
    floatView[k + 5] = flat[k + 5];
    floatView[k + 6] = flat[k + 6];
    intView[k + 7] = flat[k + 7];
  }

  return {
    maxDepth,
    count: flat.length / 4,
    buffer: floatView
  };
}

function makePrimitiveInfo(geometry) {
  const primitiveInfo = [];
  const indices = geometry.getIndex().array;
  const position = geometry.getAttribute('position');
  const materialMeshIndex = geometry.getAttribute('materialMeshIndex');

  const v0 = new Vector3();
  const v1 = new Vector3();
  const v2 = new Vector3();
  const e0 = new Vector3();
  const e1 = new Vector3();

  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];

    const bounds = new Box3();

    v0.fromBufferAttribute(position, i0);
    v1.fromBufferAttribute(position, i1);
    v2.fromBufferAttribute(position, i2);
    e0.subVectors(v2, v0);
    e1.subVectors(v1, v0);

    bounds.expandByPoint(v0);
    bounds.expandByPoint(v1);
    bounds.expandByPoint(v2);

    const info = {
      bounds: bounds,
      center: bounds.getCenter(new Vector3()),
      indices: [i0, i1, i2],
      faceNormal: new Vector3().crossVectors(e1, e0).normalize(),
      materialIndex: materialMeshIndex.getX(i0)
    };

    primitiveInfo.push(info);
  }

  return primitiveInfo;
}

function recursiveBuild(primitiveInfo, start, end) {
  const bounds = new Box3();
  for (let i = start; i < end; i++) {
    bounds.union(primitiveInfo[i].bounds);
  }

  const nPrimitives = end - start;

  if (nPrimitives === 1) {
    return makeLeafNode(primitiveInfo.slice(start, end), bounds);
  } else {
    const centroidBounds = new Box3();
    for (let i = start; i < end; i++) {
      centroidBounds.expandByPoint(primitiveInfo[i].center);
    }
    const dim = maximumExtent(centroidBounds);


    let mid = Math.floor((start + end) / 2);

    // middle split method
    // const dimMid = (centroidBounds.max[dim] + centroidBounds.min[dim]) / 2;
    // mid = partition(primitiveInfo, p => p.center[dim] < dimMid, start, end);

    // if (mid === start || mid === end) {
    //   mid = Math.floor((start + end) / 2);
    //   nthElement(primitiveInfo, (a, b) => a.center[dim] < b.center[dim], start, end, mid);
    // }

    // surface area heuristic method
    if (nPrimitives <= 4) {
      nthElement(primitiveInfo, (a, b) => a.center[dim] < b.center[dim], start, end, mid);
    } else if (centroidBounds.max[dim] === centroidBounds.min[dim]) {
      // can't split primitives based on centroid bounds. terminate.
      return makeLeafNode(primitiveInfo.slice(start, end), bounds);
    } else {

      const buckets = [];
      for (let i = 0; i < 12; i++) {
        buckets.push({
          bounds: new Box3(),
          count: 0,
        });
      }

      for (let i = start; i < end; i++) {
        let b = Math.floor(buckets.length * boxOffset(centroidBounds, dim, primitiveInfo[i].center));
        if (b === buckets.length) {
          b = buckets.length - 1;
        }
        buckets[b].count++;
        buckets[b].bounds.union(primitiveInfo[i].bounds);
      }

      const cost = [];

      for (let i = 0; i < buckets.length - 1; i++) {
        const b0 = new Box3();
        const b1 = new Box3();
        let count0 = 0;
        let count1 = 0;
        for (let j = 0; j <= i; j++) {
          b0.union(buckets[j].bounds);
          count0 += buckets[j].count;
        }
        for (let j = i + 1; j < buckets.length; j++) {
          b1.union(buckets[j].bounds);
          count1 += buckets[j].count;
        }
        cost.push(0.1 + (count0 * surfaceArea(b0) + count1 * surfaceArea(b1)) / surfaceArea(bounds));
      }

      let minCost = cost[0];
      let minCostSplitBucket = 0;
      for (let i = 1; i < cost.length; i++) {
        if (cost[i] < minCost) {
          minCost = cost[i];
          minCostSplitBucket = i;
        }
      }

      mid = partition(primitiveInfo, p => {
        let b = Math.floor(buckets.length * boxOffset(centroidBounds, dim, p.center));
        if (b === buckets.length) {
          b = buckets.length - 1;
        }
        return b <= minCostSplitBucket;
      }, start, end);
    }

    return makeInteriorNode(
      dim,
      recursiveBuild(primitiveInfo, start, mid),
      recursiveBuild(primitiveInfo, mid, end),
    );
  }
}

function makeLeafNode(primitives, bounds) {
  return {
    primitives,
    bounds
  };
}

function makeInteriorNode(splitAxis, child0, child1) {
  return {
    child0,
    child1,
    bounds: new Box3().union(child0.bounds).union(child1.bounds),
    splitAxis,
  };
}

function maximumExtent(box3) {
  box3.getSize(size);
  if (size.x > size.z) {
    return size.x > size.y ? 'x' : 'y';
  } else {
    return size.z > size.y ? 'z' : 'y';
  }
}

function boxOffset(box3, dim, v) {
  let offset = v[dim] - box3.min[dim];

  if (box3.max[dim] > box3.min[dim]){
    offset /= box3.max[dim] - box3.min[dim];
  }

  return offset;
}

function surfaceArea(box3) {
  box3.getSize(size);
  return 2 * (size.x * size.z + size.x * size.y + size.z * size.y);
}
