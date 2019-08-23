// Random number generation as described by
// http://www.reedbeta.com/blog/quick-and-easy-gpu-random-numbers-in-d3d11/

export default function(params) {
  return `

// higher quality but slower hashing function
uint wangHash(uint x) {
  x = (x ^ 61u) ^ (x >> 16u);
  x *= 9u;
  x = x ^ (x >> 4u);
  x *= 0x27d4eb2du;
  x = x ^ (x >> 15u);
  return x;
}

// lower quality but faster hashing function
uint xorshift(uint x) {
  x ^= x << 13u;
  x ^= x >> 17u;
  x ^= x << 5u;
  return x;
}

uniform float seed; // Random number [0, 1)
uniform float strataStart[STRATA_DIMENSIONS];
uniform float strataSize;

const highp float maxUint = 1.0 / 4294967295.0;
highp uint randState;
int strataDimension;

// init state with high quality hashing function to avoid patterns across the 2d image
void initRandom() {
  randState = wangHash(floatBitsToUint(seed));
  randState *= wangHash(floatBitsToUint(vCoord.x));
  randState *= wangHash(floatBitsToUint(vCoord.y));
  randState = wangHash(randState);
  strataDimension = 0;
}

float random() {
  randState = xorshift(randState);
  float f = float(randState) * maxUint;

  // transform random number between [0, 1] to (0, 1)
  return EPS + (1.0 - 2.0 * EPS) * f;
}

vec2 randomVec2() {
  return vec2(random(), random());
}

float randomStrata() {
  return strataStart[strataDimension++] + strataSize * random();
}

vec2 randomStrataVec2() {
  return vec2(randomStrata(), randomStrata());
}
`;
};
