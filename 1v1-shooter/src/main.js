import * as THREE from 'three';
import './style.css';
import { createWorld } from './world/World.js';
import { Input } from './player/Input.js';
import { Player } from './player/Player.js';
import { Dummy } from './Dummy.js';
import { Combat } from './combat/Combat.js';
import { HUD } from './ui/HUD.js';
import { Sfx } from './combat/Sfx.js';

// ---------- renderer / scena ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 2000);

const world = createWorld(scene, renderer);
const input = new Input(renderer.domElement);
const hud = new HUD();
const sfx = new Sfx();
const player = new Player(scene, camera, input);
const dummy = new Dummy(scene, player, new THREE.Vector3(0, 0, -8));
const combat = new Combat({ scene, camera, player, targets: [dummy], ground: world.ground, hud, sfx, input });
hud.setVitals(player.shield, player.health);

// ---------- stan gry: menu / gra / pauza ----------
const menu = document.getElementById('menu');
const playBtn = document.getElementById('play-btn');
const note = document.getElementById('menu-note');
let state = 'menu';
let fallbackMouse = false; // gdy przeglądarka nie pozwala przechwycić kursora

function setPlaying(v) {
  state = v ? 'playing' : 'paused';
  input.enabled = v;
  player.showcase = false;
  menu.classList.toggle('hidden', v);
  hud.show(v);
  if (!v) {
    playBtn.textContent = 'WRÓĆ DO GRY';
    note.textContent = 'Pauza. Kliknij, aby wrócić.';
  }
}

playBtn.addEventListener('click', () => {
  sfx.init();
  if (fallbackMouse) setPlaying(true);
  else input.requestLock();
});
input.onLockChange = (locked) => {
  if (locked) setPlaying(true);
  else if (state === 'playing' && !fallbackMouse) setPlaying(false);
};
input.onLockError = () => {
  // np. podgląd w ramce bez uprawnień — grasz z widocznym kursorem
  fallbackMouse = true;
  setPlaying(true);
};
renderer.domElement.addEventListener('click', () => {
  if (state === 'playing' && !input.locked && !fallbackMouse) input.requestLock();
});
addEventListener('keydown', (e) => {
  if (e.code === 'KeyH' && state === 'playing') hud.toggleHint();
  if (e.code === 'Escape' && fallbackMouse && state === 'playing') setPlaying(false);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- pętla ----------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const active = state === 'playing';

  player.update(dt, active);
  combat.update(dt, active);
  dummy.update(dt, camera);
  world.update(player.position);
  hud.update(dt, camera, {
    spread: combat.spread,
    reload: player.weapon.reloadProgress,
    mag: player.weapon.mag,
    sprinting: player.sprinting,
    emoting: player.emoting,
    mode: player.emoting ? 'taniec' : player.cameraMode,
  });

  renderer.render(scene, camera);
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// uchwyt do debugowania z konsoli
window.__game = {
  player,
  dummy,
  combat,
  input,
  camera,
  start: () => {
    fallbackMouse = true;
    setPlaying(true);
  },
};
