import textureLinear from './chunks/textureLinear.glsl';

export default {
includes: [textureLinear],
outputs: ['color'],
source: `
  in vec2 vCoord;

  uniform sampler2D lightTex;
  uniform sampler2D positionTex;

  uniform vec2 lightScale;

  // Tonemapping functions from THREE.js

  vec3 linear(vec3 color) {
    return color;
  }
  // https://www.cs.utah.edu/~reinhard/cdrom/
  vec3 reinhard(vec3 color) {
    return clamp(color / (vec3(1.0) + color), vec3(0.0), vec3(1.0));
  }
  // http://filmicworlds.com/blog/filmic-tonemapping-operators/
  #define uncharted2Helper(x) max(((x * (0.15 * x + 0.10 * 0.50) + 0.20 * 0.02) / (x * (0.15 * x + 0.50) + 0.20 * 0.30)) - 0.02 / 0.30, vec3(0.0))
  const vec3 uncharted2WhitePoint = 1.0 / uncharted2Helper(vec3(WHITE_POINT));
  vec3 uncharted2( vec3 color ) {
    // John Hable's filmic operator from Uncharted 2 video game
    return clamp(uncharted2Helper(color) * uncharted2WhitePoint, vec3(0.0), vec3(1.0));
  }
  // http://filmicworlds.com/blog/filmic-tonemapping-operators/
  vec3 cineon( vec3 color ) {
    // optimized filmic operator by Jim Hejl and Richard Burgess-Dawson
    color = max(vec3( 0.0 ), color - 0.004);
    return pow((color * (6.2 * color + 0.5)) / (color * (6.2 * color + 1.7) + 0.06), vec3(2.2));
  }
  // https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
  vec3 acesFilmic( vec3 color ) {
    return clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), vec3(0.0), vec3(1.0));
  }

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
      upscaledLight += weight * texelFetch(lightTex, texels[i], 0);
      sum += weight;
    }

    if (sum > 0.0) {
      upscaledLight /= sum;
    } else {
      upscaledLight = texture(lightTex, lightScale * coord);
    }

    return upscaledLight;
  }
  #endif

  void main() {
    #ifdef EDGE_PRESERVING_UPSCALE
      vec4 upscaledLight = getUpscaledLight(vCoord);
    #else
      vec4 upscaledLight = texture(lightTex, lightScale * vCoord);
    #endif

    // alpha channel stores the number of samples progressively rendered
    // divide the sum of light by alpha to obtain average contribution of light

    // in addition, alpha contains a scale factor for the shadow catcher material
    // dividing by alpha normalizes the brightness of the shadow catcher to match the background env map.
    vec3 light = upscaledLight.rgb / upscaledLight.a;

    light *= EXPOSURE;

    light = TONE_MAPPING(light);

    light = pow(light, vec3(1.0 / 2.2)); // gamma correction

    out_color = vec4(light, 1.0);
  }
`
}
