import textureLinear from './chunks/textureLinear.glsl';

export default function({rayTracingRenderTargets, defines}) {
  return `#version 300 es

precision mediump float;
precision mediump int;

in vec2 vCoord;

${rayTracingRenderTargets.get('hdrBuffer')}
${rayTracingRenderTargets.set()}

uniform vec2 pixelSize; // 1 / screenResolution

// ${textureLinear(defines)}

void main() {
  // vec4 tex = textureLinear(image, vCoord);
  // float incX = pixelSize.x;
  // float decX = pixelSize.x;
  // float incY = pixelSize.y;
  // float decY = pixelSize.y;

  float incX = 1.0 / 1000.0;
  float decX = -incX;
  float incY = 1.0 / 600.0;
  float decY = -incY;

  float quarter = 0.25;
  float eigth = 0.125;
  float sixteenth = 0.0625;

  vec4 primaryLi = texture(hdrBuffer, vec3(vCoord, hdrBuffer_primaryLi));

  vec4 texA = texture(hdrBuffer, vec3(vCoord, hdrBuffer_secondaryLi)) * quarter;
  vec4 texB = texture(hdrBuffer, vec3(clamp(vCoord + vec2(incX, incY), vec2(0.0), vec2(1.0) ), hdrBuffer_secondaryLi)) * sixteenth;
  vec4 texC = texture(hdrBuffer, vec3(clamp(vCoord - vec2(decX, decY), vec2(0.0), vec2(1.0) ), hdrBuffer_secondaryLi)) * sixteenth;  
  vec4 texD = texture(hdrBuffer, vec3(clamp(vCoord - vec2(decX, incY), vec2(0.0), vec2(1.0) ), hdrBuffer_secondaryLi)) * sixteenth;  
  vec4 texE = texture(hdrBuffer, vec3(clamp(vCoord - vec2(incX, decY), vec2(0.0), vec2(1.0) ), hdrBuffer_secondaryLi)) * sixteenth;
  vec4 texF = texture(hdrBuffer, vec3(clamp(vCoord - vec2(0, decY), vec2(0.0), vec2(1.0) ), hdrBuffer_secondaryLi)) * eigth;
  vec4 texG = texture(hdrBuffer, vec3(clamp(vCoord - vec2(incX, 0), vec2(0.0), vec2(1.0) ), hdrBuffer_secondaryLi)) * eigth;
  vec4 texH = texture(hdrBuffer, vec3(clamp(vCoord - vec2(0, incY), vec2(0.0), vec2(1.0) ), hdrBuffer_secondaryLi)) * eigth;
  vec4 texI = texture(hdrBuffer, vec3(clamp(vCoord - vec2(decX, 0), vec2(0.0), vec2(1.0) ), hdrBuffer_secondaryLi)) * eigth;

  vec4 secondaryLight = (texA + texB + texC + texD + texE + texF + texG + texH + texI);

  texA = texture(hdrBuffer, vec3(vCoord, hdrBuffer_primaryLi)) * quarter;
  texB = texture(hdrBuffer, vec3(clamp(vCoord + vec2(incX, incY), vec2(0.0), vec2(1.0) ), hdrBuffer_primaryLi)) * sixteenth;
  texC = texture(hdrBuffer, vec3(clamp(vCoord - vec2(decX, decY), vec2(0.0), vec2(1.0) ), hdrBuffer_primaryLi)) * sixteenth;  
  texD = texture(hdrBuffer, vec3(clamp(vCoord - vec2(decX, incY), vec2(0.0), vec2(1.0) ), hdrBuffer_primaryLi)) * sixteenth;  
  texE = texture(hdrBuffer, vec3(clamp(vCoord - vec2(incX, decY), vec2(0.0), vec2(1.0) ), hdrBuffer_primaryLi)) * sixteenth;
  texF = texture(hdrBuffer, vec3(clamp(vCoord - vec2(0, decY), vec2(0.0), vec2(1.0) ), hdrBuffer_primaryLi)) * eigth;
  texG = texture(hdrBuffer, vec3(clamp(vCoord - vec2(incX, 0), vec2(0.0), vec2(1.0) ), hdrBuffer_primaryLi)) * eigth;
  texH = texture(hdrBuffer, vec3(clamp(vCoord - vec2(0, incY), vec2(0.0), vec2(1.0) ), hdrBuffer_primaryLi)) * eigth;
  texI = texture(hdrBuffer, vec3(clamp(vCoord - vec2(decX, 0), vec2(0.0), vec2(1.0) ), hdrBuffer_primaryLi)) * eigth;

  vec4 primaryLight = (texA + texB + texC + texD + texE + texF + texG + texH + texI);
  // if (light.a > 0.0) {
  //   light.rgb /= light.a;
  // }
  out_blur = secondaryLight;
  // out_blur = vec4(1.0);
  out_primaryLi = primaryLight;
  out_secondaryLi = secondaryLight;
}

`;
}
