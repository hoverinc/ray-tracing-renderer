// Estimate the direct lighting integral using multiple importance sampling
// http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Direct_Lighting.html#EstimatingtheDirectLightingIntegral

export default function(defines) {
  return `

vec3 importanceSampleLight(SurfaceInteraction si, vec3 viewDir, bool lastBounce, vec2 random) {
  vec3 li;

  float lightPdf;
  vec2 uv;
  vec3 lightDir = sampleEnvmap(random, uv, lightPdf);

  float cosThetaL = dot(si.normal, lightDir);

  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  if (orientation < 0.0) {
    return li;
  }

  float diffuseWeight = 1.0;
  Ray ray;
  initRay(ray, si.position + EPS * lightDir, lightDir);
  if (intersectSceneShadow(ray)) {
    if (lastBounce) {
      diffuseWeight = 0.0;
    } else {
      return li;
    }
  }

  vec3 irr = textureLinear(envmap, uv).xyz;

  float scatteringPdf;
  vec3 brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, diffuseWeight, scatteringPdf);

  float weight = powerHeuristic(lightPdf, scatteringPdf);

  li = brdf * irr * abs(cosThetaL) * weight / lightPdf;

  return li;
}

vec3 importanceSampleMaterial(SurfaceInteraction si, vec3 viewDir, bool lastBounce, vec3 lightDir) {
  vec3 li;

  float cosThetaL = dot(si.normal, lightDir);

  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  if (orientation < 0.0) {
    return li;
  }

  float diffuseWeight = 1.0;
  Ray ray;
  initRay(ray, si.position + EPS * lightDir, lightDir);
  if (intersectSceneShadow(ray)) {
    if (lastBounce) {
      diffuseWeight = 0.0;
    } else {
      return li;
    }
  }

  vec2 uv = cartesianToEquirect(lightDir);

  float lightPdf = envmapPdf(uv);

  vec3 irr = textureLinear(envmap, uv).rgb;

  float scatteringPdf;
  vec3 brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, diffuseWeight, scatteringPdf);

  float weight = powerHeuristic(scatteringPdf, lightPdf);

  li += brdf * irr * abs(cosThetaL) * weight / scatteringPdf;

  return li;
}

vec3 sampleMaterial(SurfaceInteraction si, int bounce, inout Ray ray, inout vec3 beta, inout bool abort) {
  mat3 basis = orthonormalBasis(si.normal);
  vec3 viewDir = -ray.d;

  vec2 diffuseOrSpecular = randomSampleVec2();

  vec3 lightDir = diffuseOrSpecular.x < mix(0.5, 0.0, si.metalness) ?
    lightDirDiffuse(si.faceNormal, viewDir, basis, randomSampleVec2()) :
    lightDirSpecular(si.faceNormal, viewDir, basis, si.roughness, randomSampleVec2());

  bool lastBounce = bounce == BOUNCES;

  // Add path contribution
  vec3 li = beta * (
      importanceSampleLight(si, viewDir, lastBounce, randomSampleVec2()) +
      importanceSampleMaterial(si, viewDir, lastBounce, lightDir)
    );

  // Get new path direction

  lightDir = diffuseOrSpecular.y < mix(0.5, 0.0, si.metalness) ?
    lightDirDiffuse(si.faceNormal, viewDir, basis, randomSampleVec2()) :
    lightDirSpecular(si.faceNormal, viewDir, basis, si.roughness, randomSampleVec2());

  float cosThetaL = dot(si.normal, lightDir);

  float scatteringPdf;
  vec3 brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, 1.0, scatteringPdf);

  beta *= abs(cosThetaL) * brdf / scatteringPdf;

  initRay(ray, si.position + EPS * lightDir, lightDir);

  // If new ray direction is pointing into the surface,
  // the light path is physically impossible and we terminate the path.
  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  abort = orientation < 0.0;

  return li;
}

`;
}
