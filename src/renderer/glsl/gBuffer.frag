export default {

outputs: ['position', 'normal', 'faceNormal'],
source: `
  in vec3 vPosition;
  in vec3 vNormal;
  in float vMaterialIndex;

  vec3 faceNormals(vec3 pos) {
    vec3 fdx = dFdx(pos);
    vec3 fdy = dFdy(pos);
    return normalize(cross(fdx, fdy));
  }

  void main() {
    out_position = vec4(vPosition, 1);
    out_normal = vec4(normalize(vNormal), 1);
    out_faceNormal = vec4(faceNormals(vPosition), vMaterialIndex);
  }
`

}
