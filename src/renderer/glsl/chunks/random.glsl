// Random number generation as described by
// http://www.reedbeta.com/blog/quick-and-easy-gpu-random-numbers-in-d3d11/

export default function(params) {
  return `

uniform float dimension[SAMPLING_DIMENSIONS];
int dimensionIndex = 0;

const highp float maxUint = 1.0 / 4294967295.0;
float pixelSeed;
highp uint randState;

const float strataSize = 6.0;
const float strataSizeInv = 1.0 / strataSize;

uint xorshift(uint x) {
  x ^= x << 13u;
  x ^= x >> 17u;
  x ^= x << 5u;
  return x;
}

void initRandom() {
  pixelSeed = float(xorshift(xorshift(floatBitsToUint(vCoord.x)) * xorshift(floatBitsToUint(vCoord.y)))) * maxUint;
}

float randomSample() {
  randState = xorshift(randState);

  float strata = dimension[dimensionIndex++];
  float random = (floor(strata * strataSize) + fract(pixelSeed + strata)) * strataSizeInv;

  // transform random number between [0, 1] to (0, 1)
  return EPS + (1.0 - 2.0 * EPS) * random;
}

vec2 randomSampleVec2() {
  return vec2(randomSample(), randomSample());
}
`;
};
