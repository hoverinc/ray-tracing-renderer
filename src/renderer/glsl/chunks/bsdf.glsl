export default `

// Computes the exact value of the Fresnel factor
// https://seblagarde.wordpress.com/2013/04/29/memo-on-fresnel-equations/
float fresnel(float cosTheta, float eta, float invEta) {
  eta = cosTheta > 0.0 ? eta : invEta;
  cosTheta = abs(cosTheta);

  float gSquared = eta * eta + cosTheta * cosTheta - 1.0;

  if (gSquared < 0.0) {
    return 1.0;
  }

  float g = sqrt(gSquared);

  float a = (g - cosTheta) / (g + cosTheta);
  float b = (cosTheta * (g + cosTheta) - 1.0) / (cosTheta * (g - cosTheta) + 1.0);

  return 0.5 * a * a * (1.0 + b * b);
}

float fresnelSchlickWeight(float cosTheta) {
  float w = 1.0 - cosTheta;
  return (w * w) * (w * w) * w;
}

// Computes Schlick's approximation of the Fresnel factor
// Assumes ray is moving from a less dense to a more dense medium
float fresnelSchlick(float cosTheta, float r0) {
  return mix(fresnelSchlickWeight(cosTheta), 1.0, r0);
}

// Computes Schlick's approximation of Fresnel factor
// Accounts for total internal reflection if ray is moving from a more dense to a less dense medium
float fresnelSchlickTIR(float cosTheta, float r0, float ni) {

  // moving from a more dense to a less dense medium
  if (cosTheta < 0.0) {
    float inv_eta = ni;
    float SinT2 = inv_eta * inv_eta * (1.0f - cosTheta * cosTheta);
    if (SinT2 > 1.0) {
        return 1.0; // total internal reflection
    }
    cosTheta = sqrt(1.0f - SinT2);
  }

  return mix(fresnelSchlickWeight(cosTheta), 1.0, r0);
}

float trowbridgeReitzD(float cosTheta, float alpha2) {
  float e = cosTheta * cosTheta * (alpha2 - 1.0) + 1.0;
  return alpha2 / (PI * e * e);
}

float trowbridgeReitzLambda(float cosTheta, float alpha2) {
  float cos2Theta = cosTheta * cosTheta;
  float tan2Theta = (1.0 - cos2Theta) / cos2Theta;
  return 0.5 * (-1.0 + sqrt(1.0 + alpha2 * tan2Theta));
}

// An implementation of Disney's principled BRDF
// https://disney-animation.s3.amazonaws.com/library/s2012_pbs_disney_brdf_notes_v2.pdf
vec3 materialBrdf(SurfaceInteraction si, vec3 viewDir, vec3 lightDir, float cosThetaL, float diffuseWeight, out float pdf) {
  vec3 halfVector = normalize(viewDir + lightDir);

  cosThetaL = abs(cosThetaL);
  float cosThetaV = abs(dot(si.normal, viewDir));
  float cosThetaH = abs(dot(si.normal, halfVector));
  float cosThetaD = abs(dot(lightDir, halfVector));

  float alpha2 = (si.roughness * si.roughness) * (si.roughness * si.roughness);

  float F = fresnelSchlick(cosThetaD, mix(R0, 0.6, si.metalness));
  float D = trowbridgeReitzD(cosThetaH, alpha2);

  float roughnessRemapped = 0.5 + 0.5 * si.roughness;
  float alpha2Remapped = (roughnessRemapped * roughnessRemapped) * (roughnessRemapped * roughnessRemapped);

  float G = 1.0 / (1.0 + trowbridgeReitzLambda(cosThetaV, alpha2Remapped) + trowbridgeReitzLambda(cosThetaL, alpha2Remapped));

  float specular = F * D * G / (4.0 * cosThetaV * cosThetaL);
  float specularPdf = D * cosThetaH / (4.0 * cosThetaD);

  float f = -0.5 + 2.0 * cosThetaD * cosThetaD * si.roughness;
  float diffuse = diffuseWeight * INVPI * (1.0 + f * fresnelSchlickWeight(cosThetaL)) * (1.0 + f * fresnelSchlickWeight(cosThetaV));
  float diffusePdf = cosThetaL * INVPI;

  pdf = mix(0.5 * (specularPdf + diffusePdf), specularPdf, si.metalness);

  return mix(si.color * diffuse + specular, si.color * specular, si.metalness);
}

`;
