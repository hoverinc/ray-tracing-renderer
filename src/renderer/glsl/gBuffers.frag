export default {

outputs: ['faceNormal'],
source: `
  in vec3 vPosition;

  vec3 faceNormals(vec3 pos) {
    vec3 fdx = dFdx(pos);
    vec3 fdy = dFdy(pos);
    return normalize(cross(fdx, fdy));
  }

  void main() {
    out_faceNormal = vec4(0.5 * faceNormals(vPosition) + 0.5, 1);
  }
`

}
