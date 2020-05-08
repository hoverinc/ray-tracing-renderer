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
  uniform sampler2D normalTex;
  uniform sampler2D matPropsTex;

  uniform vec2 lightScale;
  uniform bool edgeAwareUpscale;

  uniform sampler2D backgroundMap;

    // from http://www.java-gaming.org/index.php?topic=35123.0
  vec4 cubic(float v){
      vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
      vec4 s = n * n * n;
      float x = s.x;
      float y = s.y - 4.0 * s.x;
      float z = s.z - 4.0 * s.y + 6.0 * s.x;
      float w = 6.0 - x - y - z;
      return vec4(x, y, z, w) * (1.0/6.0);
  }

  vec4 textureBicubic(sampler2DArray sampler, vec3 texCoordsAndIndex){

    vec2 texSize = vec2(textureSize(sampler, 0));
    vec2 invTexSize = 1.0 / texSize;

    vec2 texCoords = texCoordsAndIndex.xy * texSize - 0.5;
    float index = texCoordsAndIndex.z;

    vec2 fxy = fract(texCoords);
    texCoords -= fxy;

    vec4 xcubic = cubic(fxy.x);
    vec4 ycubic = cubic(fxy.y);

    vec4 c = texCoords.xxyy + vec2 (-0.5, +1.5).xyxy;

    vec4 s = vec4(xcubic.xz + xcubic.yw, ycubic.xz + ycubic.yw);
    vec4 offset = c + vec4 (xcubic.yw, ycubic.yw) / s;

    offset *= invTexSize.xxyy;

    vec4 sample0 = texture(sampler, vec3(offset.xz, index));
    vec4 sample1 = texture(sampler, vec3(offset.yz, index));
    vec4 sample2 = texture(sampler, vec3(offset.xw, index));
    vec4 sample3 = texture(sampler, vec3(offset.yw, index));

    float sx = s.x / (s.x + s.y);
    float sy = s.z / (s.z + s.w);

    return mix(mix(sample3, sample2, sx), mix(sample1, sample0, sx), sy);
  }

  struct Light {
    vec4 diffuse;
    vec4 specular;
  };

  Light getUpscaledLight() {
    vec2 bufferSize = vec2(textureSize(diffuseSpecularTex, 0));

    vec3 currentPosition = texture(positionTex, vCoord).xyz;
    float currentDepth = texture(positionTex, vCoord).w;

    float depthWidth = texture(matPropsTex, vCoord).w / max(lightScale.x, lightScale.y);

    vec3 currentNormal = normalize(texture(normalTex, vCoord).xyz);
    float normalWidth = texture(normalTex, vCoord).w;

    vec2 sizef = lightScale * bufferSize;
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
      vec2 gCoord = (vec2(texels[i]) + 0.5) / sizef;

      vec3 bilinearNormal = normalize(texture(normalTex, gCoord).xyz);
      float bilinearDepth = texture(positionTex, gCoord).w;

      float isValid =
        abs(bilinearDepth - currentDepth) / (depthWidth + 0.001) > 1.0 ||
        distance(bilinearNormal, currentNormal) / (normalWidth + 0.001) > 20.0 ||
        false ? 0.0 : 1.0;

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

    vec4 diffuseAlbedo = texture(diffuseSpecularAlbedoTex, vec3(vCoord, 0));
    vec4 specularAlbedo = texture(diffuseSpecularAlbedoTex, vec3(vCoord, 1));

    // alpha channel stores the number of samples progressively rendered
    // divide the sum of light by alpha to obtain average contribution of light
    vec3 color = diffuseAlbedo.rgb * light.diffuse.rgb / light.diffuse.a + specularAlbedo.rgb * light.specular.rgb / light.specular.a;
    // vec3 color = light.diffuse.rgb;
    // vec3 color = light.diffuse.rgb / light.diffuse.a + light.specular.rgb / light.specular.a;

    // add background map to areas where geometry is not rendered
    vec3 direction = getCameraDirection(camera, vCoord);
    vec2 backgroundUv = cartesianToEquirect(direction);
    vec3 background = texture(backgroundMap, backgroundUv).rgb;
    color += (1.0 - diffuseAlbedo.a) * background;

    color *= EXPOSURE;

    color = TONE_MAPPING(color);

    color = pow(color, vec3(1.0 / 2.2)); // gamma correction

    out_color = vec4(color, 1.0);
  }
`
}
