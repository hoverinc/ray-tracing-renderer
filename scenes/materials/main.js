
const renderer = new THREE.RayTracingRenderer();
renderer.setPixelRatio(1.0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.toneMappingWhitePoint = 5;

renderer.maxHardwareUsage = true;

document.body.appendChild(renderer.domElement);

const stats = new Stats();
stats.setMode(0); // 0: fps, 1: ms
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '0px';
stats.domElement.style.top = '0px';
document.body.appendChild(stats.domElement);

const camera = new THREE.LensCamera();
camera.position.set(-4, 1, -10);
camera.fov = 70;
camera.aperture = 0.01;

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.screenSpacePanning = true;

const scene = new THREE.Scene();

function resize() {
  if (renderer.domElement.parentElement) {
    const width = renderer.domElement.parentElement.clientWidth;
    const height = renderer.domElement.parentElement.clientHeight;
    renderer.setSize(width, height);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

window.addEventListener('resize', resize);
resize();

const tick = () => {
  controls.update();
  camera.focus = controls.target.distanceTo(camera.position);
  stats.begin();
  renderer.render(scene, camera);
  stats.end();
  requestAnimationFrame(tick);
};

const geo = new THREE.SphereBufferGeometry(4, 24, 24);

function makeMesh() {
  const mat = new THREE.RayTracingMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 4, 0);
  return mesh;
}

function init() {
  const envmap = new THREE.RGBELoader().load('envmap.hdr');
  const envLight = new THREE.EnvironmentLight(envmap);
  scene.add(envLight);

  const model = new THREE.Object3D();
  model.rotateY(Math.PI / 2);

  // house model
  controls.target.set(0, 2, 0);
  camera.position.set(-31, 21, 1);

  // smooth
  {
    const mesh = makeMesh();
    mesh.position.setX(-15);
    mesh.position.setZ(15);
    mesh.material.roughness = 0.0;
    mesh.material.metalness = 0.0;
    mesh.material.color.set(0xaa3333);
    model.add(mesh);
  }

  // diffuse
  {
    const mesh = makeMesh();
    mesh.position.setX(-5);
    mesh.position.setZ(15);
    mesh.material.roughness = 1.0;
    mesh.material.metalness = 0.0;
    mesh.material.color.set(0x222288);
    model.add(mesh);
  }

  // smooth metal
  {
    const mesh = makeMesh();
    mesh.position.setX(5);
    mesh.position.setZ(15);
    mesh.material.roughness = 0.0;
    mesh.material.metalness = 1.0;
    mesh.material.color.set(0xaaaa33);
    model.add(mesh);
  }

  //rough metal
  {
    const mesh = makeMesh();
    mesh.position.setX(15);
    mesh.position.setZ(15);
    mesh.material.roughness = 1.0;
    mesh.material.metalness = 1.0;
    mesh.material.color.set(0x33aa33);
    model.add(mesh);
  }

  // diffuse mapping
  {
    const mesh = makeMesh();
    mesh.position.setX(15);
    mesh.position.setZ(-15);
    mesh.material.roughness = 1.0;
    mesh.material.metalness = 0.0;
    mesh.material.map = new THREE.TextureLoader().load('diffuse.png');
    model.add(mesh);
  }

  // roughness/metalness mapping
  {
    const mesh = makeMesh();
    mesh.position.setX(5);
    mesh.position.setZ(-15);
    mesh.material.roughness = 1.0;
    mesh.material.metalness = 1.0;
    mesh.material.color.set(0x333333);
    mesh.material.roughnessMap = new THREE.TextureLoader().load('roughness.png');
    mesh.material.metalnessMap = new THREE.TextureLoader().load('metalness.png');
    model.add(mesh);
  }

  // normal mapping
  {
    const mesh = makeMesh();
    mesh.position.setX(-5);
    mesh.position.setZ(-15);
    mesh.material.roughness = 0.1;
    mesh.material.metalness = 1.0;
    mesh.material.color.set(0xcccccc);
    mesh.material.normalMap = new THREE.TextureLoader().load('normal.png');
    model.add(mesh);
  }

  // combined mapping
  {
    const mesh = makeMesh();
    mesh.position.setX(-15);
    mesh.position.setZ(-15);
    mesh.material.roughness = 1.0;
    mesh.material.metalness = 1.0;
    mesh.material.map = new THREE.TextureLoader().load('diffuse.png');
    mesh.material.normalMap = new THREE.TextureLoader().load('normal.png');
    const metalrough = new THREE.TextureLoader().load('metalrough.png');
    mesh.material.roughnessMap = metalrough;
    mesh.material.metalnessMap = metalrough;
    model.add(mesh);
  }

  // hollow glass
  {
    const mesh = makeMesh();
    mesh.position.setX(-10);
    mesh.material.transparent = true;
    mesh.material.color.set(0xeeeeee);
    model.add(mesh);
  }

  // solid glass
  {
    const mesh = makeMesh();
    mesh.position.setX(10);
    mesh.material.transparent = true;
    mesh.material.solid = true;
    mesh.material.color.set(0x8888ee);
    model.add(mesh);
  }

  // textured glass
  {
    const mesh = makeMesh();
    mesh.material.transparent = true;
    mesh.material.solid = true;
    mesh.material.map = new THREE.TextureLoader().load('glass_diffuse.png');
    mesh.material.normalMap = new THREE.TextureLoader().load('glass_normal.png');
    mesh.material.normalScale.set(1.0, -1.0);
    model.add(mesh);
  }

  // ground plane
  {
    const geo = new THREE.PlaneBufferGeometry(10000, 10000);
    const mat = new THREE.MeshStandardMaterial();
    mat.shadowCatcher = true;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotateX(Math.PI / 2);
    model.add(mesh);
  }

  scene.add(model);

  THREE.DefaultLoadingManager.onLoad = tick;
}

init();
