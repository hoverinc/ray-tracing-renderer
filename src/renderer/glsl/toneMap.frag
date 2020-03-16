import constants from './chunks/constants.glsl';
import textureLinear from './chunks/textureLinear.glsl';
import toneMapOperators from './chunks/toneMapOperators.glsl';

export default {
includes: [constants, textureLinear, toneMapOperators],
outputs: ['color'],
source: `
  in vec2 vCoord;

  uniform mediump sampler2DArray diffuseSpecularTex;
  uniform sampler2D albedoTex;
  uniform sampler2D positionTex;

  uniform vec2 lightScale;

  #ifdef EDGE_PRESERVING_UPSCALE

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
      // upscaledLight += weight * texelFetch(light, texels[i], 0);
      sum += weight;
    }

    if (sum > 0.0) {
      upscaledLight /= sum;
    } else {
      // upscaledLight = texture(light, lightScale * coord);
    }

    return upscaledLight;
  }
  #endif

  void main() {
    // #ifdef EDGE_PRESERVING_UPSCALE
    //   vec4 upscaledLight = getUpscaledLight(vCoord);
    // #else
    //   vec4 upscaledLight = texture(diffuseSpecularTex, vec3(lightScale * vCoord, 0));
    // #endif
    vec4 diffuse = texture(diffuseSpecularTex, vec3(lightScale * vCoord, 0));
    vec4 specular = texture(diffuseSpecularTex, vec3(lightScale * vCoord, 1));
    vec3 albedo = texture(albedoTex, vCoord).rgb;
    float metalness = texture(albedoTex, vCoord).a;

    // alpha channel stores the number of samples progressively rendered
    // divide the sum of light by alpha to obtain average contribution of light

    // in addition, alpha contains a scale factor for the shadow catcher material
    // dividing by alpha normalizes the brightness of the shadow catcher to match the background envmap.
    // vec3 light = diffuse.rgb / diffuse.a;
    // vec3 light = specular.rgb / specular.a;
    vec3 light = albedo * diffuse.rgb / diffuse.a + mix(vec3(1.0), albedo, metalness) * specular.rgb / specular.a;

    light *= EXPOSURE;

    light = TONE_MAPPING(light);

    light = pow(light, vec3(1.0 / 2.2)); // gamma correction

    out_color = vec4(light, 1.0);
    // out_color = vec4(texture(albedo, vCoord).rgb, 1.0);
  }
`
}
