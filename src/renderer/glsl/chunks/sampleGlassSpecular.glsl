export default `

#ifdef USE_GLASS

void sampleGlassSpecular(SurfaceInteraction si, int bounce, inout Path path) {
  vec3 viewDir = -path.ray.d;
  float cosTheta = dot(si.normal, viewDir);

  float F = si.materialType == THIN_GLASS ?
    fresnelSchlick(abs(cosTheta), R0) : // thin glass
    fresnelSchlickTIR(cosTheta, R0, IOR); // thick glass

  vec3 lightDir;

  float reflectionOrRefraction = randomSample();

  if (reflectionOrRefraction < F) {
    lightDir = reflect(-viewDir, si.normal);
  } else {
    lightDir = si.materialType == THIN_GLASS ?
      refract(-viewDir, sign(cosTheta) * si.normal, INV_IOR_THIN) : // thin glass
      refract(-viewDir, sign(cosTheta) * si.normal, cosTheta < 0.0 ? IOR : INV_IOR); // thick glass
    path.beta *= si.color;
  }

  initRay(path.ray, si.position + EPS * lightDir, lightDir);

  // advance sample index by unused stratified samples
  const int usedSamples = 1;
  sampleIndex += SAMPLES_PER_MATERIAL - usedSamples;

  path.li += bounce == BOUNCES ? path.beta * sampleBackgroundFromDirection(lightDir) : vec3(0.0);
}

#endif

`;
