export default {
outputs: ['light'],
source: `
  in vec2 vCoord;

  uniform mediump sampler2D light;
  uniform mediump sampler2D position;
  uniform vec2 textureScale;

  uniform mediump sampler2D previousLight;
  uniform mediump sampler2D previousPosition;
  uniform vec2 previousTextureScale;

  uniform mat4 historyCamera;
  uniform float blendAmount;
  uniform vec2 jitter;

  vec2 reproject(vec3 position) {
    vec4 historyCoord = historyCamera * vec4(position, 1.0);
    return 0.5 * historyCoord.xy / historyCoord.w + 0.5;
  }

  void main() {
    vec2 scaledCoord = textureScale * vCoord;

    vec4 positionTex = texture(position, scaledCoord);
    vec4 lightTex = texture(light, scaledCoord);

    vec3 currentPosition = positionTex.xyz;
    float currentMeshId = positionTex.w;

    vec2 hCoord = reproject(currentPosition) - jitter;

    vec2 hSizef = previousTextureScale * vec2(textureSize(previousPosition, 0));
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
      float histMeshId = texelFetch(previousPosition, texel[i], 0).w;

      float isValid = histMeshId != currentMeshId || any(greaterThanEqual(texel[i], hSize)) ? 0.0 : 1.0;
      // float isValid = 0.0;

      float weight = isValid * weights[i];
      history += weight * texelFetch(previousLight, texel[i], 0);
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

          float histMeshId = texelFetch(previousPosition, texel, 0).w;

          float isValid = histMeshId != currentMeshId || any(greaterThanEqual(texel, hSize)) ? 0.0 : 1.0;

          float weight = isValid;
          vec4 h = texelFetch(previousLight, texel, 0);
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

    out_light = blendAmount * history + lightTex;

  }
`
}
