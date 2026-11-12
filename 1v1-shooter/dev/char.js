// dev/char.js — podgląd postaci (strona deweloperska, nie trafia do buildu gry).
// URL: ?skin=iskra|rival|both  &pose=bind|aim  &cam=face|face34|front|back|side|hands  &quality=low|medium|high
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createPipeline } from '../src/render/Pipeline.js';
import { createWorld } from '../src/world/World.js';
import { CharacterModel, charactersReady } from '../src/character/CharacterModel.js';
import { CharacterAnimator } from '../src/character/CharacterAnimator.js';
import { AssaultRifle } from '../src/weapons/AssaultRifle.js';

const q = new URLSearchParams(location.search);
const pipeline = createPipeline(document.getElementById('app'));
const renderer = pipeline.renderer;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.02, 500);
const world = createWorld(scene, renderer);
world.setShadowMapSize(pipeline.info().shadowMapSize);
const controls = new OrbitControls(camera, renderer.domElement);

await charactersReady;
const skins = (q.get('skin') || 'iskra') === 'both' ? ['iskra', 'rival'] : [q.get('skin') || 'iskra'];
const pose = q.get('pose') || 'bind';
const chars = [];
const t0 = performance.now();
skins.forEach((k, i) => {
  const t = performance.now();
  const model = new CharacterModel(k);
  const ms = performance.now() - t;
  model.root.position.set(skins.length > 1 ? (i - 0.5) * 1.3 : 0, 0, 0);
  model.root.rotation.y = +(q.get('yaw') || 0);
  scene.add(model.root);
  let anim = null, weapon = null;
  if (pose !== 'bind') {
    weapon = new AssaultRifle({ rarity: 'rare' });
    anim = new CharacterAnimator(model, weapon);
  }
  chars.push({ model, anim, weapon, ms });
});
const genMs = performance.now() - t0;
if (q.get('hit')) chars.forEach((c) => c.model.showHitboxes(true));

const CAMS = {
  face: [[0, 1.72, -0.75], [0, 1.715, 0], 30],
  face34: [[-0.5, 1.75, -0.6], [0, 1.715, 0], 30],
  faceside: [[-0.75, 1.72, -0.05], [0, 1.715, 0], 30],
  front: [[0, 1.05, -4.6], [0, 0.95, 0], 30],
  back: [[0, 1.1, 4.6], [0, 0.95, 0], 30],
  side: [[-4.6, 1.05, 0], [0, 0.95, 0], 30],
  front34: [[-2.6, 1.3, -3.8], [0, 0.95, 0], 30],
  hands: [[0.9, 1.45, -1.3], [0.1, 1.25, -0.2], 30],
  torso: [[-0.4, 1.35, -1.6], [0, 1.25, 0], 30],
  legs: [[-0.9, 0.5, -1.8], [0, 0.4, 0], 30],
  feet: [[-0.6, 0.25, -0.9], [0, 0.08, -0.05], 30],
  head: [[-0.6, 1.95, -0.9], [0, 1.78, 0], 30],
  headback: [[0.5, 1.9, 0.9], [0, 1.78, 0], 30],
};
function setCam(pos, target, fov = 30) {
  camera.position.fromArray(pos);
  controls.target.fromArray(target);
  camera.fov = fov;
  camera.updateProjectionMatrix();
  controls.update();
}
const c0 = CAMS[q.get('cam') || 'front'] || CAMS.front;
setCam(...c0);

const info = document.getElementById('info');
info.textContent = chars.map((c, i) => `${skins[i]}: ${c.ms.toFixed(0)} ms, ${c.model.stats.tris} tri`).join('\n') + `\nrazem ${genMs.toFixed(0)} ms`;

let frames = 0;
const clock = new THREE.Clock();
const st = { localForward: 0, localRight: 0, grounded: true, landImpact: 0, crouch: false, sprint: false, ads: false, pitch: 0, yawRate: 0, emote: false, emoteTime: 0 };
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  for (const c of chars) {
    if (c.anim) {
      Object.assign(st, window.__char.st);
      c.anim.updateBody(dt, st);
      c.model.root.updateMatrixWorld(true);
      c.anim.updateArms(dt, { fpp: false, aimPitch: st.pitch, aimYaw: c.model.root.rotation.y, bodyYaw: c.model.root.rotation.y }, camera);
      c.weapon.update(dt);
    }
  }
  world.update(new THREE.Vector3(), camera, dt);
  pipeline.render(scene, camera);
  frames++;
  window.__frames = frames;
  requestAnimationFrame(loop);
}
window.__char = { chars, setCam, CAMS, genMs, st: {}, pipeline, scene, camera, ready: true };
requestAnimationFrame(loop);
