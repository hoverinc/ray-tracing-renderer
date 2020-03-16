// Sample the environment map using a cumulative distribution function as described in
// http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Sampling_Light_Sources.html#InfiniteAreaLights

export default `

uniform sampler2D envMap;
uniform sampler2D envMapDistribution;
uniform sampler2D backgroundMap;

vec2 cartesianToEquirect(vec3 pointOnSphere) {
  float phi = mod(atan(-pointOnSphere.z, -pointOnSphere.x), TWOPI);
  float theta = acos(pointOnSphere.y);
  return vec2(phi * 0.5 * INVPI, theta * INVPI);
}

float getEnvmapV(float u, out int vOffset, out float pdf) {
  ivec2 size = textureSize(envMap, 0);

  int left = 0;
  int right = size.y + 1; // cdf length is the length of the env map + 1
  while (left < right) {
    int mid = (left + right) >> 1;
    float s = texelFetch(envMapDistribution, ivec2(0, mid), 0).x;
    if (s <= u) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  vOffset = left - 1;

  // x channel is cumulative distribution of env map luminance
  // y channel is partial probability density of env map luminance
  vec2 s0 = texelFetch(envMapDistribution, ivec2(0, vOffset), 0).xy;
  vec2 s1 = texelFetch(envMapDistribution, ivec2(0, vOffset + 1), 0).xy;

  pdf = s0.y;

  return (float(vOffset) +  (u - s0.x) / (s1.x - s0.x)) / float(size.y);
}

float getEnvmapU(float u, int vOffset, out float pdf) {
  ivec2 size = textureSize(envMap, 0);

  int left = 0;
  int right = size.x + 1; // cdf length is the length of the env map + 1
  while (left < right) {
    int mid = (left + right) >> 1;
    float s = texelFetch(envMapDistribution, ivec2(1 + mid, vOffset), 0).x;
    if (s <= u) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  int uOffset = left - 1;

  // x channel is cumulative distribution of env map luminance
  // y channel is partial probability density of env map luminance
  vec2 s0 = texelFetch(envMapDistribution, ivec2(1 + uOffset, vOffset), 0).xy;
  vec2 s1 = texelFetch(envMapDistribution, ivec2(1 + uOffset + 1, vOffset), 0).xy;

  pdf = s0.y;

  return (float(uOffset) + (u - s0.x) / (s1.x - s0.x)) / float(size.x);
}

// Perform two binary searches to find light direction.
vec3 sampleEnvmap(vec2 random, out vec2 uv, out float pdf) {
  vec2 partialPdf;
  int vOffset;

  uv.y = getEnvmapV(random.x, vOffset, partialPdf.y);
  uv.x = getEnvmapU(random.y, vOffset, partialPdf.x);

  float phi = uv.x * TWOPI;
  float theta = uv.y * PI;
  float cosTheta = cos(theta);
  float sinTheta = sin(theta);
  float cosPhi = cos(phi);
  float sinPhi = sin(phi);

  vec3 dir = vec3(-sinTheta * cosPhi, cosTheta, -sinTheta * sinPhi);

  pdf = partialPdf.x * partialPdf.y * INVPI2 / (2.0 * sinTheta);

  return dir;
}

float envMapPdf(vec2 uv) {
  vec2 size = vec2(textureSize(envMap, 0));

  float sinTheta = sin(uv.y * PI);

  uv *= size;

  float partialX = texelFetch(envMapDistribution, ivec2(1.0 + uv.x, uv.y), 0).y;
  float partialY = texelFetch(envMapDistribution, ivec2(0, uv.y), 0).y;

  return partialX * partialY * INVPI2 / (2.0 * sinTheta);
}

vec3 sampleEnvmapFromDirection(vec3 d) {
  vec2 uv = cartesianToEquirect(d);
  return textureLinear(envMap, uv).rgb;
}

vec3 sampleBackgroundFromDirection(vec3 d) {
  vec2 uv = cartesianToEquirect(d);
  return textureLinear(backgroundMap, uv).rgb;
}

`;
