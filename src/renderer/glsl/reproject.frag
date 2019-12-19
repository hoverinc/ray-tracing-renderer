export default {
outputs: ['light', 'position'],
source: `
  in vec2 vCoord;

  uniform mediump sampler2DArray hdrBuffer;
  uniform mediump sampler2DArray historyBuffer;

  uniform mat4 historyCamera;
  uniform float blendAmount;
  uniform vec2 jitter;

  vec2 reproject(vec3 position) {
    vec4 historyCoord = historyCamera * vec4(position, 1.0);
    return 0.5 * historyCoord.xy / historyCoord.w + 0.5;
  }

  void main() {
    vec4 positionTex = texture(hdrBuffer, vec3(vCoord, 1));
    vec4 lightTex = texture(hdrBuffer, vec3(vCoord, 0));

    vec3 currentPosition = positionTex.xyz;
    float currentMeshId = positionTex.w;

    vec2 hCoord = reproject(currentPosition) - jitter;

    ivec2 hSize = textureSize(historyBuffer, 0).xy;
    vec2 hSizef = vec2(hSize);

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
      float histMeshId = texelFetch(historyBuffer, ivec3(texel[i], 1), 0).w;

      float isValid = histMeshId != currentMeshId ? 0.0 : 1.0;

      float weight = isValid * weights[i];
      history += weight * texelFetch(historyBuffer, ivec3(texel[i], 0), 0);
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

          float histMeshId = texelFetch(historyBuffer, ivec3(texel, 1), 0).w;

          float isValid = histMeshId != currentMeshId ? 0.0 : 1.0;

          float weight = isValid;
          vec4 h = texelFetch(historyBuffer, ivec3(texel, 0), 0);
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
    out_position = positionTex;
  }
`
}
