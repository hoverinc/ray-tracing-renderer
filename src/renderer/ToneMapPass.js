import fragment from './glsl/toneMap.frag';
import { makeRenderPass } from './RenderPass';
import * as THREE from 'three';

const toneMapFunctions = {
  [THREE.LinearToneMapping]: 'linear',
  [THREE.ReinhardToneMapping]: 'reinhard',
  [THREE.Uncharted2ToneMapping]: 'uncharted2',
  [THREE.CineonToneMapping]: 'cineon',
  [THREE.ACESFilmicToneMapping]: 'acesFilmic'
};

export function makeToneMapPass(gl, params) {
  const {
    envMapTextures,
    fullscreenQuad,
    toneMappingParams
  } = params;

  const renderPass = makeRenderPass(gl, {
    gl,
    defines: {
      TONE_MAPPING: toneMapFunctions[toneMappingParams.toneMapping] || 'linear',
      WHITE_POINT: toneMappingParams.whitePoint.toExponential(), // toExponential allows integers to be represented as GLSL floats
      EXPOSURE: toneMappingParams.exposure.toExponential()
    },
    vertex: fullscreenQuad.vertexShader,
    fragment,
  });

  renderPass.setTexture('backgroundMap', envMapTextures.backgroundMap);

  function draw(params) {
    const {
      light,
      lightScale,
      diffuseSpecularAlbedo,
      position,
      normal,
      matProps,
    } = params;

    renderPass.setUniform('edgeAwareUpscale', lightScale.x < 1 || lightScale.y < 1);
    renderPass.setUniform('lightScale', lightScale.x, lightScale.y);
    renderPass.setTexture('diffuseSpecularTex', light);
    renderPass.setTexture('positionTex', position);
    renderPass.setTexture('normalTex', normal);
    renderPass.setTexture('matProps', matProps);
    renderPass.setTexture('diffuseSpecularAlbedoTex', diffuseSpecularAlbedo);

    renderPass.useProgram();
    fullscreenQuad.draw();
  }

  function setCamera(camera) {
    renderPass.setUniform('camera.transform', camera.matrixWorld.elements);
    renderPass.setUniform('camera.aspect', camera.aspect);
    renderPass.setUniform('camera.focalLength', 0.5 / Math.tan(0.5 * Math.PI * camera.fov / 180));
  }

  return {
    draw,
    setCamera
  };
}
