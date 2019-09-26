// Convert image data from the RGBE format to a 32-bit floating point format
// See https://www.cg.tuwien.ac.at/research/theses/matkovic/node84.html for a description of the RGBE format

import { rgbeToFloat } from './rgbeToFloat';
import { clamp } from './util';
import * as THREE from 'three';

const DEFAULT_MAP_RESOLUTION = {
  width: 4096,
  height: 2048,
};

// Tools for generating and modify env maps for lighting from scene component data
export function generateEnvMapFromSceneComponents(directionalLights, environmentLights) {
  let envImage = initializeEnvMap(environmentLights);
  directionalLights.forEach( light => { envImage.data = addDirectionalLightToEnvMap(light, envImage); });

  return envImage;
}

export function initializeEnvMap(environmentLights) {
  let envImage;
  // Initialize map from environment light if present
  if (environmentLights.length > 0) {
    // TODO: support multiple environment lights (what if they have different resolutions?)
    const environmentLight = environmentLights[0];
    envImage = {
      width: environmentLight.map.image.width,
      height: environmentLight.map.image.height,
      data: environmentLight.map.image.data,
    };
    envImage.data = rgbeToFloat(envImage.data, environmentLight.intensity);
  } else { // initialize blank map
    envImage = generateBlankMap(DEFAULT_MAP_RESOLUTION.width, DEFAULT_MAP_RESOLUTION.height);
  }

  return envImage;
}

export function generateBlankMap(width, height) {
  const texels = width * height;
  const floatBuffer = new Float32Array(texels * 3);
  floatBuffer.fill(0.0);

  return {
    width: width,
    height: height,
    data: floatBuffer,
  };
}

export function addDirectionalLightToEnvMap(light, image) {
  const sphericalCoords = new THREE.Spherical();
  const lightDirection = light.position.clone().sub(light.target.position);
  sphericalCoords.setFromVector3(lightDirection);
  sphericalCoords.theta = (Math.PI * 3 / 2) - sphericalCoords.theta;
  sphericalCoords.makeSafe();
  return addLightAtCoordinates(light, image, sphericalCoords);
}

// Perform modifications on env map to match input scene
function addLightAtCoordinates(light, image, originCoords) {
  const floatBuffer = image.data;
  const width = image.width;
  const height = image.height;
  const xTexels = (floatBuffer.length / (3 * height));
  const yTexels = (floatBuffer.length / (3 * width));
  const density = 8;
  // default softness for standard directional lights is 0.01, i.e. a hard shadow
  const softness = light.softness || 0.01;

  // angle from center of light at which no more contributions are projected
  const threshold = findThreshold(originCoords, softness);
  // if too few texels are rejected by the threshold then the time to evaluate it is no longer worth it
  const useThreshold = threshold < Math.PI / 5;
  // functional trick to keep the conditional check out of the main loop
  const intensityFromAngleFunction = useThreshold ? getIntensityFromAngleDifferentialThresholded : getIntensityFromAngleDifferential;

  let encounteredX = false;
  let encounteredY = false;
  let currentCoords = new THREE.Spherical();
  let falloff,
      intensity,
      bufferIndex;

  for (let i = 0; i < xTexels; i++) {
    for (let j = 0; j < yTexels; j++) {
      bufferIndex = j * width + i;
      currentCoords = equirectangularToSpherical(i, j, width, height, currentCoords);
      falloff = intensityFromAngleFunction(originCoords, currentCoords, softness, threshold);

      if(falloff > 0) {
        encounteredX = true;
        encounteredY = true;
      }
      intensity = light.intensity * falloff;

      floatBuffer[bufferIndex * 3] += intensity * light.color.r;
      floatBuffer[bufferIndex * 3 + 1] += intensity * light.color.g;
      floatBuffer[bufferIndex * 3 + 2] += intensity * light.color.b;
    }
    if(!encounteredX && encounteredY) {
      // the entire light has been added
      return floatBuffer;
    }
    encounteredX = false;
  }
  return floatBuffer;
}

function findThreshold(originCoords, softness) {
  const step = Math.PI / 128;
  const maxSteps = (2.0 * Math.PI) / step;
  for (let i = 0; i < maxSteps; i++) {
    const angle = i * step;
    const falloff = getFalloffAtAngle(angle, softness);
    if (falloff <= 0.0001) {
      return angle;
    }
  }
}

function getIntensityFromAngleDifferentialThresholded(originCoords, currentCoords, softness, threshold) {
  let deltaPhi = getAngleDelta(originCoords.phi, currentCoords.phi);
  let deltaTheta =  getAngleDelta(originCoords.theta, currentCoords.theta);

  if(deltaTheta > threshold && deltaPhi > threshold) {
    return 0;
  }
  const angle = angleBetweenSphericals(originCoords, currentCoords);
  const falloffCoeficient = getFalloffAtAngle(angle, softness);
  return falloffCoeficient;
}

function getIntensityFromAngleDifferential(originCoords, currentCoords, softness) {
  const angle = angleBetweenSphericals(originCoords, currentCoords);
  const falloffCoeficient = getFalloffAtAngle(angle, softness);
  return falloffCoeficient;
}

export function getAngleDelta(angleA, angleB) {
  let diff = Math.abs(angleA - angleB) % (2 * Math.PI);
  return diff > Math.PI ? (2 * Math.PI - diff) : diff;
}

function angleBetweenSphericals(originCoords, currentCoords) {
  const originVector = new THREE.Vector3();
  originVector.setFromSpherical(originCoords);
  const currentVector = new THREE.Vector3();
  currentVector.setFromSpherical(currentCoords);
  return originVector.angleTo(currentVector);
}

function getFalloffAtAngle(angle, softness) {
  // TODO: clean this up and optimize it
  // For now it doesn't matter too much because of the threshold cutoff in getIntensityFromAngleDifferential
  const softnessCoeficient = Math.pow(2, 14.5 * Math.max(0.001, (1.0 - clamp(softness, 0.0, 1.0))));
  const falloff = Math.pow(softnessCoeficient, 1.1) * Math.pow(8, softnessCoeficient * -1 * (Math.pow(angle, 1.8)));
  return falloff;
}

export function equirectangularToSpherical(x, y, width, height, target) {
  target.phi = (Math.PI * y) / height;
  target.theta = (2.0 * Math.PI * x) / width;
  return target;
}