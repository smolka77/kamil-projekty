import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createPipeline } from '../src/render/Pipeline.js';
import { createSkyLighting } from '../src/world/Sky.js';
import * as M from '../src/style/materials.js';

/**
 * Podgląd biblioteki materiałów w oświetleniu gry.
 * URL: ?quality=low|medium|high  ?still=1 (zamrożona animacja)  ?focus=<nazwa> (zbliżenie)  ?ao=ao (bufor AO)
 */
const q = new URLSearchParams(location.search);
const still = q.get('still') === '1';
const maxFrames = +(q.get('frames') || 0); // >0: zatrzymaj pętlę po N klatkach (szybkie zrzuty w headless)
const focus = q.get('focus');

const pipeline = createPipeline(document.getElementById('app'));
const renderer = pipeline.renderer;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.05, 2000);
const lighting = createSkyLighting(scene, renderer);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), M.turf());
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// sztuczna okluzja w atrybucie "color" (jak z silnika rzeźbienia): ciemniej u dołu i we wklęsłościach
function addAO(geo, k = 0.55) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) - bb.min.y) / Math.max(1e-6, bb.max.y - bb.min.y);
    const ao = 1 - k * Math.pow(1 - t, 2.2);
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = ao;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
const noUV = (geo) => {
  geo.deleteAttribute('uv');
  return geo;
};

const sphere = (r = 0.38) => noUV(new THREE.SphereGeometry(r, 64, 40));
const rbox = (s = 0.62) => noUV(new RoundedBoxGeometry(s, s, s, 6, 0.12));

const items = [
  // rząd górny
  ['skin', () => M.skin(0xe2a27e, { vertexColors: true }), () => addAO(sphere())],
  ['fabric cotton', () => M.fabric(0xe5573a, { kind: 'cotton', vertexColors: true }), () => addAO(rbox())],
  ['fabric denim', () => M.fabric(0x3b5d92, { kind: 'denim', vertexColors: true }), () => addAO(rbox())],
  ['fabric canvas', () => M.fabric(0xb39a68, { kind: 'canvas' }), () => rbox()],
  ['fabric knit', () => M.fabric(0x2e8f6c, { kind: 'knit', vertexColors: true }), () => addAO(sphere())],
  // środkowy
  ['leather', () => M.leather(0x6e4125, { vertexColors: true }), () => addAO(rbox())],
  ['rubber', () => M.rubber(0x2b2e35), () => sphere()],
  ['plastic', () => M.plastic(0xf2c22e, { vertexColors: true }), () => addAO(rbox())],
  ['metal', () => M.metal(0xb4b9c1), () => sphere()],
  ['metal painted', () => M.metal(0x2d6fd8, { painted: true, vertexColors: true }), () => addAO(rbox())],
  // dolny
  ['hair', () => M.hair(0x6b3a1f, { vertexColors: true }), () => addAO(noUV(new THREE.SphereGeometry(0.4, 64, 40).scale(1, 1.08, 1.12)))],
  ['eye', () => M.eye(0x3d8fd0), () => noUV(new THREE.SphereGeometry(0.34, 64, 40))],
  ['lens', () => M.lens(0x58e1ff), () => noUV(new THREE.SphereGeometry(0.38, 64, 32).scale(1, 0.6, 0.32))],
  ['emissive', () => M.emissive(0xff4d6a, 3.0), () => noUV(new THREE.TorusGeometry(0.26, 0.08, 24, 64))],
  ['plastic (bez AO)', () => M.plastic(0xffffff, { vertexColors: true }), () => rbox()], // vertexColors bez atrybutu → biały
];

const objects = [];
const labels = document.getElementById('labels');
const cols = 5;
items.forEach(([name, mk, geo], i) => {
  const row = Math.floor(i / cols);
  const col = i % cols;
  const mesh = new THREE.Mesh(geo(), mk());
  mesh.position.set((col - 2) * 1.45, 2.3 - row * 0.95, 0);
  if (name === 'eye') mesh.rotation.y = Math.PI; // tęczówka patrzy w -Z obiektu → obracamy ku kamerze (+Z)
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  scene.add(mesh);
  const el = document.createElement('div');
  el.className = 'lbl';
  el.textContent = name;
  labels.appendChild(el);
  objects.push({ mesh, el, spin: name !== 'eye' });
});

