export default function(params) {
  return `

// blue noise texture
uniform sampler2D noise;

// Independently sampled strata dimensions
uniform float dimension[SAMPLING_DIMENSIONS];
uniform float strataSize;
uniform float useStratifiedSampling;

int dimensionIndex = 0;

const highp float maxUint = 1.0 / 4294967295.0;
float pixelSeed;
highp uint randState;

// simple integer hashing function
// https://en.wikipedia.org/wiki/Xorshift
uint xorshift(uint x) {
  x ^= x << 13u;
  x ^= x >> 17u;
  x ^= x << 5u;
  return x;
}

void initRandom() {
  vec2 noiseSize = vec2(textureSize(noise, 0));
  pixelSeed = texture(noise, vCoord / (pixelSize * noiseSize)).r;
  randState = xorshift(xorshift(floatBitsToUint(vCoord.x)) * xorshift(floatBitsToUint(vCoord.y)));
}

float randomSample() {
  randState = xorshift(randState);

  float strata = dimension[dimensionIndex++];

  float random = mix(
    float(randState) * maxUint, // white noise
    fract((strata + pixelSeed) * strataSize), // blue noise with stratafied numbers
    useStratifiedSampling
  );

  // transform random number between [0, 1] to (0, 1)
  return EPS + (1.0 - 2.0 * EPS) * random;
}

vec2 randomSampleVec2() {
  return vec2(randomSample(), randomSample());
}
`;
};
