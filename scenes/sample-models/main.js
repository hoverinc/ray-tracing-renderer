// Envinronment maps
const ENV_MAPS_SAMPLES = [
  {
    path: '../envmaps/gray-background-with-dirlight.hdr',
    name: 'Gray + Dir Light',
  },
  {
    path: '../envmaps/blurry-sunset-with-dirlight.hdr',
    name: 'Sunset + Dir Light',
  }
];

// Sample models from BabylonJS: http://models.babylonjs.com/
const BABYLON_JS_SAMPLE_MODELS = [
  {
    path: 'https://models.babylonjs.com/CornellBox/cornellBox.glb',
    name: 'Cornell Box',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  {
    path: 'https://models.babylonjs.com/PBR_Spheres.glb',
    name: 'PBR Spheres',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  {
    path: 'https://models.babylonjs.com/Lee-Perry-Smith-Head/head.glb',
    name: 'Lee Perry Smith Head',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  {
    path: 'https://models.babylonjs.com/Georgia-Tech-Dragon/dragon.glb',
    name: 'Georgia Tech Dragon',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
];

const MODEL_DATA = [...BABYLON_JS_SAMPLE_MODELS];
const INITIAL_MODEL_DATA = MODEL_DATA[0];
const INITIAL_ENV_MAP = ENV_MAPS_SAMPLES[0];

let currentModelLoaded = null;
let groundMesh = null;
let currentEnvLight = null;

const renderer = new THREE.RayTracingRenderer();

renderer.gammaOutput = true;
renderer.gammaFactor = 2.2;
renderer.setPixelRatio(1.0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.toneMappingWhitePoint = 5;

renderer.renderWhenOffFocus = false;
renderer.renderToScreen = true;

document.body.appendChild(renderer.domElement);

const stats = new Stats();
stats.setMode(0); // 0: fps, 1: ms
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '0px';
stats.domElement.style.top = '0px';
document.body.appendChild(stats.domElement);

const camera = new THREE.LensCamera();
camera.fov = 35;
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

let animationFrameId;

const tick = (time) => {
  controls.update();
  camera.focus = controls.target.distanceTo(camera.position);
  stats.begin();
  renderer.sync(time);
  renderer.render(scene, camera);
  stats.end();
  animationFrameId = requestAnimationFrame(tick);
};

function load(loader, url) {
  return new Promise(resolve => {
    const l = new loader();
    l.load(url, resolve, undefined, exception => { throw exception; });
  });
}

function createGroundMesh() {
  const geo = new THREE.PlaneBufferGeometry(100, 100);
  const mat = new THREE.MeshStandardMaterial();
  mat.color.set(0xffffff);
  mat.roughness = 0.5;
  mat.metalness = 0.0;
  mat.shadowCatcher = true;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotateX(Math.PI / 2);

  return mesh;
}

async function createModelFromData(data) {
  const gltfData = await load(THREE.GLTFLoader, data.path);
  const gltfScene = gltfData.scene;

  return gltfScene;
}

function computeBoundingBoxFromModel(model) {
  const bounds = new THREE.Box3();
  bounds.setFromObject(model);
  return bounds;
}

function updateCameraFromModel(camera, model) {
  const bounds = computeBoundingBoxFromModel(model);
  const centroid = new THREE.Vector3();
  bounds.getCenter(centroid);

  const distance = bounds.min.distanceTo(bounds.max);

  // TODO: Why do we need this?
  // controls.target.set(centroid);
  camera.position.set(0, (bounds.max.y - bounds.min.y) * 0.75, distance * 2.0);
  camera.aperture = 0.01 * distance;

  controls.target.copy(centroid);
  controls.update();

  console.log(`Camera at ${camera.position.toArray()}`);
}

function updateGroundMeshFromModel(groundMesh, model) {
  const bounds = computeBoundingBoxFromModel(model);

  const x = currentModelLoaded.position.x;
  const y = bounds.min.y - 0.005 * (bounds.max.y - bounds.min.y); // move slightly below bounds to prevent z-fighting
  const z = currentModelLoaded.position.z;

  groundMesh.position.set(x, y, z);
}

function updateSceneWithModel(model) {
  if (currentModelLoaded) {
    currentModelLoaded.parent.remove(currentModelLoaded);
  }

  scene.add(model);
  renderer.needsUpdate = true;
  currentModelLoaded = model;
  updateCameraFromModel(camera, model);
  updateGroundMeshFromModel(groundMesh, model);
}

async function selectModelFromName(name) {
  const modelEntry = MODEL_DATA.find(item => item.name === name);
  const model = await createModelFromData(modelEntry);
  updateSceneWithModel(model);

  console.log(`Switch to Model '${name}'`);
}

async function loadEnvironmentMap(path) {
  const loadPromise = new Promise((resolve) =>
    new THREE.RGBELoader().load(path, (environmentMapTexture) =>
      resolve(environmentMapTexture),
    ),
  );

  const environmentMap = await loadPromise;
  environmentMap.encoding = THREE.LinearEncoding;

  return environmentMap;
}

async function selectEnvMapFromName(name) {
  const envMapEntry = ENV_MAPS_SAMPLES.find(item => item.name === name);
  const envMap = await loadEnvironmentMap(envMapEntry.path);
  const envLight = new THREE.EnvironmentLight(envMap);

  if (currentEnvLight) scene.remove(currentEnvLight);
  scene.add(envLight);
  currentEnvLight = envLight;

  renderer.needsUpdate = true;

  console.log(`Switch to Env Map '${name}'`);
}

async function init() {
  window.addEventListener('resize', resize);
  resize();

  selectEnvMapFromName(INITIAL_ENV_MAP.name);

  groundMesh = createGroundMesh();
  selectModelFromName(INITIAL_MODEL_DATA.name);

  scene.add(groundMesh);
  scene.add(camera);

  const gui = new dat.GUI();
  const uiOptions = {
    selectedModelName: INITIAL_MODEL_DATA.name,
    selectedEnvMap: INITIAL_ENV_MAP.name,
    modelOptions: MODEL_DATA.map(item => item.name),
    envMapOptions: ENV_MAPS_SAMPLES.map(item => item.name),
  };

  const modelController = gui.add(uiOptions, 'selectedModelName', uiOptions.modelOptions)
    .name('model');

  const envMapController = gui.add(uiOptions, 'selectedEnvMap', uiOptions.envMapOptions)
    .name('env map');

  modelController.onChange(async (value) => {
    cancelAnimationFrame(animationFrameId);
    selectModelFromName(value);
  });

  envMapController.onChange(async (value) => {
    cancelAnimationFrame(animationFrameId);
    selectEnvMapFromName(value);
  });

  THREE.DefaultLoadingManager.onLoad = tick;
}

init();
