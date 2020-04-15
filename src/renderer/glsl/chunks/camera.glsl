export default `
  struct Camera {
    mat4 transform;
    float aspect;
    float focalLength;
  };

  vec3 getCameraDirection(Camera camera, vec2 coord) {
    vec3 perspective = vec3(coord - 0.5, -1.0) * vec3(camera.aspect, 1.0, camera.focalLength);
    return normalize(mat3(camera.transform) * perspective);
  }

  vec2 cartesianToEquirect(vec3 direction) {
    float phi = mod(atan(-direction.z, -direction.x), TWOPI);
    float theta = acos(direction.y);
    return vec2(phi * 0.5 * INVPI, theta * INVPI);
  }

`
