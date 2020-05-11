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

  void main() {
    vec2 bufferSize = vec2(textureSize(diffuseSpecularTex, 0));

    vec3 currentPosition = texture(positionTex, vCoord).xyz;
    float currentDepth = texture(positionTex, vCoord).w;

    float depthWidth = texture(matPropsTex, vCoord).w / max(previousLightScale.x, previousLightScale.y);

    vec3 currentNormal = normalize(texture(normalTex, vCoord).xyz);
    float normalWidth = texture(normalTex, vCoord).w;

    vec4 currentDiffuse = texture(diffuseSpecularTex, vec3(lightScale * vCoord, 0));
    vec4 currentSpecular = texture(diffuseSpecularTex, vec3(lightScale * vCoord, 1));

    vec4 matProps = texture(matPropsTex, vCoord);

    if (currentDepth == 0.0) {
      out_diffuse = currentDiffuse;
      out_specular = currentSpecular;
      return;
    }

    #ifdef REPROJECT
      vec4 clipPos = historyCamera * vec4(currentPosition, 1.0);
      vec2 hCoord = 0.5 * clipPos.xy / clipPos.w + 0.5 - jitter;

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

        vec3 previousNormal = normalize(texture(previousNormalTex, gCoord).xyz);
        float previousDepth = texture(previousPositionTex, gCoord).w;
        float isValid =
          abs(clipPos.z  - previousDepth) / (depthWidth + 0.001) > 1.0 ||
          distance(previousNormal, currentNormal) / (normalWidth + 0.001) > 20.0 ||
          any(greaterThanEqual(texel[i], hSize)) ? 0.0 : 1.0;

        float weight = isValid * weights[i];
        diffuseHistory += weight * texelFetch(previousDiffuseSpecularTex, ivec3(texel[i], 0), 0);
        specularHistory += weight * texelFetch(previousDiffuseSpecularTex, ivec3(texel[i], 1), 0);
        sum += weight;
      }

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

    float roughness = matProps.x;
    float maxSpecularSamples = mix(MAX_SMOOTH_SURFACE_SAMPLES, MAX_ROUGH_SURFACE_SAMPLES, roughness);
    if (specularHistory.w > maxSpecularSamples) {
      specularHistory.xyz *= maxSpecularSamples / specularHistory.w;
      specularHistory.w = maxSpecularSamples;
    }

    out_diffuse = blendAmount * diffuseHistory + currentDiffuse;
    out_specular = blendAmount * specularHistory + currentSpecular;
  }
`
}
