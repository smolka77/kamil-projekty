// dev/lab.js — laboratorium silnika rzeźbienia SDF (src/sculpt). Strona deweloperska, nie trafia do buildu gry.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { sculptCharacter } from '../src/sculpt/index.js';
import { simpleFigure, benchFigure, countPrims } from './testFigure.js';

const errEl = document.getElementById('err');
const logErr = (e) => {
  console.error(e);
  errEl.textContent += String(e && e.stack ? e.stack : e) + '\n';
};
addEventListener('error', (e) => logErr(e.error || e.message));

// ---------- renderer / scena ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.02, 100);
camera.position.set(0.9, 1.45, -2.6);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.15, 0);
controls.update();

// niebo jako IBL (PMREM ze sceny z gradientem i słońcem)
function makeSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x3d8fe8) },
      horizon: { value: new THREE.Color(0xd9efff) },
      ground: { value: new THREE.Color(0x6f8a5a) },
    },
    vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; varying vec3 vDir;
      void main(){
        float y = vDir.y;
        vec3 c = y > 0.0 ? mix(horizon, top, pow(y, 0.6)) : mix(horizon, ground, pow(-y, 0.4));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), mat);
}
const sky = makeSky();
scene.add(sky);
{
  const envScene = new THREE.Scene();
  envScene.add(makeSky());
  const sun = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.95, 0.85).multiplyScalar(40) }));
  sun.position.set(-20, 30, -25);
  envScene.add(sun);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;
  scene.environmentIntensity = 0.8;
}
const sunLight = new THREE.DirectionalLight(0xfff1dc, 2.6);
sunLight.position.set(-2.5, 4.5, -3);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -1.5;
sunLight.shadow.camera.right = 1.5;
sunLight.shadow.camera.top = 2.2;
sunLight.shadow.camera.bottom = -0.5;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 12;
sunLight.shadow.bias = -0.0004;
sunLight.shadow.normalBias = 0.02;
sunLight.shadow.radius = 4;
scene.add(sunLight);
const rim = new THREE.DirectionalLight(0xcfe6ff, 0.9);
rim.position.set(2, 2.5, 3);
scene.add(rim);

const ground = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshStandardMaterial({ color: 0x7cba5a, roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ---------- figura ----------
const ui = {
  fig: document.getElementById('fig'),
  view: document.getElementById('view'),
  elbow: document.getElementById('elbow'),
  elbowVal: document.getElementById('elbowVal'),
  anim: document.getElementById('anim'),
  rebuild: document.getElementById('rebuild'),
  stats: document.getElementById('stats'),
};

let char = null;
let figName = 'simple';
const timings = [];
const origMats = new Map();
const origColors = new Map();

function makeDef(name) {
  return name === 'bench' ? benchFigure() : simpleFigure();
}

function build(name = figName) {
  if (char) {
    scene.remove(char.root);
    for (const m of Object.values(char.meshes)) {
      m.geometry.dispose();
    }
  }
  origMats.clear();
  origColors.clear();
  figName = name;
  const def = makeDef(name);
  const nPrims = countPrims(def);
  const t0 = performance.now();
  char = sculptCharacter(def);
  const ms = performance.now() - t0;
  timings.push({ name, ms, stats: char.stats });
  scene.add(char.root);
  for (const m of Object.values(char.meshes)) {
    origMats.set(m, m.material);
    origColors.set(m, m.geometry.getAttribute('color'));
  }
  const s = char.stats;
  const lines = [
    `figura: ${name}  (${def.layers.length} warstw, ${nPrims} prymitywów)`,
    `trójkąty: ${s.tris.toLocaleString('pl-PL')}  wierzchołki: ${s.verts.toLocaleString('pl-PL')}`,
    `czas całkowity: ${s.totalMs.toFixed(0)} ms`,
    `  kompilacja ${s.compileMs.toFixed(0)} | siatki ${s.meshMs.toFixed(0)} | ukrywanie ${s.cullMs.toFixed(0)}`,
    `  AO ${s.aoMs.toFixed(0)} | wagi ${s.skinMs.toFixed(0)} | kolory ${s.paintMs.toFixed(0)} | three ${s.buildMs.toFixed(0)}`,
    '',
    ...Object.entries(s.layers).map(([k, v]) => `${k.padEnd(7)} ${String(v.tris).padStart(6)} tr  ${(v.voxel * 1000).toFixed(1)}mm  ${v.meshMs.toFixed(0)}ms`),
  ];
  ui.stats.textContent = lines.join('\n');
  setView(ui.view.value);
  applyPose();
  return { ms, stats: s };
}

// ---------- widoki ----------
const basicMat = new THREE.MeshBasicMaterial({ vertexColors: true });
const normalMat = new THREE.MeshNormalMaterial();
const wireMat = new THREE.MeshBasicMaterial({ color: 0x102030, wireframe: true });

function weightColors(mesh) {
  const si = mesh.geometry.getAttribute('skinIndex');
  const sw = mesh.geometry.getAttribute('skinWeight');
  const bones = mesh.skeleton.bones;
  const n = si.count;
  const col = new Float32Array(n * 3);
  const c = new THREE.Color();
  for (let v = 0; v < n; v++) {
    let w = 0;
    for (let k = 0; k < 4; k++) {
      const b = bones[si.getComponent(v, k)];
      if (b && b.name.startsWith('forearm')) w += sw.getComponent(v, k);
    }
    c.setHSL(0.66 * (1 - w), 0.9, 0.5);
    col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b;
  }
  return new THREE.BufferAttribute(col, 3);
}

function setView(mode) {
  if (!char) return;
  for (const m of Object.values(char.meshes)) {
    const oc = origColors.get(m);
    if (oc) m.geometry.setAttribute('color', oc);
    if (mode === 'shaded') m.material = origMats.get(m);
    else if (mode === 'ao') m.material = basicMat;
    else if (mode === 'normals') m.material = normalMat;
    else if (mode === 'wire') m.material = wireMat;
    else if (mode === 'weights') {
      m.geometry.setAttribute('color', weightColors(m));
      m.material = basicMat;
    }
  }
}

// ---------- poza ----------
let elbowDeg = 0;
function applyPose() {
  if (!char) return;
  const a = (elbowDeg * Math.PI) / 180;
  for (const side of ['L', 'R']) {
    const fa = char.bones['forearm' + side];
    if (!fa) continue;
    // bind pose ma rotację (A-pose) — zgięcie wokół lokalnej osi X kości
    fa.userData.bindQ = fa.userData.bindQ || fa.quaternion.clone();
    fa.quaternion.copy(fa.userData.bindQ).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), a));
  }
}

