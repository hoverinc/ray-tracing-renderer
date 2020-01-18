export default `

  uniform sampler2D gPosition;
  uniform sampler2D gNormal;
  uniform sampler2D gFaceNormal;

  void surfaceInteractionDirect(vec2 coord, inout SurfaceInteraction si) {

    vec4 faceNormalAndMaterialIndex = texture(gFaceNormal, coord);
    si.hit = true;
    si.position = texture(gPosition, coord).xyz;
    si.normal = texture(gNormal, coord).xyz;
    si.faceNormal = faceNormalAndMaterialIndex.xyz;
    si.normal *= sign(dot(si.normal, si.faceNormal));

    int materialIndex = int(EPS + faceNormalAndMaterialIndex.w);

    si.color = materials.colorAndMaterialType[materialIndex].xyz;
    si.materialType = int(materials.colorAndMaterialType[materialIndex].w);

    si.roughness = clamp(materials.roughnessMetalnessNormalScale[materialIndex].x, 0.03, 1.0);
    si.metalness = clamp(materials.roughnessMetalnessNormalScale[materialIndex].y, 0.0, 1.0);
  }
`;
