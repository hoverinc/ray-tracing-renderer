export default `

#ifdef USE_GLASS

void sampleGlassSpecular(SurfaceInteraction si, int bounce, inout Path path) {
  bool lastBounce = bounce == BOUNCES;
  vec3 viewDir = -path.ray.d;
  float cosTheta = dot(si.normal, viewDir);

  MaterialSamples samples = getRandomMaterialSamples();

  float reflectionOrRefraction = samples.s1.x;

  float F = si.materialType == THIN_GLASS ?
    fresnelSchlick(abs(cosTheta), R0) : // thin glass
    fresnelSchlickTIR(cosTheta, R0, IOR); // thick glass

  vec3 lightDir;

  if (reflectionOrRefraction < F) {
    lightDir = reflect(-viewDir, si.normal);
  } else {
    lightDir = si.materialType == THIN_GLASS ?
      refract(-viewDir, sign(cosTheta) * si.normal, INV_IOR_THIN) : // thin glass
      refract(-viewDir, sign(cosTheta) * si.normal, cosTheta < 0.0 ? IOR : INV_IOR); // thick glass
    path.beta *= si.color;
  }

  path.misWeight = 1.0;

  initRay(path.ray, si.position + EPS * lightDir, lightDir);

  path.li += lastBounce ? path.beta * sampleBackgroundFromDirection(lightDir) : vec3(0.0);

  path.specularBounce = true;
}

#endif

`;
