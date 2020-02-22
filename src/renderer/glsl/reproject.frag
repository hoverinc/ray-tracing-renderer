import textureLinear from './chunks/textureLinear.glsl';

export default {
outputs: ['light'],
includes: [textureLinear],
source: `
  in vec2 vCoord;

  uniform mediump sampler2D light;
    uniform vec2 lightScale;

  uniform mediump sampler2D position;
  uniform mediump sampler2D normal;

  uniform mediump sampler2D previousLight;
  uniform vec2 previousLightScale;

  uniform mediump sampler2D previousPosition;
  uniform mediump sampler2D previousNormal;

  uniform mat4 historyCamera;
  uniform float blendAmount;
  uniform vec2 jitter;

  vec2 reproject(vec3 position) {
    vec4 historyCoord = historyCamera * vec4(position, 1.0);
    return 0.5 * historyCoord.xy / historyCoord.w + 0.5;
  }

  float getMeshId(sampler2D meshIdTex, vec2 vCoord) {
    return floor(texture(meshIdTex, vCoord).w);
  }

  void main() {
    vec3 pos = textureLinear(position, vCoord).xyz;
    float posDiff = texture(position, vCoord).w;

    vec3 norm = normalize(textureLinear(normal, vCoord).xyz);
    float normDiff = texture(normal, vCoord).w;

    // float currentMeshId = getMeshId(position, vCoord);

    vec4 currentLight = texture(light, lightScale * vCoord);

    if (posDiff == 0.0) {
      out_light = currentLight;
      return;
    }

    vec2 hCoord = reproject(pos) - jitter;

    vec2 hSizef = previousLightScale * vec2(textureSize(previousLight, 0));
    vec2 hSizeInv = 1.0 / hSizef;
    ivec2 hSize = ivec2(hSizef);

    vec2 hTexelf = hCoord * hSizef - 0.5;
    ivec2 hTexel = ivec2(hTexelf);
    vec2 f = fract(hTexelf);

    ivec2 texel[] = ivec2[](
      hTexel + ivec2(0, 0),
      hTexel + ivec2(1, 0),
      hTexel + ivec2(0, 1),
      hTexel + ivec2(1, 1)
    );

    float weights[] = float[](
      (1.0 - f.x) * (1.0 - f.y),
      f.x * (1.0 - f.y),
      (1.0 - f.x) * f.y,
      f.x * f.y
    );

    vec4 history;
    float sum;

    // bilinear sampling, rejecting samples that don't have a matching mesh id
    for (int i = 0; i < 4; i++) {
      vec2 gCoord = (vec2(texel[i]) + 0.5) * hSizeInv;

      // float histMeshId = getMeshId(previousPosition, gCoord);
      vec3 prevPos = textureLinear(previousPosition, gCoord).xyz;

      vec3 prevNorm = normalize(textureLinear(previousNormal, gCoord).xyz);

      float isValid =
        distance(prevPos, pos) / (posDiff + 0.001) > 1.0 ||
        // distance(prevNorm, norm) / (normDiff + 0.001) > 25.0 ||
        any(greaterThanEqual(texel[i], hSize)) ? 0.0 : 1.0;

      float weight = isValid * weights[i];
      history += weight * texelFetch(previousLight, texel[i], 0);
      sum += weight;
    }

    if (sum > 0.0) {
      history /= sum;
    } else {
      // If all samples of bilinear fail, try a 3x3 box filter
      // hTexel = ivec2(hTexelf + 0.5);

      // for (int x = -1; x <= 1; x++) {
      //   for (int y = -1; y <= 1; y++) {
      //     ivec2 texel = hTexel + ivec2(x, y);
      //     vec2 gCoord = (vec2(texel) + 0.5) * hSizeInv;

      //     // float histMeshId = getMeshId(previousPosition, gCoord);
      //     vec3 prevPos = textureLinear(previousPosition, gCoord).xyz;

      //     vec3 prevNorm = normalize(textureLinear(previousNormal, gCoord).xyz);

      //     float isValid =
      //       distance(prevNorm, norm) / (normDiff + 0.01) > 1.0 ||
      //      any(greaterThanEqual(texel, hSize)) ? 0.0 : 1.0;

      //     float weight = isValid;
      //     vec4 h = texelFetch(previousLight, texel, 0);
      //     history += weight * h;
      //     sum += weight;
      //   }
      // }
      // history = sum > 0.0 ? history / sum : history;
    }

    if (history.w > MAX_SAMPLES) {
      history.xyz *= MAX_SAMPLES / history.w;
      history.w = MAX_SAMPLES;
    }

    out_light = blendAmount * history + currentLight;
  }
`
}
