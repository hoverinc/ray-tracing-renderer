import { unrollLoop } from '../glslUtil';
import constants from './chunks/constants.glsl';
import rayTraceCore from './chunks/rayTraceCore.glsl';
import textureLinear from './chunks/textureLinear.glsl';
import materialBuffer from './chunks/materialBuffer.glsl';
import intersect from './chunks/intersect.glsl';
import surfaceInteractionDirect from './chunks/surfaceInteractionDirect.glsl';
import random from './chunks/random.glsl';
import envMap from './chunks/envMap.glsl';
import bsdf from './chunks/bsdf.glsl';
import sample from './chunks/sample.glsl';
import sampleMaterial from './chunks/sampleMaterial.glsl';
import sampleShadowCatcher from './chunks/sampleShadowCatcher.glsl';
import sampleGlass from './chunks/sampleGlassSpecular.glsl';

export default {
includes: [
  constants,
  rayTraceCore,
  textureLinear,
  materialBuffer,
  intersect,
  surfaceInteractionDirect,
  random,
  envMap,
  bsdf,
  sample,
  sampleMaterial,
  sampleGlass,
  sampleShadowCatcher,
],
outputs: ['diffuse', 'specular'],
source: (defines) => `
  void bounce(inout Path path, int i, inout SurfaceInteraction si) {

    if (!si.hit) {
      vec3 irr = path.specularBounce ? sampleBackgroundFromDirection(path.ray.d) : sampleEnvmapFromDirection(path.ray.d);

      // hit a light source (the hdr map)
      // add contribution from light source
      // path.misWeight is the multiple importance sampled weight of this light source
      path.diffuse += path.beta * path.diffuseBeta * path.misWeight * irr;
      path.specular += path.beta * path.specularBeta * path.misWeight * irr;
      path.abort = true;
      return;
    }

    #ifdef USE_GLASS
      if (si.materialType == THIN_GLASS || si.materialType == THICK_GLASS) {
        sampleGlassSpecular(si, i, path);
      }
    #endif
    #ifdef USE_SHADOW_CATCHER
      if (si.materialType == SHADOW_CATCHER) {
        sampleShadowCatcher(si, i, path);
      }
    #endif
    if (si.materialType == STANDARD) {
      sampleMaterial(si, i, path);
    }

    // Russian Roulette sampling
    if (i >= 2) {
      float q = 1.0 - dot(path.beta, luminance);
      if (randomSample() < q) {
        path.abort = true;
      }
      path.beta /= 1.0 - q;
    }

  }

  // Path tracing integrator as described in
  // http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Path_Tracing.html#
  Path integrator(inout Ray ray) {
    Path path;
    path.ray = ray;
    path.alpha = 1.0;
    path.beta = vec3(1.0);
    path.diffuseBeta = vec3(1.0);
    path.specularBeta = vec3(1.0);
    path.specularBounce = false;
    path.misWeight = 0.0;
    path.abort = false;

    SurfaceInteraction si;

    // first surface interaction from g-buffer
    surfaceInteractionDirect(vCoord, si);

    // first surface interaction from ray interesction
    // intersectScene(path.ray, si);

    bounce(path, 1, si);

    // Manually unroll for loop.
    // Some hardware fails to iterate over a GLSL loop, so we provide this workaround
    // for (int i = 2; i < defines.bounces + 1, i += 1)
    ${unrollLoop('i', 2, defines.BOUNCES + 1, 1, `
      if (path.abort) {
        return path;
      }
      intersectScene(path.ray, si);
      bounce(path, i, si);
    `)}

    return path;
  }

  void main() {
    initRandom();

    vec2 vCoordAntiAlias = vCoord + jitter;

    vec3 direction = normalize(vec3(vCoordAntiAlias - 0.5, -1.0) * vec3(camera.aspect, 1.0, camera.fov));

    // Thin lens model with depth-of-field
    // http://www.pbr-book.org/3ed-2018/Camera_Models/Projective_Camera_Models.html#TheThinLensModelandDepthofField
    // vec2 lensPoint = camera.aperture * sampleCircle(randomSampleVec2());
    // vec3 focusPoint = -direction * camera.focus / direction.z; // intersect ray direction with focus plane

    // vec3 origin = vec3(lensPoint, 0.0);
    // direction = normalize(focusPoint - origin);

    // origin = vec3(camera.transform * vec4(origin, 1.0));
    // direction = mat3(camera.transform) * direction;

    vec3 origin = camera.transform[3].xyz;
    direction = mat3(camera.transform) * direction;

    Ray cam;
    initRay(cam, origin, direction);

    Path path = integrator(cam);

    float validLi = dot(path.diffuse, path.specular);

    if (!(validLi < INF && validLi > -EPS)) {
      path.diffuse = vec3(0);
      path.specular = vec3(0);
    }

    out_diffuse = vec4(path.diffuse, path.alpha);
    out_specular = vec4(path.specular, path.alpha);

    // Stratified Sampling Sample Count Test
    // ---------------
    // Uncomment the following code
    // Then observe the colors of the image
    // If:
    // * The resulting image is pure black
    //   Extra samples are being passed to the shader that aren't being used.
    // * The resulting image contains red
    //   Not enough samples are being passed to the shader
    // * The resulting image contains only white with some black
    //   All samples are used by the shader. Correct result!

    // out_light = vec4(0, 0, 0, 1);
    // if (sampleIndex == SAMPLING_DIMENSIONS) {
    //   out_light = vec4(1, 1, 1, 1);
    // } else if (sampleIndex > SAMPLING_DIMENSIONS) {
    //   out_light = vec4(1, 0, 0, 1);
    // }
}
`
}
