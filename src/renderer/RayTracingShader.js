import * as THREE from 'three';
import fragString from './glsl/rayTrace.frag';
import { createShader, createProgram, getUniforms } from './glUtil';
import { mergeMeshesToGeometry } from './mergeMeshesToGeometry';
import { bvhAccel, flattenBvh } from './bvhAccel';
import { envmapDistribution } from './envmapDistribution';
import { generateEnvMapFromSceneComponents } from './envMapCreation';
import { getTexturesFromMaterials, mergeTexturesFromMaterials } from './texturesFromMaterials';
import { makeTexture } from './Texture';
import { uploadBuffers } from './uploadBuffers';
import { ThinMaterial, ThickMaterial, ShadowCatcherMaterial } from '../constants';
import { clamp } from './util';
import { makeStratifiedSamplerCombined } from './StratifiedSamplerCombined';

//Important TODO: Refactor this file to get rid of duplicate and confusing code

export function makeRayTracingShader({
    bounces, // number of global illumination bounces
    fullscreenQuad,
    gl,
    optionalExtensions,
    scene,
    textureAllocator,
  }) {

  bounces = clamp(bounces, 1, 6);

  const samplingDimensions = [];
  samplingDimensions.push(2, 2); // anti aliasing, depth of field
  for (let i = 0; i < bounces; i++) {
    // specular or diffuse reflection, light importance sampling, material sampling, next path direction
    samplingDimensions.push(2, 2, 2, 2);
    if (i >= 1) {
      // russian roulette sampling
      // this step is skipped on the first bounce
      samplingDimensions.push(1);
    }
  }

  let samples;

  const { program, uniforms } = makeProgramFromScene({
    bounces, fullscreenQuad, gl, optionalExtensions, samplingDimensions, scene, textureAllocator
  });

  function setSize(width, height) {
    gl.useProgram(program);
    gl.uniform2f(uniforms.pixelSize, 1 / width, 1 / height);
  }

  // noiseImage is a 32-bit PNG image
  function setNoise(noiseImage) {
    textureAllocator.bind(uniforms.noise, makeTexture(gl, {
      data: noiseImage,
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST,
      storage: 'float'
    }));
  }

  function setCamera(camera) {
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms['camera.transform'], false, camera.matrixWorld.elements);
    gl.uniform1f(uniforms['camera.aspect'], camera.aspect);
    gl.uniform1f(uniforms['camera.fov'], 0.5 / Math.tan(0.5 * Math.PI * camera.fov / 180));
    gl.uniform1f(uniforms['camera.focus'], camera.focus || 0);
    gl.uniform1f(uniforms['camera.aperture'], camera.aperture || 0);
  }

  const historyBufferLocation = textureAllocator.reserveSlot();

  function setHistory(camera, historyBuffer) {
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.historyCameraInv, false, camera.matrixWorldInverse.elements);
    gl.uniformMatrix4fv(uniforms.historyCameraProj, false, camera.projectionMatrix.elements);
    historyBufferLocation.bind(uniforms.historyBuffer, historyBuffer.texture);
  }

  function nextSeed() {
    gl.useProgram(program);
    gl.uniform1fv(uniforms['stratifiedSamples[0]'], samples.next());
  }

  function setStrataCount(strataCount) {
    gl.useProgram(program);

    if (strataCount > 1 && strataCount !== samples.strataCount) {
      // reinitailizing random has a performance cost. we can skip it if
      // * strataCount is 1, since a strataCount of 1 works with any sized StratifiedRandomCombined
      // * random already has the same strata count as desired
      samples = makeStratifiedSamplerCombined(strataCount, samplingDimensions);
    } else {
      samples.restart();
    }

    gl.uniform1f(uniforms.strataSize, 1.0 / strataCount);
    nextSeed();
  }

  function useStratifiedSampling(stratifiedSampling) {
    gl.useProgram(program);
    gl.uniform1f(uniforms.useStratifiedSampling, stratifiedSampling ? 1.0 : 0.0);
  }

  function draw() {
    gl.useProgram(program);
    fullscreenQuad.draw();
  }

  samples = makeStratifiedSamplerCombined(1, samplingDimensions);

  return {
    draw,
    nextSeed,
    setCamera,
    setHistory,
    setNoise,
    setSize,
    setStrataCount,
    useStratifiedSampling
  };
}
function makeProgramFromScene({
    bounces,
    fullscreenQuad,
    gl,
    optionalExtensions,
    samplingDimensions,
    scene,
    textureAllocator
  }) {
  const { OES_texture_float_linear } = optionalExtensions;

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

  const useGlass = materials.some(m => m.transparent);
  const useShadowCatcher = materials.some(m => m.shadowCatcher);

  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragString({
    OES_texture_float_linear,
    BVH_COLUMNS: textureDimensionsFromArray(flattenedBvh.count).columnsLog,
    INDEX_COLUMNS: textureDimensionsFromArray(numTris).columnsLog,
    VERTEX_COLUMNS: textureDimensionsFromArray(geometry.attributes.position.count).columnsLog,
    STACK_SIZE: flattenedBvh.maxDepth,
    NUM_TRIS: numTris,
    NUM_MATERIALS: materials.length,
    NUM_DIFFUSE_MAPS: maps.map.textures.length,
    NUM_NORMAL_MAPS: maps.normalMap.textures.length,
    NUM_PBR_MAPS: pbrMap.textures.length,
    BOUNCES: bounces,
    USE_GLASS: useGlass,
    USE_SHADOW_CATCHER: useShadowCatcher,
    SAMPLING_DIMENSIONS: samplingDimensions.reduce((a, b) => a + b)
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

  if (pbrMap.textures.length > 0) {
    const { relativeSizes, texture } = makeTextureArray(gl, pbrMap.textures, false);
    textureAllocator.bind(uniforms.pbrMap, texture);
    bufferData.pbrMapSize = relativeSizes;
    bufferData.roughnessMapIndex = pbrMap.indices.roughnessMap;
    bufferData.metalnessMapIndex = pbrMap.indices.metalnessMap;
  }

  uploadBuffers(gl, program, bufferData);

  textureAllocator.bind(
    uniforms.positions,
    makeDataTexture(gl, geometry.getAttribute('position').array, 3)
  );

  textureAllocator.bind(
    uniforms.normals,
    makeDataTexture(gl, geometry.getAttribute('normal').array, 3)
  );

  textureAllocator.bind(
    uniforms.uvs,
    makeDataTexture(gl, geometry.getAttribute('uv').array, 2)
  );

  textureAllocator.bind(
    uniforms.bvh,
    makeDataTexture(gl, flattenedBvh.buffer, 4)
  );

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

  return {
    program,
    uniforms,
  };
}

function decomposeScene(scene) {
  const meshes = [];
  const directionalLights = [];
  const environmentLights = [];
  scene.traverse(child => {
    if (child instanceof THREE.Mesh) {
      if (!child.geometry || !child.geometry.getAttribute('position')) {
        console.warn(child, 'must have a geometry property with a position attribute');
      }
      else if (!(child.material instanceof THREE.MeshStandardMaterial)) {
        console.warn(child, 'must use MeshStandardMaterial in order to be rendered.');
      } else {
        meshes.push(child);
      }
    }
    if (child instanceof THREE.DirectionalLight) {
      directionalLights.push(child);
    }
    if (child instanceof THREE.EnvironmentLight) {
      if (environmentLights.length > 1) {
        console.warn(environmentLights, 'only one environment light can be used per scene');
      }
      else if (isHDRTexture(child)) {
        environmentLights.push(child);
      } else {
        console.warn(child, 'environment light does not use THREE.RGBEEncoding');
      }
    }
  });

  return {
    meshes, directionalLights, environmentLights
  };
}

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

function makeDataTexture(gl, dataArray, channels) {
  const textureDim = textureDimensionsFromArray(dataArray.length / channels);
  return makeTexture(gl, {
    data: padArray(dataArray, channels * textureDim.size),
    minFilter: gl.NEAREST,
    magFilter: gl.NEAREST,
    width: textureDim.columns,
    height: textureDim.rows,
  });
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
