import textureLinear from './chunks/textureLinear.glsl';

export default function({ gBufferRenderTargets, rayTracingRenderTargets, defines }) {
  return `#version 300 es

precision mediump float;
precision mediump int;

in vec2 vCoord;

${gBufferRenderTargets.get('gBuffer')}
${rayTracingRenderTargets.get('hdrBuffer')}
${rayTracingRenderTargets.set()}

// ${textureLinear(defines)}

void main() {
  // vec4 albedoTexture = texture(gBuffer, vec3(vCoord, gBuffer_albedo));
  vec4 lightTexture = texture(hdrBuffer, vec3(vCoord, hdrBuffer_primaryLi));
  vec4 secondaryLightTexture = texture(hdrBuffer, vec3(vCoord, hdrBuffer_secondaryLi));
  vec4 albedoTexture = texture(hdrBuffer, vec3(vCoord, hdrBuffer_albedo));

  vec3 light = lightTexture.rgb;
  vec3 secondaryLight = secondaryLightTexture.rgb;

  // alpha channel stores the number of samples progressively rendered
  // divide the sum of light by alpha to obtain average contribution of light

  // in addition, alpha contains a scale factor for the shadow catcher material
  // dividing by alpha normalizes the brightness of the shadow catcher to match the background envmap.
  light /= lightTexture.a;
  if (length(secondaryLight) > 0.0) {
    secondaryLight /= secondaryLightTexture.a;
  }

  vec3 albedo = albedoTexture.rgb;
  albedo.rgb /= albedoTexture.a;

  if (albedoTexture.a > 0.0) {
    light *= albedo;
  }
  light += secondaryLight;

  out_blend = vec4(light, lightTexture.a);
  // out_blend = vec4(normalTex.rgb / normalTex.a, 1.0);
  // out_blend = vec4(albedo * light, 1.0);  
  // out_blend = vec4(secondaryLight, lightTexture.a);
  // out_blend = vec4(albedo, lightTexture.a);
}

`;
}
