export default `

#ifdef USE_SHADOW_CATCHER

void sampleShadowCatcher(SurfaceInteraction si, int bounce, inout Path path) {
  bool lastBounce = bounce == BOUNCES;
  mat3 basis = orthonormalBasis(si.normal);
  vec3 viewDir = -path.ray.d;
  vec3 color = bounce == 1  || path.specularBounce ? sampleBackgroundFromDirection(-viewDir) : sampleEnvmapFromDirection(-viewDir);

  si.color = vec3(1, 1, 1);

  MaterialSamples samples = getRandomMaterialSamples();

  vec2 diffuseOrSpecular = samples.s1;
  vec2 lightDirSample = samples.s2;
  vec2 bounceDirSample = samples.s3;

  vec3 lightDir;
  vec2 uv;
  float lightPdf;
  bool brdfSample = false;

  if (diffuseOrSpecular.x < 0.5) {
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

  float liContrib = 1.0;

  float orientation = dot(si.faceNormal, viewDir) * cosThetaL;
  if (orientation < 0.0) {
    liContrib = 0.0;
  }

  float occluded = 1.0;
  initRay(path.ray, si.position + EPS * lightDir, lightDir);
  if (intersectSceneShadow(path.ray)) {
    occluded = 0.0;
  }

  float irr = dot(luminance, textureLinear(envMap, uv).rgb);

  float scatteringPdf;
  vec3 brdf = materialBrdf(si, viewDir, lightDir, cosThetaL, 1.0, scatteringPdf);

  float weight = brdfSample ?
    2.0 * powerHeuristic(scatteringPdf, lightPdf) / scatteringPdf :
    2.0 * powerHeuristic(lightPdf, scatteringPdf) / lightPdf;

  float liEq = liContrib * brdf.r * irr * abs(cosThetaL) * weight;

  float alpha = liEq;
  path.alpha *= alpha;
  path.li *= alpha;

  path.li += occluded * path.beta * color * liEq;

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

  path.misWeight = 0.0;

  path.beta = color * abs(cosThetaL) * brdf.r / scatteringPdf;

  path.specularBounce = false;

  initRay(path.ray, si.position + EPS * lightDir, lightDir);
}

#endif

`;
