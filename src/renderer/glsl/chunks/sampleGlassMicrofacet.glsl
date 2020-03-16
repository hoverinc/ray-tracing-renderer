// Extends from concepts found in sampleMaterial.glsl
// Combines multiple importance sampling with
// Walter Et al. (2007) - Microfacet Models for Refraction through Rough Surfaces
// https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.html

export default `
#ifdef USE_GLASS

// Computes Cook-Torrance specular reflection
vec3 glassReflection(SurfaceInteraction si, vec3 viewDir, vec3 lightDir, float cosThetaL, out float pdf) {
  vec3 halfVector = normalize(viewDir + lightDir);

  float cosThetaV = dot(si.normal, viewDir);
  float cosThetaH = dot(si.normal, halfVector);
  float cosThetaD = dot(lightDir, halfVector);

  float alpha2 = (si.roughness * si.roughness) * (si.roughness * si.roughness);

  float F = fresnelSchlickTIR(sign(cosThetaL) * cosThetaD, R0, IOR);
  float D = trowbridgeReitzD(cosThetaH, alpha2);
  float G = 1.0 / (1.0 + trowbridgeReitzLambda(cosThetaV, alpha2) + trowbridgeReitzLambda(cosThetaL, alpha2));

  pdf = abs(D * cosThetaH / (4.0 * cosThetaD));

  return vec3(1.0) * abs(F * D * G / (4.0 * cosThetaV * cosThetaL));
}

// An implementation of Walter Et al. (2007) - Microfacet Models for Refraction through Rough Surfaces
// https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.html
vec3 glassRefraction(SurfaceInteraction si, vec3 viewDir, vec3 lightDir, float cosThetaL, out float pdf) {
  float dir = sign(dot(viewDir, si.normal));
  float eta = dir > 0.0 ? IOR : INV_IOR;
  // float eta = dir > 0.0 ? IOR_THIN : INV_IOR_THIN;

  vec3 halfVector = normalize(viewDir + lightDir * eta);

  float cosThetaV = dot(si.normal, viewDir);
  float cosThetaH = dot(si.normal, halfVector);
  float cosThetaVH = dot(viewDir, halfVector);
  float cosThetaLH = dot(lightDir, halfVector);

  float alpha2 = (si.roughness * si.roughness) * (si.roughness * si.roughness);

  float F = fresnelSchlickTIR(-cosThetaVH, R0, IOR);
  float D = trowbridgeReitzD(cosThetaH, alpha2);
  float G = 1.0 / (1.0 + trowbridgeReitzLambda(cosThetaV, alpha2) + trowbridgeReitzLambda(cosThetaL, alpha2));

  float sqrtDenom = cosThetaVH + eta * cosThetaLH;

  pdf = abs(D * cosThetaH * eta * eta * cosThetaLH / (sqrtDenom * sqrtDenom));

  return si.color * (1.0 - F) * abs(D * G * eta * eta * cosThetaLH * cosThetaVH / (cosThetaL * cosThetaV * sqrtDenom * sqrtDenom));
}

vec3 lightDirRefraction(vec3 normal, vec3 viewDir, mat3 basis, float roughness, vec2 random) {
  float phi = TWOPI * random.y;
  float alpha = roughness * roughness;
  float cosTheta = sqrt((1.0 - random.x) / (1.0 + (alpha * alpha - 1.0) * random.x));
  float sinTheta = sqrt(1.0 - cosTheta * cosTheta);

  float dir = sign(dot(normal, viewDir));

  vec3 halfVector = basis * dir * vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);

  vec3 lightDir = refract(-viewDir, halfVector, dir < 0.0 ? IOR : INV_IOR);
  // vec3 lightDir = refract(-viewDir, halfVector, INV_IOR_THIN);

  return lightDir;
}

vec3 glassImportanceSampleLight(SurfaceInteraction si, vec3 viewDir, bool lightRefract, bool lastBounce, vec2 random) {
  vec3 li;

  float lightPdf;
  vec2 uv;
  vec3 lightDir = sampleEnvmap(random, uv, lightPdf);

  float cosThetaL = dot(si.normal, lightDir);

  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  if ((!lightRefract && orientation < 0.0) || (lightRefract && orientation > 0.0)) {
    return li;
  }

  Ray ray;
  initRay(ray, si.position + EPS * lightDir, lightDir);
  if (!lastBounce && intersectSceneShadow(ray)) {
    return li;
  }

  vec3 irr = textureLinear(envMap, uv).xyz;

  float scatteringPdf;
  vec3 brdf = lightRefract ?
    glassRefraction(si, viewDir, lightDir, cosThetaL, scatteringPdf) :
    glassReflection(si, viewDir, lightDir, cosThetaL, scatteringPdf);

  float weight = powerHeuristic(lightPdf, scatteringPdf);

  li = brdf * irr * abs(cosThetaL) * weight / lightPdf;

  return li;
}

vec3 glassImportanceSampleMaterial(SurfaceInteraction si, vec3 viewDir, bool lightRefract, bool lastBounce, vec3 lightDir) {
  vec3 li;

  float cosThetaL = dot(si.normal, lightDir);

  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  if ((!lightRefract && orientation < 0.0) || (lightRefract && orientation > 0.0)) {
    return li;
  }

  Ray ray;
  initRay(ray, si.position + EPS * lightDir, lightDir);
  if (!lastBounce && intersectSceneShadow(ray)) {
     return li;
  }

  vec2 uv = cartesianToEquirect(lightDir);
  float lightPdf = envMapPdf(uv);

  vec3 irr = textureLinear(envMap, vec2(phi, theta)).rgb;

  float scatteringPdf;
  vec3 brdf = lightRefract ?
    glassRefraction(si, viewDir, lightDir, cosThetaL, scatteringPdf) :
    glassReflection(si, viewDir, lightDir, cosThetaL, scatteringPdf);

  float weight = powerHeuristic(scatteringPdf, lightPdf);

  li += brdf * irr * abs(cosThetaL) * weight / scatteringPdf;

  return li;
}

vec3 sampleGlassMicrofacet(SurfaceInteraction si, int bounce, inout Ray ray, inout vec3 beta, out bool abort) {
  vec3 viewDir = -ray.d;

  float cosThetaV = dot(si.normal, viewDir);

  // thin glass
  // si.normal *= sign(cosThetaV);
  // si.faceNormal *= sign(cosThetaV);
  // cosThetaV = abs(cosThetaV);

  mat3 basis = orthonormalBasis(si.normal);

  float F = fresnelSchlickTIR(cosThetaV, R0, IOR); // thick glass

  vec2 reflectionOrRefraction = randomSampleVec2();

  vec3 lightDir;
  bool lightRefract;
  float pdf;

  if (reflectionOrRefraction.x < F) {
    lightDir = lightDirSpecular(si.normal, viewDir, basis, si.roughness, randomSampleVec2());
    lightRefract = false;
    pdf = F;
  } else {
    lightDir = lightDirRefraction(si.normal, viewDir, basis, si.roughness, randomSampleVec2());
    lightRefract = true;
    pdf = 1.0 - F;
  }

  bool lastBounce = bounce == BOUNCES;

  vec3 li = beta * (
      glassImportanceSampleLight(si, viewDir, lightRefract, lastBounce, randomSampleVec2()) +
      glassImportanceSampleMaterial(si, viewDir, lightRefract, lastBounce, lightDir)
    );

  li /= pdf;

  float scatteringPdf;
  float cosThetaL;
  vec3 brdf;

  if (reflectionOrRefraction.y < F) {
    lightDir = lightDirSpecular(si.normal, viewDir, basis, si.roughness, randomSampleVec2());
    cosThetaL = dot(si.normal, lightDir);
    brdf = glassReflection(si, viewDir, lightDir, cosThetaL, scatteringPdf);
    scatteringPdf *= F;
    lightRefract = false;
  } else {
    lightDir = lightDirRefraction(si.normal, viewDir, basis, si.roughness, randomSampleVec2());
    cosThetaL = dot(si.normal, lightDir);
    brdf = glassRefraction(si, viewDir, lightDir, cosThetaL, scatteringPdf);
    scatteringPdf *= 1.0 - F;
    lightRefract = true;
  }

  beta *= abs(cosThetaL) * brdf / scatteringPdf;

  initRay(ray, si.position + EPS * lightDir, lightDir);

  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  abort = (!lightRefract && orientation < 0.0) || (lightRefract && orientation > 0.0);

  return li;
}

#endif

`;
