export default `

// https://graphics.pixar.com/library/OrthonormalB/paper.pdf
mat3 orthonormalBasis(vec3 n) {
  float zsign = n.z >= 0.0 ? 1.0 : -1.0;
  float a = -1.0 / (zsign + n.z);
  float b = n.x * n.y * a;
  vec3 s = vec3(1.0 + zsign * n.x * n.x * a, zsign * b, -zsign * n.x);
  vec3 t = vec3(b, zsign + n.y * n.y * a, -n.y);
  return mat3(s, t, n);
}

// http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#SamplingaUnitDisk
vec2 sampleCircle(vec2 p) {
  p = 2.0 * p - 1.0;

  bool greater = abs(p.x) > abs(p.y);

  float r = greater ? p.x : p.y;
  float theta = greater ? 0.25 * PI * p.y / p.x : PI * (0.5 - 0.25 * p.x / p.y);

  return r * vec2(cos(theta), sin(theta));
}

// http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#Cosine-WeightedHemisphereSampling
vec3 cosineSampleHemisphere(vec2 p) {
  vec2 h = sampleCircle(p);
  float z = sqrt(max(0.0, 1.0 - h.x * h.x - h.y * h.y));
  return vec3(h, z);
}


// http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Sampling_Reflection_Functions.html#MicrofacetBxDFs
// Instead of Beckmann distrubtion, we use the GTR2 (GGX) distrubtion as covered in Disney's Principled BRDF paper
vec3 lightDirSpecular(vec3 faceNormal, vec3 viewDir, mat3 basis, float roughness, vec2 random) {
  float phi = TWOPI * random.y;
  float alpha = roughness * roughness;
  float cosTheta = sqrt((1.0 - random.x) / (1.0 + (alpha * alpha - 1.0) * random.x));
  float sinTheta = sqrt(1.0 - cosTheta * cosTheta);

  vec3 halfVector = basis * sign(dot(faceNormal, viewDir)) * vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);

  vec3 lightDir = reflect(-viewDir, halfVector);

  return lightDir;
}

vec3 lightDirDiffuse(vec3 faceNormal, vec3 viewDir, mat3 basis, vec2 random) {
  return basis * sign(dot(faceNormal, viewDir)) * cosineSampleHemisphere(random);
}

float powerHeuristic(float f, float g) {
  return (f * f) / (f * f + g * g);
}

`;
