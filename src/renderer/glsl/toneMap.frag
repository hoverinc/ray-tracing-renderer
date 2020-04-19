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

  struct Light {
    vec4 diffuse;
    vec4 specular;
  };

  Light getUpscaledLight() {
    float meshId = getMeshId(positionTex, vCoord);

    vec2 sizef = lightScale * vec2(textureSize(positionTex, 0));
    vec2 texelf = vCoord * sizef - 0.5;
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

    Light light;
    float sum;
    for (int i = 0; i < 4; i++) {
      vec2 pCoord = (vec2(texels[i]) + 0.5) / sizef;
      float isValid = getMeshId(positionTex, pCoord) == meshId ? 1.0 : 0.0;
      float weight = isValid * weights[i];
      light.diffuse += weight * texelFetch(diffuseSpecularTex, ivec3(texels[i], 0), 0);
      light.specular += weight * texelFetch(diffuseSpecularTex, ivec3(texels[i], 1), 0);
      sum += weight;
    }

    if (sum > 0.0) {
      light.diffuse /= sum;
      light.specular /= sum;
    } else {
      light.diffuse = texture(diffuseSpecularTex, vec3(lightScale * vCoord, 0));
      light.specular = texture(diffuseSpecularTex, vec3(lightScale * vCoord, 1));
    }

    return light;
  }

  uniform Camera camera;

  void main() {
    Light light;

    if (edgeAwareUpscale) {
      light = getUpscaledLight();
    } else {
      light.diffuse = texture(diffuseSpecularTex, vec3(lightScale * vCoord, 0));
      light.specular = texture(diffuseSpecularTex, vec3(lightScale * vCoord, 1));
    }

    vec3 direction = getCameraDirection(camera, vCoord);
    vec2 backgroundUv = cartesianToEquirect(direction);
    vec3 background = texture(backgroundMap, backgroundUv).rgb;

    vec4 diffuseAlbedo = texture(diffuseSpecularAlbedoTex, vec3(vCoord, 0));
    vec4 specularAlbedo = texture(diffuseSpecularAlbedoTex, vec3(vCoord, 1));

    // alpha channel stores the number of samples progressively rendered
    // divide the sum of light by alpha to obtain average contribution of light

    vec3 color = diffuseAlbedo.rgb * light.diffuse.rgb / light.diffuse.a + specularAlbedo.rgb * light.specular.rgb / light.specular.a;
    // vec3 color = specular.rgb / specular.a;
    // vec3 color = diffuse.rgb / diffuse.a;
    // vec3 color = diffuse.rgb / diffuse.a + specular.rgb / specular.a;
    // vec3 color = diffuseAlbedo * diffuse.rgb / diffuse.a;
    // vec3 color = specularAlbedo * specular.rgb / specular.a;

    color += (1.0 - diffuseAlbedo.a) * background;

    color *= EXPOSURE;

    color = TONE_MAPPING(color);

    color = pow(color, vec3(1.0 / 2.2)); // gamma correction

    out_color = vec4(color, 1.0);
  }
`
}
