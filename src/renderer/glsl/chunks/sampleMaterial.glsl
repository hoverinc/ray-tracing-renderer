// Estimate the direct lighting integral using multiple importance sampling
// http://www.pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Direct_Lighting.html#EstimatingtheDirectLightingIntegral

export default `

void sampleMaterial(SurfaceInteraction si, int bounce, inout Path path) {
  bool lastBounce = bounce == BOUNCES;
  mat3 basis = orthonormalBasis(si.normal);
  vec3 viewDir = -path.ray.d;

  MaterialSamples samples = getRandomMaterialSamples();

  vec2 diffuseOrSpecular = samples.s1;
  vec2 lightDirSample = samples.s2;
  vec2 bounceDirSample = samples.s3;

  // Step 1: Add direct illumination of the light source (the hdr map)
  // On every bounce but the last, importance sample the light source
  // On the last bounce, multiple importance sample the brdf AND the light source, determined by random var

  vec3 lightDir;
  vec2 uv;
  float lightPdf;
  bool brdfSample = false;

  if (lastBounce && diffuseOrSpecular.x < 0.5) {
    // reuse this sample by multiplying by 2 to bring sample from [0, 0.5), to [0, 1)
    lightDir = 2.0 * diffuseOrSpecular.x < mix(0.5, 0.0, si.metalness) ?
      lightDirDiffuse(si.faceNormal, viewDir, basis, lightDirSample) :
      lightDirSpecular(si.faceNormal, viewDir, basis, si.roughness, lightDirSample);

    uv = cartesianToEquirect(lightDir);
    lightPdf = envMapPdf(uv);
    brdfSample = true;
  } else {
    lightDir = sampleEnvmap(lightDirSample, uv, lightPdf);
  }

  float cosThetaL = dot(si.normal, lightDir);

  float occluded = 1.0;

  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  if (orientation < 0.0) {
    // light dir points towards surface. invalid dir.
    occluded = 0.0;
  }

  float diffuseWeight = 1.0;

  initRay(path.ray, si.position + EPS * lightDir, lightDir);
  if (intersectSceneShadow(path.ray)) {
    if (lastBounce) {
      diffuseWeight = 0.0;
    } else {
      occluded = 0.0;
    }
  }

  vec3 irr = textureLinear(envMap, uv).rgb;

  float scatteringPdf;
  vec3 brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, diffuseWeight, scatteringPdf);

  float weight;
  if (lastBounce) {
    weight = brdfSample ?
      2.0 * powerHeuristic(scatteringPdf, lightPdf) / scatteringPdf :
      2.0 * powerHeuristic(lightPdf, scatteringPdf) / lightPdf;
  } else {
    weight = powerHeuristic(lightPdf, scatteringPdf) / lightPdf;
  }

  path.li += path.beta * occluded * brdf * irr * abs(cosThetaL) * weight;;

  // Step 2: Setup ray direction for next bounce by importance sampling the BRDF

  if (lastBounce) {
    return;
  }

  lightDir = diffuseOrSpecular.y < mix(0.5, 0.0, si.metalness) ?
    lightDirDiffuse(si.faceNormal, viewDir, basis, bounceDirSample) :
    lightDirSpecular(si.faceNormal, viewDir, basis, si.roughness, bounceDirSample);

  cosThetaL = dot(si.normal, lightDir);

  orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  path.abort = orientation < 0.0;

  if (path.abort) {
    return;
  }

  brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, 1.0, scatteringPdf);

  uv = cartesianToEquirect(lightDir);
  lightPdf = envMapPdf(uv);

  path.misWeight = powerHeuristic(scatteringPdf, lightPdf);

  path.beta *= abs(cosThetaL) * brdf / scatteringPdf;

  path.specularBounce = false;

  initRay(path.ray, si.position + EPS * lightDir, lightDir);
}
`;
