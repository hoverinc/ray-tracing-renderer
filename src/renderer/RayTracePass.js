import { bvhAccel, flattenBvh } from './bvhAccel';
import { ThinMaterial, ThickMaterial, ShadowCatcherMaterial } from '../constants';
import { generateEnvMapFromSceneComponents, generateBackgroundMapFromSceneBackground } from './envMapCreation';
import { envmapDistribution } from './envmapDistribution';
import fragment from './glsl/rayTrace.frag';
import { mergeMeshesToGeometry } from './mergeMeshesToGeometry';
import { makeRenderPass } from './RenderPass';
import { makeStratifiedSamplerCombined } from './StratifiedSamplerCombined';
import { makeTexture } from './Texture';
import { getTexturesFromMaterials, mergeTexturesFromMaterials } from './texturesFromMaterials';
import * as THREE from 'three';
import { uploadBuffers } from './uploadBuffers';
import { clamp } from './util';

export function makeRayTracePass(gl, {
    bounces, // number of global illumination bounces
    fullscreenQuad,
    optionalExtensions,
    scene,
  }) {

  bounces = clamp(bounces, 1, 6);

  const samplingDimensions = [];

  for (let i = 1; i <= bounces; i++) {
    // specular or diffuse reflection, light importance sampling, material sampling, next path direction
    samplingDimensions.push(2, 2, 2, 2);
    if (i >= 2) {
      // russian roulette sampling
      // this step is skipped on the first bounce
      samplingDimensions.push(1);
    }
  }

  let samples;

  const renderPass = makeRenderPassFromScene({
    bounces, fullscreenQuad, gl, optionalExtensions, samplingDimensions, scene
  });

  function setSize(width, height) {
    renderPass.setUniform('pixelSize', 1 / width, 1 / height);
  }

  // noiseImage is a 32-bit PNG image
  function setNoise(noiseImage) {
    renderPass.setTexture('noise', makeTexture(gl, {
      data: noiseImage,
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST,
      storage: 'float'
    }));
  }

  function setCamera(camera) {
    renderPass.setUniform('camera.transform', camera.matrixWorld.elements);
    renderPass.setUniform('camera.aspect', camera.aspect);
    renderPass.setUniform('camera.fov', 0.5 / Math.tan(0.5 * Math.PI * camera.fov / 180));
  }

  function setJitter(x, y) {
    renderPass.setUniform('jitter', x, y);
  }

  function nextSeed() {
    renderPass.setUniform('stratifiedSamples[0]', samples.next());
  }

  function setStrataCount(strataCount) {

    if (strataCount > 1 && strataCount !== samples.strataCount) {
      // reinitailizing random has a performance cost. we can skip it if
      // * strataCount is 1, since a strataCount of 1 works with any sized StratifiedRandomCombined
      // * random already has the same strata count as desired
      samples = makeStratifiedSamplerCombined(strataCount, samplingDimensions);
    } else {
      samples.restart();
    }

    renderPass.setUniform('strataSize', 1.0 / strataCount);
    nextSeed();
  }

  function bindTextures() {
    renderPass.bindTextures();
  }

  function draw() {
    renderPass.useProgram(false);
    fullscreenQuad.draw();
  }

  samples = makeStratifiedSamplerCombined(1, samplingDimensions);

  return {
    bindTextures,
    draw,
    nextSeed,
    outputLocs: renderPass.outputLocs,
    setCamera,
    setJitter,
    setNoise,
    setSize,
    setStrataCount,
  };
}
function makeRenderPassFromScene({
    bounces,
    fullscreenQuad,
    gl,
    optionalExtensions,
    samplingDimensions,
    scene,
  }) {
  const { OES_texture_float_linear } = optionalExtensions;

  const { meshes, directionalLights, ambientLights, environmentLights } = decomposeScene(scene);
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

  const renderPass = makeRenderPass(gl, {
    defines: {
      OES_texture_float_linear,
      BVH_COLUMNS: textureDimensionsFromArray(flattenedBvh.count).columnsLog,
      INDEX_COLUMNS: textureDimensionsFromArray(numTris).columnsLog,
      VERTEX_COLUMNS: textureDimensionsFromArray(geometry.attributes.position.count).columnsLog,
      STACK_SIZE: flattenedBvh.maxDepth,
      NUM_TRIS: numTris,
      NUM_MATERIALS: materials.length,
      NUM_DIFFUSE_MAPS: maps.map.textures.length,
      NUM_NORMAL_MAPS: maps.normalMap.textures.length,
      NUM_DIFFUSE_NORMAL_MAPS: Math.max(maps.map.textures.length, maps.normalMap.textures.length),
      NUM_PBR_MAPS: pbrMap.textures.length,
      BOUNCES: bounces,
      USE_GLASS: useGlass,
      USE_SHADOW_CATCHER: useShadowCatcher,
      SAMPLING_DIMENSIONS: samplingDimensions.reduce((a, b) => a + b)
    },
    fragment,
    vertex: fullscreenQuad.vertexShader
  });

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
    renderPass.setTexture('diffuseMap', texture);
    bufferData.diffuseMapSize = relativeSizes;
    bufferData.diffuseMapIndex = maps.map.indices;
  }

  if (maps.normalMap.textures.length > 0) {
    const { relativeSizes, texture } = makeTextureArray(gl, maps.normalMap.textures, false);
    renderPass.setTexture('normalMap', texture);
    bufferData.normalMapSize = relativeSizes;
    bufferData.normalMapIndex = maps.normalMap.indices;
  }

  if (pbrMap.textures.length > 0) {
    const { relativeSizes, texture } = makeTextureArray(gl, pbrMap.textures, false);
    renderPass.setTexture('pbrMap', texture);
    bufferData.pbrMapSize = relativeSizes;
    bufferData.roughnessMapIndex = pbrMap.indices.roughnessMap;
    bufferData.metalnessMapIndex = pbrMap.indices.metalnessMap;
  }

  uploadBuffers(gl, renderPass.program, bufferData);

  renderPass.setTexture('positions', makeDataTexture(gl, geometry.getAttribute('position').array, 3));

  renderPass.setTexture('normals', makeDataTexture(gl, geometry.getAttribute('normal').array, 3));

  renderPass.setTexture('uvs', makeDataTexture(gl, geometry.getAttribute('uv').array, 2));

  renderPass.setTexture('bvh', makeDataTexture(gl, flattenedBvh.buffer, 4));

  const envImage = generateEnvMapFromSceneComponents(directionalLights, ambientLights, environmentLights);
  const envImageTextureObject = makeTexture(gl, {
    data: envImage.data,
    minFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
    magFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
    width: envImage.width,
    height: envImage.height,
  });

  renderPass.setTexture('envmap', envImageTextureObject);

  let backgroundImageTextureObject;
  if (scene.background) {
    const backgroundImage = generateBackgroundMapFromSceneBackground(scene.background);
    backgroundImageTextureObject = makeTexture(gl, {
      data: backgroundImage.data,
      minFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
      magFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
      width: backgroundImage.width,
      height: backgroundImage.height,
    });
  } else {
    backgroundImageTextureObject = envImageTextureObject;
  }

  renderPass.setTexture('backgroundMap', backgroundImageTextureObject);

  const distribution = envmapDistribution(envImage);

  renderPass.setTexture('envmapDistribution', makeTexture(gl, {
    data: distribution.data,
    minFilter: gl.NEAREST,
    magFilter: gl.NEAREST,
    width: distribution.width,
    height: distribution.height,
  }));

  return renderPass;
}

function decomposeScene(scene) {
  const meshes = [];
  const directionalLights = [];
  const ambientLights = [];
  const environmentLights = [];
  scene.traverse(child => {
    if (child.isMesh) {
      if (!child.geometry || !child.geometry.getAttribute('position')) {
        console.warn(child, 'must have a geometry property with a position attribute');
      }
      else if (!(child.material.isMeshStandardMaterial)) {
        console.warn(child, 'must use MeshStandardMaterial in order to be rendered.');
      } else {
        meshes.push(child);
      }
    }
    if (child.isDirectionalLight) {
      directionalLights.push(child);
    }
    if (child.isAmbientLight) {
      ambientLights.push(child);
    }
    if (child.isEnvironmentLight) {
      if (environmentLights.length > 1) {
        console.warn(environmentLights, 'only one environment light can be used per scene');
      }
      // Valid lights have HDR texture map in RGBEEncoding
      if (isHDRTexture(child)) {
        environmentLights.push(child);
      } else {
        console.warn(child, 'environment light does not use color value or map with THREE.RGBEEncoding');
      }
    }
  });

  return {
    meshes, directionalLights, ambientLights, environmentLights
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
