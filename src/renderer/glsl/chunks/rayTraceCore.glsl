export default `
  #define STANDARD 0
  #define THIN_GLASS 1
  #define THICK_GLASS 2
  #define SHADOW_CATCHER 3

  const float IOR = 1.5;
  const float INV_IOR = 1.0 / IOR;

  const float IOR_THIN = 1.015;
  const float INV_IOR_THIN = 1.0 / IOR_THIN;

  const float R0 = (1.0 - IOR) * (1.0 - IOR)  / ((1.0 + IOR) * (1.0 + IOR));

  // https://www.w3.org/WAI/GL/wiki/Relative_luminance
  const vec3 luminance = vec3(0.2126, 0.7152, 0.0722);

  #define RAY_MAX_DISTANCE 9999.0

  struct Ray {
    vec3 o;
    vec3 d;
    vec3 invD;
    float tMax;
  };

  struct SurfaceInteraction {
    bool hit;
    vec3 position;
    vec3 normal; // smoothed normal from the three triangle vertices
    vec3 faceNormal; // normal of the triangle
    vec3 color;
    float roughness;
    float metalness;
    int materialType;
  };

  struct Camera {
    mat4 transform;
    float aspect;
    float fov;
    float focus;
    float aperture;
  };

  void initRay(inout Ray ray, vec3 origin, vec3 direction) {
    ray.o = origin;
    ray.d = direction;
    ray.invD = 1.0 / ray.d;
    ray.tMax = RAY_MAX_DISTANCE;
  }

  // given the index from a 1D array, retrieve corresponding position from packed 2D texture
  ivec2 unpackTexel(int i, int columnsLog2) {
    ivec2 u;
    u.y = i >> columnsLog2; // equivalent to (i / 2^columnsLog2)
    u.x = i - (u.y << columnsLog2); // equivalent to (i % 2^columnsLog2)
    return u;
  }

  vec4 fetchData(sampler2D s, int i, int columnsLog2) {
    return texelFetch(s, unpackTexel(i, columnsLog2), 0);
  }

  ivec4 fetchData(isampler2D s, int i, int columnsLog2) {
    return texelFetch(s, unpackTexel(i, columnsLog2), 0);
  }

  struct Path {
    Ray ray;
    vec3 li;
    float alpha;
    vec3 beta;
    bool specularBounce;
    bool abort;
    float misWeight;
  };

  uniform Camera camera;
  uniform vec2 pixelSize; // 1 / screenResolution
  uniform vec2 jitter;

  in vec2 vCoord;
`;
