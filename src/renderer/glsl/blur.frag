import textureLinear from './chunks/textureLinear.glsl';

export default function(defines) {
  return `#version 300 es

precision mediump float;
precision mediump int;

in vec2 vCoord;

out vec4 fragColor;

uniform sampler2D image;
uniform vec2 pixelSize; // 1 / screenResolution

// ${textureLinear(defines)}

void main() {
  // vec4 tex = textureLinear(image, vCoord);
  // float incX = pixelSize.x;
  // float decX = pixelSize.x;
  // float incY = pixelSize.y;
  // float decY = pixelSize.y;

  float incX = 1.0 / 800.0;
  float decX = -incX;
  float incY = 1.0 / 500.0;
  float decY = -incY;

  float inc = 1.0 / 1000.0;
  float dec = -inc;

  float quarter = 0.25;
  float eigth = 0.125;
  float sixteenth = 0.0625;

  vec4 texA = texture(image, vCoord) * quarter;
  vec4 texB = texture(image, clamp(vCoord + vec2(incX, incY), vec2(0.0), vec2(1.0) )) * sixteenth;
  vec4 texC = texture(image, clamp(vCoord - vec2(decX, decY), vec2(0.0), vec2(1.0) )) * sixteenth;  
  vec4 texD = texture(image, clamp(vCoord - vec2(decX, incY), vec2(0.0), vec2(1.0) )) * sixteenth;  
  vec4 texE = texture(image, clamp(vCoord - vec2(incX, decY), vec2(0.0), vec2(1.0) )) * sixteenth;
  vec4 texF = texture(image, clamp(vCoord - vec2(0, decY), vec2(0.0), vec2(1.0) )) * eigth;
  vec4 texG = texture(image, clamp(vCoord - vec2(incX, 0), vec2(0.0), vec2(1.0) )) * eigth;
  vec4 texH = texture(image, clamp(vCoord - vec2(0, incY), vec2(0.0), vec2(1.0) )) * eigth;
  vec4 texI = texture(image, clamp(vCoord - vec2(decX, 0), vec2(0.0), vec2(1.0) )) * eigth;

  vec4 light = (texA + texB + texC + texD + texE + texF + texG + texH + texI);

  fragColor = vec4(light);
}

`;
}
