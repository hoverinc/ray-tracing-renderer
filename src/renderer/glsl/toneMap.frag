import textureLinear from './chunks/textureLinear.glsl';
import { renderTargetGet } from '../glslUtil.js';

export default function({ rayTracingRenderTargets, defines }) {
  return `#version 300 es

precision mediump float;
precision mediump int;

in vec2 vCoord;

out vec4 fragColor;

${renderTargetGet('image', rayTracingRenderTargets)}

${textureLinear(defines)}

// Tonemapping functions from THREE.js

vec3 linear(vec3 color) {
  return color;
}
// https://www.cs.utah.edu/~reinhard/cdrom/
vec3 reinhard(vec3 color) {
  return clamp(color / (vec3(1.0) + color), vec3(0.0), vec3(1.0));
}
// http://filmicworlds.com/blog/filmic-tonemapping-operators/
#define uncharted2Helper(x) max(((x * (0.15 * x + 0.10 * 0.50) + 0.20 * 0.02) / (x * (0.15 * x + 0.50) + 0.20 * 0.30)) - 0.02 / 0.30, vec3(0.0))
const vec3 uncharted2WhitePoint = 1.0 / uncharted2Helper(vec3(${defines.whitePoint}));
vec3 uncharted2( vec3 color ) {
  // John Hable's filmic operator from Uncharted 2 video game
  return clamp(uncharted2Helper(color) * uncharted2WhitePoint, vec3(0.0), vec3(1.0));
}
// http://filmicworlds.com/blog/filmic-tonemapping-operators/
vec3 cineon( vec3 color ) {
  // optimized filmic operator by Jim Hejl and Richard Burgess-Dawson
  color = max(vec3( 0.0 ), color - 0.004);
  return pow((color * (6.2 * color + 0.5)) / (color * (6.2 * color + 1.7) + 0.06), vec3(2.2));
}
// https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
vec3 acesFilmic( vec3 color ) {
  return clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), vec3(0.0), vec3(1.0));
}

void main() {
  vec4 tex = texture(image, vec3(vCoord, image_light));

  // alpha channel stores the number of samples progressively rendered
  // divide the sum of light by alpha to obtain average contribution of light

  // in addition, alpha contains a scale factor for the shadow catcher material
  // dividing by alpha normalizes the brightness of the shadow catcher to match the background envmap.
  vec3 light = tex.rgb / tex.a;
  // vec3 light = tex.rgb;

  light *= ${defines.exposure}; // exposure

  light = ${defines.toneMapping}(light); // tone mapping

  light = pow(light, vec3(1.0 / 2.2)); // gamma correction

  fragColor = vec4(light, 1.0);
}

`;
}
