import textureLinear from './chunks/textureLinear.glsl';

export default {
outputs: ['light'],
includes: [textureLinear],
source: `
  in vec2 vCoord;

  uniform mediump sampler2D lightTex;
  uniform mediump sampler2D positionTex;
  uniform vec2 lightScale;
  uniform vec2 previousLightScale;

  uniform mediump sampler2D previousLightTex;
  uniform mediump sampler2D previousPositionTex;

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
    vec3 currentPosition = textureLinear(positionTex, vCoord).xyz;
    float currentMeshId = getMeshId(positionTex, vCoord);

    vec4 currentLight = texture(lightTex, lightScale * vCoord);

    if (currentMeshId == 0.0) {
      out_light = currentLight;
      return;
    }

    vec2 hCoord = reproject(currentPosition) - jitter;

    vec2 hSizef = previousLightScale * vec2(textureSize(previousLightTex, 0));
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

      float histMeshId = getMeshId(previousPositionTex, gCoord);

      float isValid = histMeshId != currentMeshId || any(greaterThanEqual(texel[i], hSize)) ? 0.0 : 1.0;

      float weight = isValid * weights[i];
      history += weight * texelFetch(previousLightTex, texel[i], 0);
      sum += weight;
    }

    if (sum > 0.0) {
      history /= sum;
    } else {
      // If all samples of bilinear fail, try a 3x3 box filter
      hTexel = ivec2(hTexelf + 0.5);

      for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
          ivec2 texel = hTexel + ivec2(x, y);
          vec2 gCoord = (vec2(texel) + 0.5) * hSizeInv;

          float histMeshId = getMeshId(previousPositionTex, gCoord);

          float isValid = histMeshId != currentMeshId || any(greaterThanEqual(texel, hSize)) ? 0.0 : 1.0;

          float weight = isValid;
          vec4 h = texelFetch(previousLightTex, texel, 0);
          history += weight * h;
          sum += weight;
        }
      }
      history = sum > 0.0 ? history / sum : history;
    }

    if (history.w > MAX_SAMPLES) {
      history.xyz *= MAX_SAMPLES / history.w;
      history.w = MAX_SAMPLES;
    }

    out_light = blendAmount * history + currentLight;
  }
`
}
