export default `

// Noise texture used to generate a different random number for each pixel.
// We use blue noise in particular, but any type of noise will work.
uniform sampler2D noiseTex;

uniform float stratifiedSamples[SAMPLING_DIMENSIONS];
uniform float strataSize;

// Every time we call randomSample() in the shader, and for every call to render,
// we want that specific bit of the shader to fetch a sample from the same position in stratifiedSamples
// This allows us to use stratified sampling for each random variable in our path tracing
int sampleIndex = 0;

float pixelSeed;

void initRandom() {
  vec2 noiseSize = vec2(textureSize(noiseTex, 0));

  // tile the small noise texture across the entire screen
  pixelSeed = texture(noiseTex, vCoord / (pixelSize * noiseSize)).r;
}

float randomSample() {
  float stratifiedSample = stratifiedSamples[sampleIndex++];

  float random = fract((stratifiedSample + pixelSeed) * strataSize); // blue noise + stratified samples

  // transform random number between [0, 1] to (0, 1)
  return EPS + (1.0 - 2.0 * EPS) * random;
}

vec2 randomSampleVec2() {
  return vec2(randomSample(), randomSample());
}

struct MaterialSamples {
  vec2 s1;
  vec2 s2;
  vec2 s3;
};

MaterialSamples getRandomMaterialSamples() {
  MaterialSamples samples;

  samples.s1 = randomSampleVec2();
  samples.s2 = randomSampleVec2();
  samples.s3 = randomSampleVec2();

  return samples;
}
`;
