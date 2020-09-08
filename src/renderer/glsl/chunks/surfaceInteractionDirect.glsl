export default `

  uniform sampler2D gPosition;
  uniform sampler2D gNormal;
  uniform sampler2D gFaceNormal;
  // uniform sampler2D gAlbedo;
  uniform sampler2D gMatProps;

  void surfaceInteractionDirect(vec2 coord, inout SurfaceInteraction si) {
    si.position = texture(gPosition, coord).xyz;

    si.normal = normalize(texture(gNormal, coord).xyz);

    si.faceNormal = normalize(texture(gFaceNormal, coord).xyz);

    si.albedo = vec3(1.0);

    vec4 matProps = texture(gMatProps, coord);
    si.roughness = matProps.x;
    si.metalness = matProps.y;
    si.materialType = int(matProps.z);

    si.hit = si.materialType > 0 ? true : false;
  }
`;
