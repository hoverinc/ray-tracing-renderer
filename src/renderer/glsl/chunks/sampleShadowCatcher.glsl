export default function (params) {
  return `

#ifdef USE_SHADOW_CATCHER

float importanceSampleLightShadowCatcher(SurfaceInteraction si, vec3 viewDir, vec2 random, inout float alpha) {
  float li;

  float lightPdf;
  vec2 uv;
  vec3 lightDir = sampleEnvmap(random, uv, lightPdf);

  float cosThetaL = dot(si.normal, lightDir);

  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  if (orientation < 0.0) {
    return li;
  }

  float occluded = 1.0;

  Ray ray;
  initRay(ray, si.position + EPS * lightDir, lightDir);
  if (intersectSceneShadow(ray)) {
    occluded = 0.0;
  }

  float irr = dot(luminance, textureLinear(envmap, uv).rgb);

  // lambertian BRDF
  float brdf = INVPI;
  float scatteringPdf = abs(cosThetaL) * INVPI;

  float weight = powerHeuristic(lightPdf, scatteringPdf);

  float lightEq = irr * brdf * abs(cosThetaL) * weight / lightPdf;

  alpha += lightEq;
  li += occluded * lightEq;

  return li;
}

float importanceSampleMaterialShadowCatcher(SurfaceInteraction si, vec3 viewDir, vec3 lightDir, inout float alpha) {
  float li;

  float cosThetaL = dot(si.normal, lightDir);

  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  if (orientation < 0.0) {
    return li;
  }

  float occluded = 1.0;

  Ray ray;
  initRay(ray, si.position + EPS * lightDir, lightDir);
  if (intersectSceneShadow(ray)) {
    occluded = 0.0;
  }

  vec2 uv = cartesianToEquirect(lightDir);

  float lightPdf = envmapPdf(uv);

  float irr = dot(luminance, textureLinear(envmap, uv).rgb);

  // lambertian BRDF
  float brdf = INVPI;
  float scatteringPdf = abs(cosThetaL) * INVPI;

  float weight = powerHeuristic(scatteringPdf, lightPdf);

  float lightEq = irr * brdf * abs(cosThetaL) * weight / scatteringPdf;

  alpha += lightEq;
  li += occluded * lightEq;

  return li;
}

vec3 sampleShadowCatcher(SurfaceInteraction si, int bounce, inout Ray ray, inout vec3 beta, inout float alpha, inout vec3 prevLi, inout bool abort) {
  mat3 basis = orthonormalBasis(si.normal);
  vec3 viewDir = -ray.d;
  vec3 color = sampleEnvmapFromDirection(-viewDir);

  vec3 lightDir = lightDirDiffuse(si.faceNormal, viewDir, basis, randomSampleVec2());

  float alphaBounce = 0.0;

  // Add path contribution
  vec3 li = beta * color * (
      importanceSampleLightShadowCatcher(si, viewDir, randomSampleVec2(), alphaBounce) +
      importanceSampleMaterialShadowCatcher(si, viewDir, lightDir, alphaBounce)
    );

  // alphaBounce contains the lighting of the shadow catcher *without* shadows
  alphaBounce = alphaBounce == 0.0 ? 1.0 : alphaBounce;

  // in post processing step, we divide by alpha to obtain the percentage of light relative to shadow for the shadow catcher
  alpha *= alphaBounce;

  // we only want the alpha division to affect the shadow catcher
  // factor in alpha to the previous light, so that dividing by alpha with the previous light cancels out this contribution
  prevLi *= alphaBounce;

  // Get new path direction

  lightDir = lightDirDiffuse(si.faceNormal, viewDir, basis, randomSampleVec2());

  float cosThetaL = dot(si.normal, lightDir);

  // lambertian brdf with terms cancelled
  beta *= color;

  initRay(ray, si.position + EPS * lightDir, lightDir);

  // If new ray direction is pointing into the surface,
  // the light path is physically impossible and we terminate the path.
  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  abort = orientation < 0.0;

  // advance dimension index by unused stratified samples
  const int usedDimensions = 6;
  sampleIndex += DIMENSIONS_PER_MATERIAL - usedDimensions;

  return li;
}

#endif
`;
}
