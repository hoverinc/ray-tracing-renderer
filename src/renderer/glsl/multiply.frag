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
  // vec4 tex = textureLinear(image, vCoord);
  vec4 texA = texture(imageA, vCoord);
  vec4 texB = texture(imageB, vCoord);

  // vec3 light = texB.rgb / texB.a;

  // light *= ${defines.exposure}; // exposure

  // light = ${defines.toneMapping}(light); // tone mapping

  // vec3 light = 0.5 * tex.rgb + 0.5;

  // int id = floatBitsToInt(tex.b);
  // vec3 light = vec3(0.05 * float(id));

  // light = pow(light, vec3(1.0 / 2.2)); // gamma correction
  // alpha channel stores the number of samples progressively rendered
  // divide the sum of light by alpha to obtain average contribution of light

  // in addition, alpha contains a scale factor for the shadow catcher material
  // dividing by alpha normalizes the brightness of the shadow catcher to match the background envmap.

  // vec3 light = 0.5 * tex.rgb + 0.5;

  // int id = floatBitsToInt(tex.b);
  // vec3 light = vec3(0.05 * float(id));
  texA.rgb = pow(texA.rgb, vec3(1.0 / 2.2));
  vec3 light = texB.rgb;
  if (texA.a > 0.0) {
    light *= texA.rgb; 
  }
  light = pow(light, vec3(1.0 / 2.2));
  // vec3 light = texB.rgb;
  // light = pow(light, vec3(1.0 / 2.2)); // gamma correction

  fragColor = vec4(light, 1.0);
}

`;
}
