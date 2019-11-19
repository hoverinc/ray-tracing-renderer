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
  vec4 normalTex = texture(hdrBuffer, vec3(vCoord, hdrBuffer_normal));
  vec4 lightTex = texture(hdrBuffer, vec3(vCoord, hdrBuffer_light));

  vec3 position = positionTex.xyz;
  vec3 normal = normalTex.xyz;

  vec4 history;

  if (dot(position, position) > 0.0) {
    // vec2 hCoord = reproject(position) + historyJitter;
    vec2 hCoord = reproject(position) - jitter;

    ivec2 size = textureSize(historyBuffer, 0).xy;
    vec2 sizef = vec2(size);

    vec2 hTexelf = hCoord * sizef - 0.5;
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

    vec3 histPos[4];
    vec3 histNor[4];

    for (int i = 0; i < 4; i++) {
      ivec2 p = texel[i];
      histPos[i] = texelFetch(historyBuffer, ivec3(p, historyBuffer_position), 0).xyz;
      histNor[i] = texelFetch(historyBuffer, ivec3(p, historyBuffer_normal), 0).xyz;
    }

    float positionWidth = max(distance(histPos[1], histPos[0]), distance(histPos[2], histPos[0]));
    float normalWidth = max(distance(histNor[1], histNor[0]), distance(histNor[2], histNor[0]));

    float sum;
    for (int i = 0; i < 4; i++) {
      float positionError = distance(histPos[i], position) / (positionWidth + 0.05);

      float normalError = distance(histNor[i], normal) / (normalWidth + 0.05);

      // float isValid = positionError > 0.65 || normalError > 0.4 ? 0.0 : 1.0;
      // float isValid = normalError  > 0.4 ? 0.0 : 1.0;
      float isValid = positionError > 0.9 ? 0.0: 1.0;
      // float isValid = 1.0;

      float weight = isValid * weights[i];
      history += weight * texelFetch(historyBuffer, ivec3(texel[i], historyBuffer_light), 0);
      sum += weight;
    }

    if (sum > 0.0) {
      history /= sum;
    } else {
      history = vec4(0.0);
    }
  }

  out_light = blendAmount * history + lightTex;
  // out_light = mix(history, lightTex, 0.05);
  out_normal = normalTex;
  out_position = positionTex;
}

  `;
}
