import fragString from './glsl/rayTrace.frag';
import { createShader, createProgram, getUniforms } from './glUtil';
import { mergeMeshesToGeometry } from './mergeMeshesToGeometry';
import { bvhAccel, flattenBvh } from './bvhAccel';
import { envmapDistribution } from './envmapDistribution';
import { generateEnvMapFromSceneComponents } from './envMapCreation';
import { getTexturesFromMaterials, mergeTexturesFromMaterials } from './texturesFromMaterials';
import { makeTexture } from './texture';
import { uploadBuffers } from './uploadBuffers';
import { ThinMaterial, ThickMaterial, ShadowCatcherMaterial } from '../constants';
import * as THREE from 'three';
import { clamp } from './util';
import { makeHaltonSequenceCombined } from './haltonSequenceCombined';
import { makeHaltonSequence } from './haltonSequence';

function textureDimensionsFromArray(count) {
  const columnsLog = Math.round(Math.log2(Math.sqrt(count)));
  const columns = 2 ** columnsLog;
  const rows = Math.ceil(count / columns);
  return {
    columnsLog,
    columns,
    rows,
    size: rows * columns,
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

// expand array to the given length
function padArray(typedArray, length) {
  const newArray = new typedArray.constructor(length);
  newArray.set(typedArray);
  return newArray;
}

function isHDRTexture(texture) {
  return texture.map
    && texture.map.image
    && (texture.map.encoding === THREE.RGBEEncoding || texture.map.encoding === THREE.LinearEncoding);
}

function decomposeScene(scene) {
  const meshes = [];
  const directionalLights = [];
  const environmentLights = [];
  scene.traverse(child => {
    if (child instanceof THREE.Mesh) {
      if (!child.geometry || !child.geometry.getAttribute('position')) {
        console.log(child, 'must have a geometry property with a position attribute');
      }
      else if (!(child.material instanceof THREE.MeshStandardMaterial)) {
        console.log(child, 'must use MeshStandardMaterial in order to be rendered.');
      } else {
        meshes.push(child);
      }
    }
    if (child instanceof THREE.DirectionalLight) {
      directionalLights.push(child);
    }
    if (child instanceof THREE.EnvironmentLight) {
      if (environmentLights.length > 1) {
        console.warn('Only one environment light can be used per scene');
      }
      else if (isHDRTexture(child)) {
        environmentLights.push(child);
      } else {
        console.warn('Environment light has invalid map');
      }
    }
  });

  return {
    meshes, directionalLights, environmentLights
  };
}

export function makeRayTracingShader({
    gl,
    optionalExtensions,
    fullscreenQuad,
    textureAllocator,
    scene,
    bounces // number of global illumination bounces
  }) {

  bounces = clamp(bounces, 1, 6);

  const { OES_texture_float_linear } = optionalExtensions;

  // Refactor this monster
  let samplingDimensions = 0;
  samplingDimensions += 4; // anti aliasing, depth of field
  for (let i = 0; i < bounces; i++) {
    // specular or diffuse reflection, light importance sampling, material sampling, next path direction
    samplingDimensions += 8; //
    if (i >= 1) {
      // russian roulette sampling
      // this step is skipped on the first bounce
      samplingDimensions += 1;
    }
  }

  const random = makeHaltonSequenceCombined(samplingDimensions);

  function initScene() {
    const { meshes, directionalLights, environmentLights } = decomposeScene(scene);
    if (meshes.length === 0) {
      throw 'RayTracingRenderer: Scene contains no renderable meshes.';
    }

    // merge meshes in scene to a single, static geometry
    const { geometry, materials, materialIndices } = mergeMeshesToGeometry(meshes);

    // extract textures shared by meshes in scene
    const maps = getTexturesFromMaterials(materials, ['map', 'normalMap']);
    const pbrMap = mergeTexturesFromMaterials(materials, ['roughnessMap', 'metalnessMap']);

    // create bounding volume hierarchy from a static scene
    const bvh = bvhAccel(geometry, materialIndices);
    const flattenedBvh = flattenBvh(bvh);
    const numTris = geometry.index.count / 3;

    // describes optimal dimensions used to pack 1-dimensional data into a 2-dimensional array
    const indexDim = textureDimensionsFromArray(numTris);
    const bvhDim = textureDimensionsFromArray(flattenedBvh.count);
    const vertexDim = textureDimensionsFromArray(geometry.attributes.position.count);

    const useGlass = materials.some(m => m.transparent);
    const useShadowCatcher = materials.some(m => m.shadowCatcher);

    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragString({
      OES_texture_float_linear,
      BVH_COLUMNS: bvhDim.columnsLog,
      INDEX_COLUMNS: indexDim.columnsLog,
      VERTEX_COLUMNS: vertexDim.columnsLog,
      STACK_SIZE: flattenedBvh.maxDepth,
      NUM_TRIS: numTris,
      NUM_MATERIALS: materials.length,
      NUM_DIFFUSE_MAPS: maps.map.textures.length,
      NUM_NORMAL_MAPS: maps.normalMap.textures.length,
      NUM_PBR_MAPS: pbrMap.textures.length,
      BOUNCES: bounces,
      USE_GLASS: useGlass,
      USE_SHADOW_CATCHER: useShadowCatcher,
      SAMPLING_DIMENSIONS: samplingDimensions
    }));

    const program = createProgram(gl, fullscreenQuad.vertexShader, fragmentShader);
    gl.useProgram(program);

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
      const images = maps.map.textures.map(t => t.image);
      const flipY = maps.map.textures.map(t => t.flipY);
      const { maxSize, relativeSizes } = maxImageSize(images);
      // create GL Array Texture from individual textures
      textureAllocator.bind(uniforms.diffuseMap, makeTexture(gl, {
        width: maxSize.width,
        height: maxSize.height,
        channels: 3,
        gammaCorrection: true,
        data: images,
        flipY
      }));
      bufferData.diffuseMapSize = relativeSizes;
      bufferData.diffuseMapIndex = maps.map.indices;
    }

    if (maps.normalMap.textures.length > 0) {
      const images = maps.normalMap.textures.map(t => t.image);
      const flipY = maps.normalMap.textures.map(t => t.flipY);
      const { maxSize, relativeSizes } = maxImageSize(images);
      // create GL Array Texture from individual textures
      textureAllocator.bind(uniforms.normalMap, makeTexture(gl, {
        width: maxSize.width,
        height: maxSize.height,
        channels: 3,
        data: images,
        flipY
      }));
      bufferData.normalMapSize = relativeSizes;
      bufferData.normalMapIndex = maps.normalMap.indices;
    }

    if (pbrMap.textures.length > 0) {
      const images = pbrMap.textures.map(t => t.image);
      const flipY = pbrMap.textures.map(t => t.flipY);
      const { maxSize, relativeSizes } = maxImageSize(images);
      // create GL Array Texture from individual textures
      textureAllocator.bind(uniforms.pbrMap, makeTexture(gl, {
        width: maxSize.width,
        height: maxSize.height,
        channels: 3,
        data: images,
        flipY
      }));
      bufferData.pbrMapSize = relativeSizes;
      bufferData.roughnessMapIndex = pbrMap.indices.roughnessMap;
      bufferData.metalnessMapIndex = pbrMap.indices.metalnessMap;
    }

    uploadBuffers(gl, program, bufferData);

    textureAllocator.bind(uniforms.positions,  makeTexture(gl, {
      data: padArray(geometry.getAttribute('position').array, 3 * vertexDim.size),
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST,
      width: vertexDim.columns,
      height: vertexDim.rows
    }));

    textureAllocator.bind(uniforms.normals,  makeTexture(gl, {
      data: padArray(geometry.getAttribute('normal').array, 3 * vertexDim.size),
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST,
      width: vertexDim.columns,
      height: vertexDim.rows
    }));

    textureAllocator.bind(uniforms.uvs,  makeTexture(gl, {
      data: padArray(geometry.getAttribute('uv').array, 2 * vertexDim.size),
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST,
      width: vertexDim.columns,
      height: vertexDim.rows
    }));

    textureAllocator.bind(uniforms.bvh, makeTexture(gl, {
      data: padArray(flattenedBvh.buffer, 4 * bvhDim.size),
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST,
      width: bvhDim.columns,
      height: bvhDim.rows,
    }));

    const envImage = generateEnvMapFromSceneComponents(directionalLights, environmentLights);

    textureAllocator.bind(uniforms.envmap, makeTexture(gl, {
      data: envImage.data,
      minFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
      magFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
      width: envImage.width,
      height: envImage.height,
    }));

    const distribution = envmapDistribution(envImage);
    textureAllocator.bind(uniforms.envmapDistribution, makeTexture(gl, {
      data: distribution.data,
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST,
      width: distribution.width,
      height: distribution.height,
    }));

    // const pixelSeed = new Float32Array(2048 * 2048);
    // for (let i = 0; i < 2048 * 2048; i++) {
    //   pixelSeed[i] = Math.random();
    // }

    // textureAllocator.bind(uniforms.randomTexture, makeTexture(gl, {
    //   data: pixelSeed,
    //   minFilter: gl.NEAREST,
    //   magFilter: gl.NEAREST,
    //   width: 2048,
    //   height: 2048
    // }));

    return {
      program,
      uniforms,
    };
  }

  const { program, uniforms } = initScene();

  function setSize(width, height) {
    gl.useProgram(program);
    gl.uniform2f(uniforms.pixelSize, 1 / width, 1 / height);
  }

  function setCamera(camera) {
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms['camera.transform'], false, camera.matrixWorld.elements);
    gl.uniform1f(uniforms['camera.aspect'], camera.aspect);
    gl.uniform1f(uniforms['camera.fov'], 0.5 / Math.tan(0.5 * Math.PI * camera.fov / 180));
    gl.uniform1f(uniforms['camera.focus'], camera.focus || 0);
    gl.uniform1f(uniforms['camera.aperture'], camera.aperture || 0);
  }

  function nextSeed() {
    gl.useProgram(program);
    gl.uniform1fv(uniforms['dimension[0]'], random.next());
  }

  function restartSeed() {
    random.restart();
  }

  function draw() {
    gl.useProgram(program);
    fullscreenQuad.draw();
  }

  nextSeed();

  return Object.freeze({
    setSize,
    setCamera,
    nextSeed,
    restartSeed,
    draw
  });
}
