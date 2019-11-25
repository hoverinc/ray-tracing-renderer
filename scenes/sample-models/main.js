// TODO: Support multiple hdr maps

// Dev HOST
// const HOST = 'https://localhost:8080';

// Remote HOST
const HOST = 'https://hoverinc.github.io/ray-tracing-renderer';

// Envinronment maps
const DEFAULT_ENV_MAP_PATH = 'scenes/envmaps/gray-background-with-dirlight.hdr';

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

let currentModelLoaded = null;
let groundMesh = null;

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

const tick = () => {
  controls.update();
  camera.focus = controls.target.distanceTo(camera.position);
  stats.begin();
  renderer.render(scene, camera);
  stats.end();
  requestAnimationFrame(tick);
};

function load(loader, url) {
  return new Promise(resolve => {
    const l = new loader();
    l.load(url, resolve, undefined, exception => { throw exception; });
  });
}

function createGroundMesh() {
  const geo = new THREE.PlaneBufferGeometry(10000, 10000);
  const mat = new THREE.MeshStandardMaterial();
  mat.color.set(0xffffff);
  mat.roughness = 1.0;
  mat.metalness = 0.0;
  mat.shadowCatcher = true;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 0, -5);
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
  const y = bounds.min.y;
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

async function init() {
  window.addEventListener('resize', resize);
  resize();

  const envMap = new THREE.RGBELoader().load(`${HOST}/${DEFAULT_ENV_MAP_PATH}`);
  const envLight = new THREE.EnvironmentLight(envMap);

  groundMesh = createGroundMesh();
  selectModelFromName(INITIAL_MODEL_DATA.name)
  scene.add(envLight);

  scene.add(groundMesh);
  scene.add(camera);

  const gui = new dat.GUI();
  const uiOptions = {
    selectedModelName: INITIAL_MODEL_DATA.name,
    modelOptions: MODEL_DATA.map(item => item.name),
  };

  const modelController = gui.add(uiOptions, 'selectedModelName', uiOptions.modelOptions)
    .name('model');

  modelController.onChange(async (value) => {
    selectModelFromName(value)
  });

  THREE.DefaultLoadingManager.onLoad = tick;
}

init();
