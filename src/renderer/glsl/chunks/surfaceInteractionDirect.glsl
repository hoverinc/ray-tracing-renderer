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

    si.color = vec3(1.0);
    si.roughness = 0.8;
    si.metalness = 0.0;
    si.materialType = 0;
  }
`;
