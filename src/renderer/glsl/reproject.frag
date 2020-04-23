import textureLinear from './chunks/textureLinear.glsl';

export default {
outputs: ['diffuse', 'specular'],
includes: [textureLinear],
source: `
  in vec2 vCoord;

  uniform mediump sampler2DArray diffuseSpecularTex;
  uniform mediump sampler2D positionTex;
  uniform mediump sampler2D normalTex;
  uniform mediump sampler2D matPropsTex;
  uniform vec2 lightScale;
  uniform vec2 previousLightScale;

  uniform mediump sampler2DArray previousDiffuseSpecularTex;
  uniform mediump sampler2D previousPositionTex;
  uniform mediump sampler2D previousNormalTex;

  uniform mat4 historyCamera;
  uniform float blendAmount;
  uniform vec2 jitter;

  vec2 project3Dto2D(vec3 position) {
    vec4 historyCoord = historyCamera * vec4(position, 1.0);
    return 0.5 * historyCoord.xy / historyCoord.w + 0.5;
  }

  float getMeshId(sampler2D meshIdTex, vec2 vCoord) {
    return floor(texture(meshIdTex, vCoord).w);
  }

  void main() {
    vec2 bufferSize = vec2(textureSize(diffuseSpecularTex, 0));

    vec4 positionAndDiff = textureLinear(positionTex, vCoord);
    vec3 currentPosition = positionAndDiff.xyz;
    float posDiff = positionAndDiff.w * max(bufferSize.x, bufferSize.y);

    vec4 normalAndMeshId = texture(normalTex, vCoord);
    vec3 currentNormal = normalize(normalAndMeshId.xyz);
    int currentMeshId = int(normalAndMeshId.w);

    vec4 currentDiffuse = texture(diffuseSpecularTex, vec3(lightScale * vCoord, 0));
    vec4 currentSpecular = texture(diffuseSpecularTex, vec3(lightScale * vCoord, 1));

    if (posDiff == 0.0) {
      out_diffuse = currentDiffuse;
      out_specular = currentSpecular;
      return;
    }

    #ifdef REPROJECT
      vec2 hCoord = project3Dto2D(currentPosition) - jitter;

      vec2 hSizef = previousLightScale * bufferSize;
      vec2 hSizeInv = 1.0 / hSizef;
      ivec2 hSize = ivec2(hSizef);

      vec2 hTexelf = hCoord * hSizef - 0.5;
      ivec2 hTexel = ivec2(hTexelf);
      vec2 f = fract(hTexelf);

      ivec2 texel[] = ivec2[](
        hTexel + ivec2(0, 0),
        hTexel + ivec2(1, 0),
        hTexel + ivec2(0, 1),
        hTexel + ivec2(1, 1)
      );

      float weights[] = float[](
        (1.0 - f.x) * (1.0 - f.y),
        f.x * (1.0 - f.y),
        (1.0 - f.x) * f.y,
        f.x * f.y
      );

      vec4 diffuseHistory;
      vec4 specularHistory;
      float sum;

      // bilinear sampling, rejecting samples that don't have a matching mesh id
      for (int i = 0; i < 4; i++) {
        vec2 gCoord = (vec2(texel[i]) + 0.5) * hSizeInv;

        vec3 previousPosition = textureLinear(previousPositionTex, gCoord).xyz;
        vec4 previousNormalAndMeshId = texture(previousNormalTex, gCoord);
        vec3 previousNormal = normalize(previousNormalAndMeshId.xyz);
        int previousMeshId = int(previousNormalAndMeshId.w);

        float isValid =
          distance(previousPosition, currentPosition) / posDiff > 0.003 ||
          distance(previousNormal, currentNormal) > 1. ||
          previousMeshId != currentMeshId ||
          any(greaterThanEqual(texel[i], hSize)) ? 0.0 : 1.0;

        float weight = isValid * weights[i];
        diffuseHistory += weight * texelFetch(previousDiffuseSpecularTex, ivec3(texel[i], 0), 0);
        specularHistory += weight * texelFetch(previousDiffuseSpecularTex, ivec3(texel[i], 1), 0);
        sum += weight;
      }

      // if (sum <= 0.0) {
      //   // If all samples of bilinear fail, try a 3x3 box filter
      //   hTexel = ivec2(hTexelf + 0.5);

      //   for (int x = -1; x <= 1; x++) {
      //     for (int y = -1; y <= 1; y++) {
      //       ivec2 texel = hTexel + ivec2(x, y);
      //       vec2 gCoord = (vec2(texel) + 0.5) * hSizeInv;

      //       vec3 previousPosition = textureLinear(previousPositionTex, gCoord).xyz;
      //       vec4 previousNormalAndMeshId = texture(previousNormalTex, gCoord);
      //       vec3 previousNormal = normalize(previousNormalAndMeshId.xyz);
      //       int previousMeshId = int(previousNormalAndMeshId.w);

      //       float isValid =
      //         distance(previousPosition, currentPosition) / posDiff > 0.003 ||
      //         distance(previousNormal, currentNormal) > 1. ||
      //         previousMeshId != currentMeshId ||
      //         any(greaterThanEqual(texel, hSize)) ? 0.0 : 1.0;

      //       float weight = isValid;
      //       diffuseHistory += weight * texelFetch(previousDiffuseSpecularTex, ivec3(texel, 0), 0);
      //       specularHistory += weight * texelFetch(previousDiffuseSpecularTex, ivec3(texel, 1), 0);
      //       sum += weight;
      //     }
      //   }
      // }

      if (sum > 0.00001) {
        diffuseHistory /= sum;
        specularHistory /= sum;
      }
    #else
      vec4 diffuseHistory = texture(previousDiffuseSpecularTex, vec3(previousLightScale * vCoord, 0));
      vec4 specularHistory = texture(previousDiffuseSpecularTex, vec3(previousLightScale * vCoord, 1));
    #endif

    if (diffuseHistory.w > MAX_ROUGH_SURFACE_SAMPLES) {
      diffuseHistory.xyz *= MAX_ROUGH_SURFACE_SAMPLES / diffuseHistory.w;
      diffuseHistory.w = MAX_ROUGH_SURFACE_SAMPLES;
    }

    float roughness = texture(matPropsTex, vCoord).x;
    float maxSpecularSamples = mix(MAX_SMOOTH_SURFACE_SAMPLES, MAX_ROUGH_SURFACE_SAMPLES, roughness);
    if (specularHistory.w > maxSpecularSamples) {
      specularHistory.xyz *= maxSpecularSamples / specularHistory.w;
      specularHistory.w = maxSpecularSamples;
    }

    out_diffuse = blendAmount * diffuseHistory + currentDiffuse;
    out_specular = blendAmount * specularHistory + currentSpecular;
    // out_diffuse = vec4(normalDiff, normalDiff, normalDiff, 1.0);
    // out_specular = vec4(0, 0, 0, 1);
  }
`
}
