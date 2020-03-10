let renderer;
let controls;
let scene;

const camera = new THREE.PerspectiveCamera();
camera.position.set(64, 32, 16);
camera.fov = 65;

const stats = new Stats();
stats.setMode(0); // 0: fps, 1: ms
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '0px';
stats.domElement.style.top = '0px';
document.body.appendChild(stats.domElement);

init();

window.addEventListener('resize', resize);

async function init() {
  const [envMap, envMapLDR, gltf] = await Promise.all([
    load(THREE.RGBELoader, '../envmaps/street-by-water.hdr'),
    load(THREE.TextureLoader, 'envmap.jpg'),
    load(THREE.GLTFLoader, 'scene.gltf'),
  ]);

  scene = new THREE.Scene();

  const model = gltf.scene;

  model.scale.set(0.5, 0.5, 0.5);
  model.rotateY(Math.PI / 2);

  model.traverse(child => {
    if (child instanceof THREE.Mesh) {
      // only necessary for WebGLRenderer
      child.castShadow = true;
      child.receiveShadow = true;
    }
    if (child.material && child.material.name == 'LensesMat') {
      child.material.transparent = true;
    }
  });

  const uiCallbacks = {
    WebGL: () => initWebGL(envMapLDR, model),
    RayTracing: () => initRayTracing(envMap, model)
  };

  const gui = new dat.GUI();
  gui.add(uiCallbacks, 'WebGL');
  gui.add(uiCallbacks, 'RayTracing');

  uiCallbacks.RayTracing();

  resize();

  // THREE.DefaultLoadingManager.onLoad = tick;
  tick();

  document.querySelector('#loading').remove();
}

function resize() {
  if (renderer.domElement.parentElement) {
    const width = renderer.domElement.parentElement.clientWidth;
    const height = renderer.domElement.parentElement.clientHeight;
    renderer.setSize(width, height);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function tick(time) {
  controls.update();
  camera.focus = controls.target.distanceTo(camera.position);
  stats.begin();

  if (renderer.sync) {
    renderer.sync(time);
  }

  renderer.render(scene, camera);
  stats.end();

  requestAnimationFrame(tick);
}

function initWebGL(envMapLDR, model) {
  unloadRenderer(renderer);
  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  initRenderer(renderer);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.add(model);

  const dirLight = new THREE.DirectionalLight(0xff3300, 0.3);
  dirLight.target.position = controls.target;
  scene.add(dirLight.target);
  dirLight.target.position.set(0, 20, 0);
  dirLight.castShadow = true;
  dirLight.position.setFromSphericalCoords(100, -1.31, 4.08);
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  scene.add(dirLight);

  const ambLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambLight);

  // const helper = new THREE.CameraHelper(dirLight.shadow.camera);
  // scene.add(helper);

  const equiToCube = new THREE.EquirectangularToCubeGenerator(envMapLDR);
  const cubeMap = equiToCube.renderTarget;
  const cubeMapTexture = equiToCube.update(renderer);

  scene.traverse(child => {
    if (child.material) {
      child.material.envMap = cubeMapTexture;
    }
  });

  scene.background = cubeMap;
}

function initRayTracing(envMap, model) {
  unloadRenderer(renderer);
  renderer = new THREE.RayTracingRenderer();
  initRenderer(renderer);

  scene = new THREE.Scene();

  scene.add(model);

  const envLight = new THREE.EnvironmentLight(envMap);
  scene.add(envLight);
}

function initRenderer(renderer) {
  document.body.appendChild(renderer.domElement);
  resize();

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.screenSpacePanning = true;
  controls.target.set(0, 20, 0);

  renderer.gammaOutput = true;
  renderer.gammaFactor = 2.2;
  renderer.setPixelRatio(1.0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  renderer.renderWhenOffFocus = false;
  renderer.bounces = 3;
}

function unloadRenderer(renderer) {
  if (renderer) {
    renderer.dispose();
    renderer.domElement.remove();
  }
  if (controls) {
    controls.dispose();
  }
}

function load(loader, url) {
  return new Promise(resolve => {
    const l = new loader();
    l.load(url, resolve, undefined, exception => { throw exception; });
  });
}
