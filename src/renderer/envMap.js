
import { generateEnvMapFromSceneComponents, generateBackgroundMapFromSceneBackground } from './envMapBake';
import { makeEnvMapDistribution } from './envMapDistribution';
import { makeTexture } from './Texture';

export function makeEnvMap(gl, { decomposedScene, optionalExtensions } ) {
  const { OES_texture_float_linear } = optionalExtensions;
  const { background, directionalLights, ambientLights, environmentLights } = decomposedScene;

  // the env map provides a light source for surfaces
  const envImage = generateEnvMapFromSceneComponents(directionalLights, ambientLights, environmentLights);
  const envMap = makeTexture(gl, {
    data: envImage.data,
    storage: 'halfFloat',
    minFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
    magFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
    width: envImage.width,
    height: envImage.height,
  });

  // background map purely acts as the background for the rendered image
  let backgroundMap;
  if (background) {
    const backgroundImage = generateBackgroundMapFromSceneBackground(background);
    backgroundMap = makeTexture(gl, {
      data: backgroundImage.data,
      storage: 'halfFloat',
      minFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
      magFilter: OES_texture_float_linear ? gl.LINEAR : gl.NEAREST,
      width: backgroundImage.width,
      height: backgroundImage.height,
    });
  } else {
    backgroundMap = envMap;
  }


  const distributionImage = makeEnvMapDistribution(envImage);

  const envMapDistribution = makeTexture(gl, {
    data: distributionImage.data,
    storage: 'halfFloat',
    width: distributionImage.width,
    height: distributionImage.height,
  });

  return {
    envMap,
    backgroundMap,
    envMapDistribution,
  };
}
