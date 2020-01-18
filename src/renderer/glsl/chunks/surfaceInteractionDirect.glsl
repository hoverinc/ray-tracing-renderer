export default `

  uniform sampler2D gPosition;
  uniform sampler2D gNormal;
  uniform sampler2D gFaceNormal;

  void surfaceInteractionDirect(vec2 coord, inout SurfaceInteraction si) {
    si.hit = true;
    si.position = texture(gPosition, coord).xyz;
    si.normal = texture(gNormal, coord).xyz;
    si.faceNormal = texture(gFaceNormal, coord).xyz;

    si.normal *= sign(dot(si.normal, si.faceNormal));
    int materialIndex = int(EPS + texture(gFaceNormal, coord).w);

    si.color = materials.colorAndMaterialType[materialIndex].xyz;
    si.roughness = materials.roughnessMetalnessNormalScale[materialIndex].x;
    si.metalness = materials.roughnessMetalnessNormalScale[materialIndex].y;
    si.materialType = int(materials.colorAndMaterialType[materialIndex].w);
  }
`;
