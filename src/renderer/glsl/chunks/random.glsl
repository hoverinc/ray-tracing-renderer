export default function(defines) {
  return `

// Noise texture used to generate a different random number for each pixel.
// We use blue noise in particular, but any type of noise will work.
uniform sampler2D noise;

uniform float stratifiedSamples[SAMPLING_DIMENSIONS];
uniform float strataSize;
uniform float useStratifiedSampling;

// Every time we call randomSample() in the shader, and for every call to render,
// we want that specific bit of the shader to fetch a sample from the same position in stratifiedSamples
// This allows us to use stratified sampling for each random variable in our path tracing
int sampleIndex = 0;

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

  // tile the small noise texture across the entire screen
  pixelSeed = texture(noise, vCoord / (pixelSize * noiseSize)).r;

  // white noise used if stratified sampling is disabled
  // produces more balanced path tracing for 1 sample-per-pixel renders
  randState = xorshift(xorshift(floatBitsToUint(vCoord.x)) * xorshift(floatBitsToUint(vCoord.y)));
}

float randomSample() {
  randState = xorshift(randState);

  float stratifiedSample = stratifiedSamples[sampleIndex++];

  float random = mix(
    float(randState) * maxUint, // white noise
    fract((stratifiedSample + pixelSeed) * strataSize), // blue noise + stratified samples
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
