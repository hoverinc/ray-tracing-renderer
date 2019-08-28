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
    envImage.data = rgbeToFloat(envImage.data);
    envImage.data.forEach((datum, index, arr) => {
      arr[index] = datum * environmentLight.intensity;
    }); 
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
function addLightAtCoordinates(light, image, originSphericalCoords) {
  const floatBuffer = image.data;
  const width = image.width;
  const height = image.height;

  const xTexels = (floatBuffer.length / (3 * height));
  const yTexels = (floatBuffer.length / (3 * width));
  // default softness for standard directional lights is 0.95
  const softness = ("softness" in light && light.softness !== null) ? light.softness : 0.45;
  for (let i = 0; i < xTexels; i++) {
    for (let j = 0; j < yTexels; j++) {
      const bufferIndex = j * width + i;
      const currentSphericalCoords = equirectangularToSpherical(i, j, width, height);
      const falloff = getIntensityFromAngleDifferential(originSphericalCoords, currentSphericalCoords, softness);
      const intensity = light.intensity * falloff;

      floatBuffer[bufferIndex * 3] += intensity * light.color.r;
      floatBuffer[bufferIndex * 3 + 1] += intensity * light.color.g;
      floatBuffer[bufferIndex * 3 + 2] += intensity * light.color.b;
    }
  }
  return floatBuffer;
}

function getIntensityFromAngleDifferential(originCoords, currentCoords, softness) {
  const angle = angleBetweenSphericals(originCoords, currentCoords);
  const falloffCoeficient = getFalloffAtAngle(angle, softness);
  return falloffCoeficient;
}

function angleBetweenSphericals(originCoords, currentCoords) {
  const originVector = new THREE.Vector3();
  originVector.setFromSpherical(originCoords);
  const currentVector = new THREE.Vector3();
  currentVector.setFromSpherical(currentCoords);
  return originVector.angleTo(currentVector);
}

function getFalloffAtAngle(angle, softness) {
  const softnessCoeficient = Math.pow(2, 14.5 * Math.max(0.001, (1.0 - clamp(softness, 0.0, 1.0))));
  const falloff = Math.pow(softnessCoeficient, 1.1) * Math.pow(8, softnessCoeficient * -1 * (Math.pow(angle, 1.8)));
  return falloff;
}

export function equirectangularToSpherical(x, y, width, height) {
  const TWOPI = 2.0 * Math.PI;
  const theta = (TWOPI * x) / width;
  const phi = (Math.PI * y) / height;
  const sphericalCoords = new THREE.Spherical(1.0, phi, theta);
  return sphericalCoords;
}
