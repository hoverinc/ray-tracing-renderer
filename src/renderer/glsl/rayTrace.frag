import { unrollLoop } from '../glslUtil';
import core from './chunks/core.glsl';
import textureLinear from './chunks/textureLinear.glsl';
import intersect from './chunks/intersect.glsl';
import random from './chunks/random.glsl';
import envmap from './chunks/envmap.glsl';
import bsdf from './chunks/bsdf.glsl';
import sample from './chunks/sample.glsl';
import sampleMaterial from './chunks/sampleMaterial.glsl';
import sampleShadowCatcher from './chunks/sampleShadowCatcher.glsl';
import sampleGlass from './chunks/sampleGlassSpecular.glsl';
// import sampleGlass from './chunks/sampleGlassMicrofacet.glsl';

export default {
includes: [
  core,
  textureLinear,
  intersect,
  random,
  envmap,
  bsdf,
  sample,
  sampleMaterial,
  sampleGlass,
  sampleShadowCatcher,
],
outputs: ['light', 'position'],
source: (defines) => `
  void bounce(inout Path path, int i, inout SurfaceInteraction si) {
    if (path.abort) {
      return;
    }

    si = intersectScene(path.ray);

    if (!si.hit) {
      if (path.specularBounce) {
        path.li += path.beta * sampleBackgroundFromDirection(path.ray.d);
      }

      path.abort = true;
    } else {
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
  }

  // Path tracing integrator as described in
  // http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Path_Tracing.html#
  vec4 integrator(inout Ray ray, inout SurfaceInteraction si) {
    Path path;
    path.ray = ray;
    path.li = vec3(0);
    path.alpha = 1.0;
    path.beta = vec3(1.0);
    path.specularBounce = true;
    path.abort = false;

    bounce(path, 1, si);

    SurfaceInteraction indirectSi;

    // Manually unroll for loop.
    // Some hardware fails to interate over a GLSL loop, so we provide this workaround
    // for (int i = 1; i < defines.bounces + 1, i += 1)
    // equivelant to
    ${unrollLoop('i', 2, defines.BOUNCES + 1, 1, `
      bounce(path, i, indirectSi);
    `)}

    return vec4(path.li, path.alpha);
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

    SurfaceInteraction si;

    vec4 liAndAlpha = integrator(cam, si);

    if (dot(si.position, si.position) == 0.0) {
      si.position = origin + direction * RAY_MAX_DISTANCE;
    }

    if (!(liAndAlpha.x < INF && liAndAlpha.x > -EPS)) {
      liAndAlpha = vec4(0, 0, 0, 1);
    }

    out_light = liAndAlpha;
    out_position = vec4(si.position, si.meshId);

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

    // fragColor = vec4(0, 0, 0, 1);
    // if (sampleIndex == SAMPLING_DIMENSIONS) {
    //   fragColor = vec4(1, 1, 1, 1);
    // } else if (sampleIndex > SAMPLING_DIMENSIONS) {
    //   fragColor = vec4(1, 0, 0, 1);
    // }
}
`
}