ui.fig.addEventListener('change', () => build(ui.fig.value));
ui.view.addEventListener('change', () => setView(ui.view.value));
ui.elbow.addEventListener('input', () => {
  elbowDeg = +ui.elbow.value;
  ui.elbowVal.textContent = elbowDeg;
  applyPose();
});
ui.rebuild.addEventListener('click', () => build(figName));

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
let paused = false;
function loop() {
  requestAnimationFrame(loop);
  if (paused) return;
  const t = clock.getElapsedTime();
  if (ui.anim.checked) {
    elbowDeg = 70 + 65 * Math.sin(t * 1.5);
    ui.elbow.value = elbowDeg;
    ui.elbowVal.textContent = elbowDeg.toFixed(0);
    applyPose();
  }
  controls.update();
  renderer.render(scene, camera);
}

try {
  const q = new URLSearchParams(location.search).get('fig');
  const first = q === 'bench' ? 'bench' : 'simple';
  ui.fig.value = first;
  build(first);
} catch (e) {
  logErr(e);
}
requestAnimationFrame(loop);

// uchwyt do testów (headless)
window.__lab = {
  get char() {
    return char;
  },
  timings,
  build,
  setView: (m) => {
    ui.view.value = m;
    setView(m);
  },
  setElbow: (deg) => {
    elbowDeg = deg;
    ui.elbow.value = deg;
    ui.elbowVal.textContent = deg;
    applyPose();
  },
  cam: (pos, target, fov) => {
    camera.position.set(...pos);
    controls.target.set(...target);
    if (fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    controls.update();
  },
  /** n przebiegów pełnej postaci bez dodawania do sceny — zwraca czasy (ms) */
  bench: (n = 3, name = 'bench') => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const c = sculptCharacter(makeDef(name));
      out.push({ total: c.stats.totalMs, compile: c.stats.compileMs, mesh: c.stats.meshMs, cull: c.stats.cullMs, ao: c.stats.aoMs, skin: c.stats.skinMs, paint: c.stats.paintMs, three: c.stats.buildMs, tris: c.stats.tris });
      for (const m of Object.values(c.meshes)) m.geometry.dispose();
    }
    return out;
  },
  /** wstrzymanie renderowania (pomiary czasu bez konkurencji software'owego GL o CPU) */
  pause: (v = true) => {
    paused = v;
  },
  renderer,
  scene,
  camera,
  ready: true,
};
