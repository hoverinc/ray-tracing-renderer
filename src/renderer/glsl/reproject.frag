export default function({ rayTracingRenderTargets, defines }) {
  return `#version 300 es

precision mediump float;
precision mediump int;

in vec2 vCoord;

${rayTracingRenderTargets.get('historyBuffer')}
${rayTracingRenderTargets.get('hdrBuffer')}
${rayTracingRenderTargets.set()}

uniform mat4 historyCameraInv;
uniform mat4 historyCameraProj;
uniform float amount;

vec4 getHistory(ivec2 hTexel, ivec2 size, vec3 position, vec3 normal) {
  vec3 historyNormal = texelFetch(historyBuffer, ivec3(hTexel, historyBuffer_normal), 0).xyz;

  vec3 d = historyNormal - normal;
  float error = abs(dot(d, d));

  bool invalid = error > 0.001 || any(lessThan(hTexel, ivec2(0))) || any(greaterThan(hTexel, size));

  if (invalid) {
    return vec4(-1.0);
  } else {
    return texelFetch(historyBuffer, ivec3(hTexel, historyBuffer_light), 0);
  }
}

void main() {
  vec4 positionTex =  texture(hdrBuffer, vec3(vCoord, hdrBuffer_position));
  vec4 normalTex = texture(hdrBuffer, vec3(vCoord, hdrBuffer_normal));
  vec4 lightTex = texture(hdrBuffer, vec3(vCoord, hdrBuffer_light));

  vec3 position = positionTex.xyz;
  float hit = positionTex.w;
  vec3 normal = normalTex.xyz;

  vec4 history;

  if (hit > 0.0) {
    vec4 historyCoord = (historyCameraProj * historyCameraInv * vec4(position, 1.0));
    vec2 hCoord = 0.5 * historyCoord.xy / historyCoord.w + 0.5;

    ivec2 size = textureSize(historyBuffer, 0).xy;
    vec2 sizef = vec2(size);

    vec2 hTexelf = hCoord * sizef - 0.5;
    vec2 f = fract(hTexelf);
    ivec2 hTexel = ivec2(hTexelf);

    vec4 s0 = getHistory(hTexel + ivec2(0, 0), size, position, normal);
    vec4 s1 = getHistory(hTexel + ivec2(1, 0), size, position, normal);
    vec4 s2 = getHistory(hTexel + ivec2(0, 1), size, position, normal);
    vec4 s3 = getHistory(hTexel + ivec2(1, 1), size, position, normal);

    float sum;
    float w;

    // bilinear filtering. reject invalid history and redistribute weight
    if (s0.a != -1.0) {
      w = (1.0 - f.x) * (1.0 - f.y);
      history += s0 * w;
      sum += w;
    }
    if (s1.a != -1.0) {
      w = f.x * (1.0 - f.y);
      history += s1 * w;
      sum += w;
    }
    if (s2.a != -1.0) {
      w = (1.0 - f.x) * f.y;
      history +=  s2 * w;
      sum += w;
    }
    if (s3.a != -1.0) {
      w = f.x * f.y;
      history += s3 * w;
      sum += w;
    }

    if (sum > 0.0) {
      history /= sum;
    } else {
      history = vec4(0.0);
    }
  }

  out_light = amount * history + lightTex;
  out_normal = normalTex;
  out_position = positionTex;
}

  `;
}
