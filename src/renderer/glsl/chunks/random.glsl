// Random number generation as described by
// http://www.reedbeta.com/blog/quick-and-easy-gpu-random-numbers-in-d3d11/

export default function(params) {
  return `

uniform float dimension[SAMPLING_DIMENSIONS];
int dimensionIndex = 0;

const highp float maxUint = 1.0 / 4294967295.0;
float pixelSeed;

// init state with high quality hashing function to avoid patterns across the 2d image
void initRandom() {
  pixelSeed = fract(sin(dot(vCoord, vec2(12.9898,78.233))) * 43758.5453);
}

// float random() {
//   randState = xorshift(randState);
//   float f = float(randState) * maxUint;

//   // transform random number between [0, 1] to (0, 1)
//   return EPS + (1.0 - 2.0 * EPS) * f;
// }

// vec2 randomVec2() {
//   return vec2(random(), random());
// }

float randomSample() {
  return fract(pixelSeed + dimension[dimensionIndex++]);
}

vec2 randomSampleVec2() {
  return vec2(randomSample(), randomSample());
}
`;
};
