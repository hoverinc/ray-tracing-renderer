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

float relativeError(float v, float vApprox) {
  return abs((v - vApprox) / v);
}

vec4 getHistory(ivec2 hTexel, float positionWidth, float normalWidth, vec3 historyPosition, vec3 historyNormal, vec3 position, vec3 normal, out float contrib) {
  // float error = relativeError(distance(historyPositionLerp, historyPosition), distance(position, historyPosition));
  float error = distance(historyPosition, position) / (positionWidth + 0.035);

  // float normalError = distance(historyNormal, normal) * (normalWidth);
  float normalError = distance(historyNormal, normal) * positionWidth;


  contrib = error > 0.5 || normalError > 0.05 ? 0.0 : 1.0;
  // contrib = normalError > 0.05 ? 0.0 : 1.0;
  // contrib = error > 0.5 ? 0.0: 1.0;

  return texelFetch(historyBuffer, ivec3(hTexel, historyBuffer_light), 0);
}

vec2 reproject(vec3 position) {
  vec4 historyCoord = (historyCameraProj * historyCameraInv * vec4(position, 1.0));
  return 0.5 * historyCoord.xy / historyCoord.w + 0.5;
}

void main() {
  vec4 positionTex =  texture(hdrBuffer, vec3(vCoord, hdrBuffer_position));
  vec4 normalTex = texture(hdrBuffer, vec3(vCoord, hdrBuffer_normal));
  vec4 lightTex = texture(hdrBuffer, vec3(vCoord, hdrBuffer_light));

  vec3 position = positionTex.xyz;
  vec3 normal = normalTex.xyz;

  vec4 history;

  if (dot(position, position) > 0.0) {
    vec2 hCoord = reproject(position);

    ivec2 size = textureSize(historyBuffer, 0).xy;
    vec2 sizef = vec2(size);

    vec2 hTexelf = hCoord * sizef - 0.5;
    ivec2 hTexel = ivec2(hTexelf);
    vec2 f = fract(hTexelf);

    ivec2 t0 = hTexel + ivec2(0, 0);
    ivec2 t1 = hTexel + ivec2(1, 0);
    ivec2 t2 = hTexel + ivec2(0, 1);
    ivec2 t3 = hTexel + ivec2(1, 1);

    vec3 p0 = texelFetch(historyBuffer, ivec3(t0, historyBuffer_position), 0).xyz;
    vec3 p1 = texelFetch(historyBuffer, ivec3(t1, historyBuffer_position), 0).xyz;
    vec3 p2 = texelFetch(historyBuffer, ivec3(t2, historyBuffer_position), 0).xyz;
    vec3 p3 = texelFetch(historyBuffer, ivec3(t3, historyBuffer_position), 0).xyz;

    float positionWidth = max(distance(p1, p0), distance(p2, p0));
    // float positionWidth = max(length(dFdx(position)), length(dFdy(position)));

    vec3 n0 = texelFetch(historyBuffer, ivec3(t0, historyBuffer_normal), 0).xyz;
    vec3 n1 = texelFetch(historyBuffer, ivec3(t1, historyBuffer_normal), 0).xyz;
    vec3 n2 = texelFetch(historyBuffer, ivec3(t2, historyBuffer_normal), 0).xyz;
    vec3 n3 = texelFetch(historyBuffer, ivec3(t3, historyBuffer_normal), 0).xyz;

    float normalWidth = max(distance(n1, n0), distance(n2, n0));

    float sum;
    float weight;
    vec4 reprojection;
    float contrib;

    // bilinear filtering. reject invalid history and redistribute weight
    reprojection = getHistory(t0, positionWidth, normalWidth, p0, n0, position, normal, contrib);
    weight = contrib * (1.0 - f.x) * (1.0 - f.y);
    history += reprojection * weight;
    sum += weight;

    reprojection = getHistory(t1, positionWidth, normalWidth, p1, n1, position, normal, contrib);
    weight = contrib * f.x * (1.0 - f.y);
    history += reprojection * weight;
    sum += weight;

    reprojection = getHistory(t2, positionWidth, normalWidth, p2, n2, position, normal, contrib);
    weight = contrib * (1.0 - f.x) * f.y;
    history += reprojection * weight;
    sum += weight;

    reprojection = getHistory(t3, positionWidth, normalWidth, p3, n3, position, normal, contrib);
    weight = contrib * f.x * f.y;
    history += reprojection * weight;
    sum += weight;

    if (sum > 0.0) {
      history /= sum;
    } else {
      history = vec4(0.0);
    }

  }

  out_light = amount * amount * history + lightTex;
  out_normal = normalTex;
  out_position = positionTex;
}

  `;
}