// SkinnedMesh: rurki 2-kościowe z atrybutem "color", po jednej na materiał (test skinningu + triplanaru bez "pływania")
function skinnedTube(material) {
  const geo = noUV(new THREE.CylinderGeometry(0.09, 0.11, 0.7, 32, 28, false));
  geo.translate(0, 0.35, 0);
  addAO(geo, 0.5);
  const p = geo.attributes.position;
  const si = new Uint16Array(p.count * 4);
  const sw = new Float32Array(p.count * 4);
  for (let i = 0; i < p.count; i++) {
    const t = THREE.MathUtils.smoothstep(p.getY(i), 0.25, 0.45);
    si[i * 4] = 0;
    si[i * 4 + 1] = 1;
    sw[i * 4] = 1 - t;
    sw[i * 4 + 1] = t;
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  const b0 = new THREE.Bone();
  const b1 = new THREE.Bone();
  b1.position.y = 0.35;
  b0.add(b1);
  const mesh = new THREE.SkinnedMesh(geo, material);
  mesh.add(b0);
  mesh.bind(new THREE.Skeleton([b0, b1]));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { mesh, b1 };
}
const skinMats = [
  M.skin(0xe2a27e, { vertexColors: true }),
  M.fabric(0xe5573a, { kind: 'cotton', vertexColors: true }),
  M.fabric(0x3b5d92, { kind: 'denim', vertexColors: true }),
  M.fabric(0xb39a68, { kind: 'canvas', vertexColors: true }),
  M.fabric(0x2e8f6c, { kind: 'knit', vertexColors: true }),
  M.leather(0x6e4125, { vertexColors: true }),
  M.rubber(0x2b2e35, { vertexColors: true }),
  M.plastic(0xf2c22e, { vertexColors: true }),
  M.metal(0xb4b9c1, { vertexColors: true }),
  M.metal(0x2d6fd8, { painted: true, vertexColors: true }),
  M.hair(0x6b3a1f, { vertexColors: true }),
  M.eye(0x3d8fd0, { vertexColors: true }),
  M.lens(0x58e1ff, { vertexColors: true }),
  M.emissive(0xff4d6a, 3, { vertexColors: true }),
];
const tubes = skinMats.map((m, i) => {
  const t = skinnedTube(m);
  t.mesh.position.set((i - (skinMats.length - 1) / 2) * 0.5, 0, 1.6);
  t.mesh.name = `skinned-${m.userData.smKind}`;
  scene.add(t.mesh);
  return t;
});

// kamera
const camPos = new THREE.Vector3(0, 1.5, 7.4);
const camTgt = new THREE.Vector3(0, 1.35, 0);
if (focus) {
  const o = focus === 'tubes' ? { mesh: tubes[6].mesh } : objects.find((x) => x.mesh.name === focus);
  if (o) {
    const p = o.mesh.position.clone();
    if (focus === 'tubes') p.set(0, 0.35, 1.6);
    camTgt.copy(p);
    camPos.copy(p).add(new THREE.Vector3(0, 0.12, focus === 'tubes' ? 3.2 : 1.5));
  }
}
camera.position.copy(camPos);
camera.lookAt(camTgt);
lighting.update(new THREE.Vector3(0, 0, 0), null, 0);

if (q.get('ao')) pipeline.setAOOutput(q.get('ao'));

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  pipeline.setSize(innerWidth, innerHeight);
});

const info = document.getElementById('info');
const clock = new THREE.Clock();
let t = 0.6;
let frames = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!still) t += dt;
  for (const o of objects) if (o.spin) o.mesh.rotation.y = t * 0.35;
  tubes.forEach((tb, i) => {
    tb.b1.rotation.z = Math.sin(t * 1.6 + i * 0.45) * 0.9;
    tb.mesh.rotation.y = t * 0.2;
  });
  pipeline.render(scene, camera);
  // etykiety
  const v = new THREE.Vector3();
  for (const o of objects) {
    v.copy(o.mesh.position);
    v.y -= 0.5;
    v.project(camera);
    o.el.style.display = v.z < 1 ? 'block' : 'none';
    o.el.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`;
    o.el.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
  }
  if ((frames++ & 15) === 0) {
    const i = pipeline.info();
    info.textContent = `jakość: ${i.quality}${i.auto ? ' (auto)' : ''}  post: ${i.post}  AO: ${i.ao}  bloom: ${i.bloom}  MSAA: ${i.msaa}\npixelRatio: ${i.pixelRatio.toFixed(2)}  klatka: ${i.frameMs} ms  programy: ${renderer.info.programs.length}`;
  }
  window.__frames = frames;
  if (maxFrames && frames >= maxFrames) return;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__preview = { scene, camera, pipeline, renderer, objects, tubes, M };
