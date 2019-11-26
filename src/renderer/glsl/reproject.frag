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
  vec4 lightTex = texture(hdrBuffer, vec3(vCoord, hdrBuffer_light));

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

  for (int i = 0; i < 4; i++) {
    float histMeshId = texelFetch(historyBuffer, ivec3(texel[i], historyBuffer_position), 0).w;

    float isValid = histMeshId != currentMeshId ? 0.0 : 1.0;

    float weight = isValid * weights[i];
    history += weight * texelFetch(historyBuffer, ivec3(texel[i], historyBuffer_light), 0);
    sum += weight;
  }

  history /= sum > 0.0 ? sum : 1.0;

  if (history.w > 25.0) {
    history.xyz *= 25.0 / history.w;
    history.w = 25.0;
  }

  out_light = blendAmount * history + lightTex;
  out_position = positionTex;
}
  `;
}
