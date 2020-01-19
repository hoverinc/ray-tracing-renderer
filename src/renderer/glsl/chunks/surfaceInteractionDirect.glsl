export default `

  uniform sampler2D gPosition;
  uniform sampler2D gNormal;
  uniform sampler2D gFaceNormal;
  uniform sampler2D gColor;

  void surfaceInteractionDirect(vec2 coord, inout SurfaceInteraction si) {
    vec4 positionMeshId = texture(gPosition, coord);
    vec4 normalRoughness = texture(gNormal, coord);
    vec4 faceNormalMetalness = texture(gFaceNormal, coord);
    vec4 colorMaterialType = texture(gColor, coord);

    si.position = positionMeshId.xyz;
    si.normal = normalRoughness.xyz;
    si.faceNormal = faceNormalMetalness.xyz;

    si.color = colorMaterialType.rgb;
    si.materialType = int(colorMaterialType.w);

    si.roughness = normalRoughness.w;
    si.metalness = faceNormalMetalness.w;

    si.hit = dot(si.normal, si.normal) > 0.0 ? true : false;
  }
`;
