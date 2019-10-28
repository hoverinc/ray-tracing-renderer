import { renderTargetGet, renderTargetSet } from '../glslUtil.js';

export default function({ rayTracingRenderTargets, defines }) {
  return `#version 300 es

precision mediump float;
precision mediump int;

in vec2 vCoord;

${renderTargetGet('historyBuffer', rayTracingRenderTargets)}
${renderTargetGet('hdrBuffer', rayTracingRenderTargets)}
${renderTargetSet(rayTracingRenderTargets)}

uniform mat4 historyCameraInv;
uniform mat4 historyCameraProj;
uniform float sampleCount;

void main() {
  out_light = texture(historyBuffer, vec3(vCoord, historyBuffer_light)) + texture(hdrBuffer, vec3(vCoord, hdrBuffer_light));
}

  `;
}

//  vec4 reproject(SurfaceInteraction si, ivec2 hTexel, ivec2 size) {
//   vec3 historyNormal = texelFetch(historyBuffer, ivec3(hTexel, historyBuffer_normal), 0).xyz;

//   vec3 d = historyNormal - si.normal;
//   float error = abs(dot(d, d));

//   bool invalid = error > 0.001 || any(lessThan(hTexel, ivec2(0))) || any(greaterThan(hTexel, size));

//   if (invalid) {
//     return vec4(-1.0);
//   } else {
//     return texelFetch(historyBuffer, ivec3(hTexel, historyBuffer_light), 0);
//   }
// }


//  if (si.hit) {
//     vec4 historyCoord = (historyCameraProj * historyCameraInv * vec4(si.position, 1.0));
//     vec2 hCoord = 0.5 * historyCoord.xy / historyCoord.w + 0.5;

//     ivec2 size = textureSize(historyBuffer, 0).xy;
//     vec2 sizef = vec2(size);

//     vec2 hTexelf = hCoord * sizef - 0.5;
//     vec2 f = fract(hTexelf);
//     ivec2 hTexel = ivec2(hTexelf);

//     vec4 s0 = reproject(si, hTexel + ivec2(0, 0), size);
//     vec4 s1 = reproject(si, hTexel + ivec2(1, 0), size);
//     vec4 s2 = reproject(si, hTexel + ivec2(0, 1), size);
//     vec4 s3 = reproject(si, hTexel + ivec2(1, 1), size);

//     vec4 s;
//     float sum = 0.0;
//     float w;

//     if (s0.a != -1.0) {
//       w = (1.0 - f.x) * (1.0 - f.y);
//       s += s0 * w;
//       sum += w;
//     }
//     if (s1.a != -1.0) {
//       w = f.x * (1.0 - f.y);
//       s += s1 * w;
//       sum += w;
//     }
//     if (s2.a != -1.0) {
//       w = (1.0 - f.x) * f.y;
//       s +=  s2 * w;
//       sum += w;
//     }
//     if (s3.a != -1.0) {
//       w = f.x * f.y;
//       s += s3 * w;
//       sum += w;
//     }

//     if (sum > 0.0) {
//       s /= sum;

//       // if (sampleCount < 100.0) {
//         float contrib = 1.0 / (1.0 + sampleCount);
//         out_light = contrib * liAndAlpha + (1.0 - contrib) * s;
//       // } else {
//       //   out_light = ((sampleCount - 1.0) * s + liAndAlpha) / sampleCount;
//       // }
//       // float contrib = 0.05;
//       // out_light = contrib * liAndAlpha + (1.0 - contrib) * s;
//       // out_light = 0.98 * s + liAndAlpha;

//     } else {
//       out_light = liAndAlpha;
//       // out_light = vec4(0, 0, 0, 1);
//     }
//   } else {
//     out_light = liAndAlpha;
//   }
