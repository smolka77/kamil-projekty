// Podgląd karabinu (dev): ?rarity=epic, window.__rifle = { cam(pos,target,fov), fire(), render() }
import * as THREE from 'three';
import { createPipeline } from '../src/render/Pipeline.js';
import { createSkyLighting } from '../src/world/Sky.js';
import { AssaultRifle } from '../src/weapons/AssaultRifle.js';
import * as M from '../src/style/materials.js';

const q = new URLSearchParams(location.search);
const pipeline = createPipeline(document.getElementById('app'));
const renderer = pipeline.renderer;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.02, 500);
const lighting = createSkyLighting(scene, renderer);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), M.turf());
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const rifles = [];
const r1 = new AssaultRifle({ rarity: q.get('rarity') || 'rare' });
r1.group.position.set(0, 1.0, 0);
r1.group.rotation.y = Math.PI / 2; // lufa w +X... widok z boku
scene.add(r1.group);
rifles.push(r1);
const t0 = performance.now();
const r2 = new AssaultRifle({ rarity: 'epic' });
const buildMs = performance.now() - t0;
r2.group.position.set(0, 1.0, -0.6);
r2.group.rotation.y = -Math.PI / 2;
scene.add(r2.group);
rifles.push(r2);
camera.position.set(0.0, 1.15, 1.6);
camera.lookAt(0, 1.0, -0.2);
let last = performance.now();
function frame() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  for (const r of rifles) r.update(dt);
  lighting.update(new THREE.Vector3(0, 1, 0), camera, dt);
  pipeline.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
window.__rifle = {
  rifles, buildMs, tris: r1.triangles, pipeline,
  cam(pos, target, fov = 30) { camera.position.set(...pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(...target); },
  fire() { for (const r of rifles) r.showFlash(); },
  ready: true,
};
