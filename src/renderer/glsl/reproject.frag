export default function({ rayTracingRenderTargets, defines }) {
  return `#version 300 es

precision mediump float;
precision mediump int;

in vec2 vCoord;

${rayTracingRenderTargets.get('historyBuffer')}
${rayTracingRenderTargets.get('hdrBuffer')}
${rayTracingRenderTargets.set()}

uniform mat4 historyCamera;
uniform float blendAmount;
uniform vec2 jitter;

vec2 reproject(vec3 position) {
  vec4 historyCoord = historyCamera * vec4(position, 1.0);
  return 0.5 * historyCoord.xy / historyCoord.w + 0.5;
}

void main() {
  vec4 positionTex = texture(hdrBuffer, vec3(vCoord, hdrBuffer_position));
  vec4 normalAndMeshIdTex = texture(hdrBuffer, vec3(vCoord, hdrBuffer_normalAndMeshId));
  vec4 lightTex = texture(hdrBuffer, vec3(vCoord, hdrBuffer_light));

  vec3 position = positionTex.xyz;
  vec3 normal = normalAndMeshIdTex.xyz;
  float meshId = normalAndMeshIdTex.w;

  vec4 history;

  vec2 hCoord = reproject(position) - jitter;

  ivec2 size = textureSize(historyBuffer, 0).xy;
  vec2 sizef = vec2(size);

  vec2 hTexelf = hCoord * sizef - 0.5;
  ivec2 hTexel = ivec2(hTexelf);
  vec2 f = fract(hTexelf);

  float sum;

  const ivec2 bilinearOffsets[] = ivec2[](
    ivec2(0, 0),
    ivec2(1, 0),
    ivec2(0, 1),
    ivec2(1, 1)
  );

  float weights[] = float[](
    (1.0 - f.x) * (1.0 - f.y),
    f.x * (1.0 - f.y),
    (1.0 - f.x) * f.y,
    f.x * f.y
  );

  float positionWidth = max(length(dFdx(position)), length(dFdy(position)));
  float normalWidth = max(length(dFdx(normal)), length(dFdy(normal)));

  for (int i = 0; i < 4; i++) {
    ivec2 texel = hTexel + bilinearOffsets[i];

    vec4 histNormalAndMeshId = texelFetch(historyBuffer, ivec3(texel, historyBuffer_normalAndMeshId), 0);

    vec3 histNormal = histNormalAndMeshId.xyz;
    float histMeshId = histNormalAndMeshId.w;

    vec3 histPosition = texelFetch(historyBuffer, ivec3(texel, historyBuffer_position), 0).xyz;

    float positionError = distance(histPosition, position) / (positionWidth + 0.005);
    float normalError = distance(histNormal, normal) / (normalWidth + 0.005);

    float isValid = histMeshId != meshId  || positionError > 1.0 || normalError > 1.0 ? 0.0 : 1.0;
    // float isValid = normalError  > 1.0 ? 0.0 : 1.0;
    // float isValid = positionError > 1.0 ? 0.0: 1.0;
    // float isValid = histMeshId != meshId ? 0.0 : 1.0;
    // float isValid = 1.0;

    float weight = isValid * weights[i];
    history += weight * texelFetch(historyBuffer, ivec3(texel, historyBuffer_light), 0);
    sum += weight;
  }

  if (sum > 0.0) {
    history = history / sum;
  } else {
    hTexel = ivec2(hTexelf + 0.5);

    for (int x = -1; x <= 1; x++) {
      for (int y = -1; y <= 1; y++) {
        ivec2 texel = hTexel + ivec2(x, y);

        vec4 histNormalAndMeshId = texelFetch(historyBuffer, ivec3(texel, historyBuffer_normalAndMeshId), 0);

        vec3 histNormal = histNormalAndMeshId.xyz;
        float histMeshId = histNormalAndMeshId.w;

        vec3 histPosition = texelFetch(historyBuffer, ivec3(texel, historyBuffer_position), 0).xyz;

        float positionError = distance(histPosition, position) / (positionWidth + 0.005);
        float normalError = distance(histNormal, normal) / (normalWidth + 0.005);

        float isValid = histMeshId != meshId  || positionError > 1.0 || normalError > 1.0 ? 0.0 : 1.0;
        // float isValid = histMeshId != meshId ? 0.0 : 1.0;
        // float isValid = positionError > 0.7 ? 0.0: 1.0;
        // float isValid = normalError > 0.7 ? 0.0 : 1.0;


        float weight = isValid;
        vec4 h = texelFetch(historyBuffer, ivec3(texel, historyBuffer_light), 0);
        history += weight * h;
        sum += weight;
      }
    }
    history = sum > 0.0 ? history / sum : history;
  }
  if (history.w > 25.0) {
    history.xyz *= 25.0 / history.w;
    history.w = 25.0;
  }

  out_light = blendAmount * history + lightTex;
  // out_light = mix(lightTex, history, blendAmount);
  out_normalAndMeshId = normalAndMeshIdTex;
  out_position = positionTex;
}

  `;
}
