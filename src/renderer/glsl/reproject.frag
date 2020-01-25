export default {
outputs: ['light'],
source: `
  in vec2 vCoord;

  uniform mediump sampler2D light;
  uniform mediump sampler2D position;
  uniform vec2 lightScale;

  uniform mediump sampler2D previousLight;
  uniform mediump sampler2D previousPosition;

  uniform mat4 historyCamera;
  uniform float blendAmount;
  uniform vec2 jitter;

  vec4 getUpscaledLight(vec2 coord) {
    float meshId = texture(position, coord).w;

    vec2 sizef = lightScale * vec2(textureSize(position, 0));
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
      if (texture(position, pCoord).w == meshId) {
        float weight = weights[i];
        upscaledLight += weight * texelFetch(light, texels[i], 0);
        sum += weight;
      }
    }

    if (sum > 0.0) {
      upscaledLight /= sum;
    } else {
      upscaledLight = texture(light, lightScale * coord);
    }

    return upscaledLight;
  }

  vec2 reproject(vec3 position) {
    vec4 historyCoord = historyCamera * vec4(position, 1.0);
    return 0.5 * historyCoord.xy / historyCoord.w + 0.5;
  }

  void main() {
    vec2 scaledCoord = lightScale * vCoord;

    vec4 positionTex = texture(position, vCoord);

    vec3 currentPosition = positionTex.xyz;
    float currentMeshId = positionTex.w;

    vec4 upscaledLight = getUpscaledLight(vCoord);

    if (currentMeshId == 0.0) {
      out_light = upscaledLight;
      return;
    }

    vec2 hCoord = reproject(currentPosition) - jitter;

    vec2 hSizef = vec2(textureSize(position, 0));
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

    out_light = blendAmount * history + upscaledLight;
  }
`
}
