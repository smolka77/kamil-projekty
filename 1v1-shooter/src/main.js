import * as THREE from 'three';
import './style.css';
import { createWorld } from './world/World.js';
import { Input } from './player/Input.js';
import { Player } from './player/Player.js';
import { Dummy } from './Dummy.js';
import { Combat } from './combat/Combat.js';
import { HUD } from './ui/HUD.js';
import { Sfx } from './combat/Sfx.js';
import { createPipeline } from './render/Pipeline.js';
import { charactersReady } from './character/CharacterModel.js';

// ---------- renderer / scena ----------
// potok: HDR → GTAO → bloom → ACES → SMAA; jakość ?quality=low|medium|high (+ auto-skalowanie)
const pipeline = createPipeline(document.getElementById('app'));
const renderer = pipeline.renderer;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 2000);

const world = createWorld(scene, renderer);
world.setShadowMapSize(pipeline.info().shadowMapSize);
pipeline.onQualityChange = (info) => world.setShadowMapSize(info.shadowMapSize);
const input = new Input(renderer.domElement);
const hud = new HUD();
const sfx = new Sfx();
// postacie są rzeźbione proceduralnie przy starcie (≈1–2 s) — do tego czasu menu pokazuje "Ładowanie postaci…"
let player = null;
let dummy = null;
let combat = null;

// ---------- stan gry: menu / gra / pauza ----------
const menu = document.getElementById('menu');
const playBtn = document.getElementById('play-btn');
const note = document.getElementById('menu-note');
let state = 'menu';
const playLabel = playBtn.textContent;
playBtn.disabled = true;
playBtn.textContent = 'Ładowanie postaci…';
let fallbackMouse = false; // gdy przeglądarka nie pozwala przechwycić kursora

function setPlaying(v) {
  state = v ? 'playing' : 'paused';
  input.enabled = v;
  if (player) player.showcase = false;
  menu.classList.toggle('hidden', v);
  hud.show(v);
  if (!v) {
    playBtn.textContent = 'WRÓĆ DO GRY';
    note.textContent = 'Pauza. Kliknij, aby wrócić.';
  }
}

playBtn.addEventListener('click', () => {
  if (!player) return;
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
  pipeline.setSize(innerWidth, innerHeight);
});

// ---------- pętla ----------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const active = state === 'playing';
  if (!player) {
    // trwa generowanie postaci — samo tło menu
    camera.position.set(0, 1.4, 11.3);
    camera.lookAt(0.85, 1.0, 8);
    world.update(new THREE.Vector3(0, 0, 8), camera, dt);
    pipeline.render(scene, camera);
    requestAnimationFrame(frame);
    return;
  }

  player.update(dt, active);
  combat.update(dt, active);
  dummy.update(dt, camera);
  world.update(player.position, camera, dt);
  hud.update(dt, camera, {
    spread: combat.spread,
    reload: player.weapon.reloadProgress,
    mag: player.weapon.mag,
    sprinting: player.sprinting,
    emoting: player.emoting,
    mode: player.emoting ? 'taniec' : player.cameraMode,
  });

  pipeline.render(scene, camera);
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

async function boot() {
  await charactersReady;
  // jedna klatka, żeby przeglądarka zdążyła pokazać menu z napisem o ładowaniu
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  const t0 = performance.now();
  player = new Player(scene, camera, input);
  dummy = new Dummy(scene, player, new THREE.Vector3(0, 0, -8));
  combat = new Combat({ scene, camera, player, targets: [dummy], ground: world.ground, hud, sfx, input });
  hud.setVitals(player.shield, player.health);
  const genMs = performance.now() - t0;
  console.info(`Postacie gotowe w ${genMs.toFixed(0)} ms`);
  playBtn.disabled = false;
  playBtn.textContent = playLabel;

  // uchwyt do debugowania z konsoli
  window.__game = {
    pipeline,
    scene,
    world,
    player,
    dummy,
    combat,
    input,
    camera,
    genMs,
    start: () => {
      fallbackMouse = true;
      setPlaying(true);
    },
  };
}
boot();
