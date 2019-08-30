// Random number generation as described by
// http://www.reedbeta.com/blog/quick-and-easy-gpu-random-numbers-in-d3d11/

export default function(params) {
  return `

uniform sampler2D noise;
uniform float dimension[SAMPLING_DIMENSIONS];
uniform float strataSize;

int dimensionIndex = 0;

const highp float maxUint = 1.0 / 4294967295.0;
float pixelSeed;
highp uint randState;

uint xorshift(uint x) {
  x ^= x << 13u;
  x ^= x >> 17u;
  x ^= x << 5u;
  return x;
}

void initRandom() {
  randState = xorshift(xorshift(floatBitsToUint(vCoord.x)) * xorshift(floatBitsToUint(vCoord.y)));
  vec2 size = vec2(textureSize(noise, 0));
  pixelSeed = texture(noise, vCoord / (pixelSize * size)).r;
  // pixelSeed = texture(noise, vCoord).r;
}

float randomSample() {
  // randState = xorshift(floatBitsToUint(pixelSeed));
  // pixelSeed = float(randState) * maxUint;

  float strata = dimension[dimensionIndex++];
  // float random = fract((floor(strata) + fract(pixelSeed + strata)) * strataSize);
  float random = fract((strata + pixelSeed) * strataSize);
  // float random = float(randState) * maxUint;

  // float random = pixelSeed;

  // transform random number between [0, 1] to (0, 1)
  return EPS + (1.0 - 2.0 * EPS) * random;
}

vec2 randomSampleVec2() {
  return vec2(randomSample(), randomSample());
}
`;
};
