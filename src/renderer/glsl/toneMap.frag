import camera from './chunks/camera.glsl';
import constants from './chunks/constants.glsl';
import textureLinear from './chunks/textureLinear.glsl';
import toneMapOperators from './chunks/toneMapOperators.glsl';

export default {
includes: [constants, camera, textureLinear, toneMapOperators],
outputs: ['color'],
source: `
  in vec2 vCoord;

  uniform mediump sampler2DArray diffuseSpecularTex;
  uniform mediump sampler2DArray diffuseSpecularAlbedoTex;
  uniform sampler2D positionTex;

  uniform vec2 lightScale;
  uniform bool edgeAwareUpscale;

  uniform sampler2D backgroundMap;

  float getMeshId(sampler2D meshIdTex, vec2 vCoord) {
    return floor(texture(meshIdTex, vCoord).w);
  }

  vec4 getUpscaledLight(vec2 coord) {
    float meshId = getMeshId(positionTex, coord);

    vec2 sizef = lightScale * vec2(textureSize(positionTex, 0));
    vec2 texelf = coord * sizef - 0.5;
    ivec2 texel = ivec2(texelf);
    vec2 f = fract(texelf);

    ivec2 texels[] = ivec2[](
      texel + ivec2(0, 0),
      texel + ivec2(1, 0),
      texel + ivec2(0, 1),
      texel + ivec2(1, 1)
    );

    float weights[] = float[](
      (1.0 - f.x) * (1.0 - f.y),
      f.x * (1.0 - f.y),
      (1.0 - f.x) * f.y,
      f.x * f.y
    );

    vec4 upscaledLight;
    float sum;
    for (int i = 0; i < 4; i++) {
      vec2 pCoord = (vec2(texels[i]) + 0.5) / sizef;
      float isValid = getMeshId(positionTex, pCoord) == meshId ? 1.0 : 0.0;
      float weight = isValid * weights[i];
      // upscaledLight += weight * texelFetch(diffuseSpecularTex, texels[i], 0);
      sum += weight;
    }

    if (sum > 0.0) {
      upscaledLight /= sum;
    } else {
      // upscaledLight = texture(diffuseSpecularTex, lightScale * coord);
    }

    return upscaledLight;
  }

  uniform Camera camera;

  void main() {

    // vec4 upscaledLight = edgeAwareUpscale ?
    //   getUpscaledLight(vCoord) :
    //   texture(diffuseSpecularTex, vec3(lightScale * vCoord, 0));

    vec3 direction = getCameraDirection(camera, vCoord);
    vec2 backgroundUv = cartesianToEquirect(direction);
    vec3 background = texture(backgroundMap, backgroundUv).rgb;

    vec4 diffuse = texture(diffuseSpecularTex, vec3(lightScale * vCoord, 0));
    vec4 specular = texture(diffuseSpecularTex, vec3(lightScale * vCoord, 1));
    vec4 diffuseAlbedo = texture(diffuseSpecularAlbedoTex, vec3(vCoord, 0));
    vec4 specularAlbedo = texture(diffuseSpecularAlbedoTex, vec3(vCoord, 1));

    // alpha channel stores the number of samples progressively rendered
    // divide the sum of light by alpha to obtain average contribution of light

    vec3 light = diffuseAlbedo.rgb * diffuse.rgb / diffuse.a + specularAlbedo.rgb * specular.rgb / specular.a;
    // vec3 light = specular.rgb / specular.a;
    // vec3 light = diffuse.rgb / diffuse.a;
    // vec3 light = diffuse.rgb / diffuse.a + specular.rgb / specular.a;
    // vec3 light = diffuseAlbedo * diffuse.rgb / diffuse.a;
    // vec3 light = specularAlbedo * specular.rgb / specular.a;

    light += (1.0 - diffuseAlbedo.a) * background;

    light *= EXPOSURE;

    light = TONE_MAPPING(light);

    light = pow(light, vec3(1.0 / 2.2)); // gamma correction

    out_color = vec4(light, 1.0);
  }
`
}
