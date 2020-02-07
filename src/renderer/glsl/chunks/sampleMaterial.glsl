// Estimate the direct lighting integral using multiple importance sampling
// http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Direct_Lighting.html#EstimatingtheDirectLightingIntegral

export default `

void sampleMaterial(SurfaceInteraction si, int bounce, inout Path path) {
  bool lastBounce = bounce == BOUNCES;

  mat3 basis = orthonormalBasis(si.normal);
  vec3 viewDir = -path.ray.d;

  vec2 diffuseOrSpecular = randomSampleVec2();
  vec2 lightRand = randomSampleVec2();
  vec2 bounceRand = randomSampleVec2();

  vec3 lightDir;
  float cosThetaL;
  vec3 brdf;
  vec2 uv;
  float lightPdf;
  float scatteringPdf;
  float orientation;

  // Add path contribution
  float liContrib = 1.0;

  bool brdfSample = false;
  if (lastBounce && diffuseOrSpecular.x < 0.5) {
    lightDir = diffuseOrSpecular.y < mix(0.5, 0.0, si.metalness) ?
      lightDirDiffuse(si.faceNormal, viewDir, basis, lightRand) :
      lightDirSpecular(si.faceNormal, viewDir, basis, si.roughness, lightRand);

    uv = cartesianToEquirect(lightDir);
    lightPdf = envmapPdf(uv);
    brdfSample = true;
  } else {
    lightDir = sampleEnvmap(lightRand, uv, lightPdf);
  }

  cosThetaL = dot(si.normal, lightDir);

  orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  if (orientation < 0.0) {
    liContrib = 0.0;
  }

  float diffuseWeight = 1.0;

  initRay(path.ray, si.position + EPS * lightDir, lightDir);
  if (intersectSceneShadow(path.ray)) {
    if (lastBounce) {
      diffuseWeight = 0.0;
    } else {
      liContrib = 0.0;
    }
  }

  vec3 irr = textureLinear(envmap, uv).rgb;

  brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, diffuseWeight, scatteringPdf);

  float weight;
  if (lastBounce) {
    weight = brdfSample ?
      2.0 * powerHeuristic(scatteringPdf, lightPdf) / scatteringPdf :
      2.0 * powerHeuristic(lightPdf, scatteringPdf) / lightPdf;

  } else {
    weight = powerHeuristic(lightPdf, scatteringPdf) / lightPdf;
  }

  vec3 li = liContrib * brdf * irr * abs(cosThetaL) * weight;

  path.li += path.beta * li;

  // Get new path direction

  if (lastBounce) {
    return;
  }

  path.specularBounce = false;

  lightDir = diffuseOrSpecular.y < mix(0.5, 0.0, si.metalness) ?
    lightDirDiffuse(si.faceNormal, viewDir, basis, bounceRand) :
    lightDirSpecular(si.faceNormal, viewDir, basis, si.roughness, bounceRand);

  cosThetaL = dot(si.normal, lightDir);

  brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, 1.0, scatteringPdf);

  path.beta *= abs(cosThetaL) * brdf / scatteringPdf;

  uv = cartesianToEquirect(lightDir);
  lightPdf = envmapPdf(uv);
  path.misWeight = powerHeuristic(scatteringPdf, lightPdf);

  initRay(path.ray, si.position + EPS * lightDir, lightDir);

  // If new ray direction is pointing into the surface,
  // the light path is physically impossible and we terminate the path.
  orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  path.abort = orientation < 0.0;
}

`;
