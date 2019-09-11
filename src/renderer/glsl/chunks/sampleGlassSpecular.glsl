export default function (params) {
  return `

#ifdef USE_GLASS

vec3 sampleGlassSpecular(SurfaceInteraction si, int bounce, inout Ray ray, inout vec3 beta) {
  vec3 viewDir = -ray.d;
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
    beta *= si.color;
  }

  initRay(ray, si.position + EPS * lightDir, lightDir);

  // advance sample index by unused stratified samples
  const int usedDimensions = 1;
  sampleIndex += DIMENSIONS_PER_MATERIAL - usedDimensions;

  return bounce == BOUNCES ? beta * sampleEnvmapFromDirection(lightDir) : vec3(0.0);
}

#endif

`;
}