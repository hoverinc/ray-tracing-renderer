import { bvhAccel, flattenBvh } from './bvhAccel';
import { generateEnvMapFromSceneComponents, generateBackgroundMapFromSceneBackground } from './envMapCreation';
import { envMapDistribution } from './envMapDistribution';
import fragment from './glsl/rayTrace.frag';
import { makeRenderPass } from './RenderPass';
import { makeStratifiedSamplerCombined } from './StratifiedSamplerCombined';
import { makeTexture } from './Texture';
import { clamp } from './util';

export function makeRayTracePass(gl, {
    bounces, // number of global illumination bounces
    decomposedScene,
    fullscreenQuad,
    materialBuffer,
    mergedMesh,
    optionalExtensions,
  }) {

  bounces = clamp(bounces, 1, 6);

  const samplingDimensions = [];

  for (let i = 1; i <= bounces; i++) {
    // specular or diffuse reflection, light importance sampling, next path direction
    samplingDimensions.push(2, 2, 2);
    if (i >= 2) {
      // russian roulette sampling
      // this step is skipped on the first bounce
      samplingDimensions.push(1);
    }
  }

  let samples;

  const renderPass = makeRenderPassFromScene({
    bounces, decomposedScene, fullscreenQuad, gl, materialBuffer, mergedMesh, optionalExtensions, samplingDimensions,
  });

  function setSize(width, height) {
    renderPass.setUniform('pixelSize', 1 / width, 1 / height);
  }

  // noiseImage is a 32-bit PNG image
  function setNoise(noiseImage) {
    renderPass.setTexture('noiseTex', makeTexture(gl, {
      data: noiseImage,
      wrapS: gl.REPEAT,
      wrapT: gl.REPEAT,
      storage: 'halfFloat',
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

  function setGBuffers({ position, normal, faceNormal, color, matProps }) {
    renderPass.setTexture('gPosition', position);
    renderPass.setTexture('gNormal', normal);
    renderPass.setTexture('gFaceNormal', faceNormal);
    renderPass.setTexture('gColor', color);
    renderPass.setTexture('gMatProps', matProps);
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
    setGBuffers,
    setNoise,
    setSize,
    setStrataCount,
  };
}
function makeRenderPassFromScene({
    bounces,
    decomposedScene,
    fullscreenQuad,
    gl,
    materialBuffer,
    mergedMesh,
    optionalExtensions,
    samplingDimensions,
  }) {
  const { OES_texture_float_linear } = optionalExtensions;

  const { background, directionalLights, ambientLights, environmentLights } = decomposedScene;

  const { geometry, materials, materialIndices } = mergedMesh;

  // create bounding volume hierarchy from a static scene
  const bvh = bvhAccel(geometry, materialIndices);
  const flattenedBvh = flattenBvh(bvh);
  const numTris = geometry.index.count / 3;

  const renderPass = makeRenderPass(gl, {
    defines: {
      OES_texture_float_linear,
      BVH_COLUMNS: textureDimensionsFromArray(flattenedBvh.count).columnsLog,
      INDEX_COLUMNS: textureDimensionsFromArray(numTris).columnsLog,
      VERTEX_COLUMNS: textureDimensionsFromArray(geometry.attributes.position.count).columnsLog,
      STACK_SIZE: flattenedBvh.maxDepth,
      BOUNCES: bounces,
      USE_GLASS: materials.some(m => m.transparent),
      USE_SHADOW_CATCHER: materials.some(m => m.shadowCatcher),
      SAMPLING_DIMENSIONS: samplingDimensions.reduce((a, b) => a + b),
      ...materialBuffer.defines
    },
    fragment,
    vertex: fullscreenQuad.vertexShader
  });

  renderPass.setTexture('diffuseMap', materialBuffer.textures.diffuseMap);
  renderPass.setTexture('normalMap', materialBuffer.textures.normalMap);
  renderPass.setTexture('pbrMap', materialBuffer.textures.pbrMap);

  renderPass.setTexture('positionBuffer', makeDataTexture(gl, geometry.getAttribute('position').array, 3));

  renderPass.setTexture('normalBuffer', makeDataTexture(gl, geometry.getAttribute('normal').array, 3));

  renderPass.setTexture('uvBuffer', makeDataTexture(gl, geometry.getAttribute('uv').array, 2));

  renderPass.setTexture('bvhBuffer', makeDataTexture(gl, flattenedBvh.buffer, 4));

  const envImage = generateEnvMapFromSceneComponents(directionalLights, ambientLights, environmentLights);
  const envImageTextureObject = makeTexture(gl, {
    data: envImage.data,
    storage: 'halfFloat',
    minFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
    magFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
    width: envImage.width,
    height: envImage.height,
  });

  renderPass.setTexture('envMap', envImageTextureObject);

  let backgroundImageTextureObject;
  if (background) {
    const backgroundImage = generateBackgroundMapFromSceneBackground(background);
    backgroundImageTextureObject = makeTexture(gl, {
      data: backgroundImage.data,
      storage: 'halfFloat',
      minFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
      magFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
      width: backgroundImage.width,
      height: backgroundImage.height,
    });
  } else {
    backgroundImageTextureObject = envImageTextureObject;
  }

  renderPass.setTexture('backgroundMap', backgroundImageTextureObject);

  const distribution = envMapDistribution(envImage);

  renderPass.setTexture('envMapDistribution', makeTexture(gl, {
    data: distribution.data,
    storage: 'halfFloat',
    width: distribution.width,
    height: distribution.height,
  }));

  return renderPass;
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
    width: textureDim.columns,
    height: textureDim.rows,
  });
}

// expand array to the given length
function padArray(typedArray, length) {
  const newArray = new typedArray.constructor(length);
  newArray.set(typedArray);
  return newArray;
}
