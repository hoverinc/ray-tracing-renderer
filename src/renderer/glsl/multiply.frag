import textureLinear from './chunks/textureLinear.glsl';

export default function(defines) {
  return `#version 300 es

precision mediump float;
precision mediump int;

in vec2 vCoord;

out vec4 fragColor;

uniform sampler2D imageA;
uniform sampler2D imageB;

// ${textureLinear(defines)}

void main() {
  vec4 texA = texture(imageA, vCoord);
  vec4 texB = texture(imageB, vCoord);

  vec3 light = texB.rgb;

  // alpha channel stores the number of samples progressively rendered
  // divide the sum of light by alpha to obtain average contribution of light

  // in addition, alpha contains a scale factor for the shadow catcher material
  // dividing by alpha normalizes the brightness of the shadow catcher to match the background envmap.
  light /= texB.a;

  if (texA.a > 0.0) {
    light *= texA.rgb;
  }

  fragColor = vec4(light, texB.a);
}

`;
}
