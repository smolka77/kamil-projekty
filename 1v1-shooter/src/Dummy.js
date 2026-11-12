import * as THREE from 'three';
import { CharacterModel } from './character/CharacterModel.js';
import { CharacterAnimator, damp } from './character/CharacterAnimator.js';
import { AssaultRifle } from './weapons/AssaultRifle.js';

const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const WHITE = new THREE.Color(0xffffff);

/**
 * Przeciwnik treningowy — ta sama postać w innym stroju (czerwona drużyna).
 * Stoi, obraca się w stronę gracza, przyjmuje obrażenia (tarcza → zdrowie),
 * po eliminacji odradza się.
 */
export class Dummy {
  constructor(scene, player, spawn = new THREE.Vector3(0, 0, -12)) {
    this.player = player;
    this.spawn = spawn.clone();
    this.model = new CharacterModel('rival');
    this.weapon = new AssaultRifle({ rarity: 'epic' });
    this.anim = new CharacterAnimator(this.model, this.weapon);
    scene.add(this.model.root);

    this.position = this.spawn.clone();
    this.bodyYaw = Math.PI;
    this.prevYaw = this.bodyYaw;
    this.maxHealth = 100;
    this.maxShield = 100;
    this.health = 100;
    this.shield = 100;
    this.alive = true;
    this.deadT = 0;
    this.sinceHit = 10;
    this.hitFlash = 0;
    this.spawnT = 1;

    this.hitMeshes = this.model.meshes;

    // pasek nad głową
    this.plate = document.createElement('div');
    this.plate.className = 'nameplate';
    this.plate.innerHTML = `
      <div class="np-name">${this.model.skin.name.toUpperCase()}</div>
      <div class="np-bar np-shield"><div class="np-fill"></div></div>
      <div class="np-bar np-health"><div class="np-fill"></div></div>`;
    document.getElementById('nameplates').appendChild(this.plate);
    this.shieldFill = this.plate.querySelector('.np-shield .np-fill');
    this.healthFill = this.plate.querySelector('.np-health .np-fill');
    this.updatePlate();
  }

  updatePlate() {
    this.shieldFill.style.width = `${(this.shield / this.maxShield) * 100}%`;
    this.healthFill.style.width = `${(this.health / this.maxHealth) * 100}%`;
  }

  /** Zwraca rozbicie obrażeń na tarczę i zdrowie. */
  takeDamage(amount) {
    if (!this.alive) return null;
    const toShield = Math.min(this.shield, amount);
    this.shield -= toShield;
    const toHealth = Math.min(this.health, amount - toShield);
    this.health -= toHealth;
    this.sinceHit = 0;
    this.hitFlash = 1;
    this.anim.hitReact();
    let killed = false;
    if (this.health <= 0) {
      killed = true;
      this.alive = false;
      this.deadT = 0;
    }
    this.updatePlate();
    return { toShield, toHealth, killed };
  }

  respawn() {
    this.alive = true;
    this.health = this.maxHealth;
    this.shield = this.maxShield;
    this.position.copy(this.spawn);
    this.model.root.rotation.x = 0;
    this.spawnT = 0;
    this.updatePlate();
  }

  update(dt, camera) {
    const root = this.model.root;
    this.sinceHit += dt;

    // regeneracja (tryb treningowy)
    if (this.alive && this.sinceHit > 4 && (this.health < this.maxHealth || this.shield < this.maxShield)) {
      this.health = this.maxHealth;
      this.shield = this.maxShield;
      this.updatePlate();
    }

    if (this.alive) {
      const dx = this.player.position.x - this.position.x;
      const dz = this.player.position.z - this.position.z;
      const targetYaw = Math.atan2(-dx, -dz);
      this.bodyYaw += angleDiff(this.bodyYaw, targetYaw) * (1 - Math.exp(-3 * dt));
    }
    const yawRate = angleDiff(this.prevYaw, this.bodyYaw) / Math.max(dt, 1e-4);
    this.prevYaw = this.bodyYaw;

    root.position.copy(this.position);
    root.rotation.y = this.bodyYaw;

    this.spawnT = Math.min(1, this.spawnT + dt * 2.5);
    const sp = 1 - Math.pow(1 - this.spawnT, 3);
    let scale = sp;

    if (!this.alive) {
      this.deadT += dt;
      const fall = Math.min(1, this.deadT / 0.45);
      root.rotation.x = (fall * fall) * 1.45;
      if (this.deadT > 1.2) {
        const sink = Math.min(1, (this.deadT - 1.2) / 0.6);
        scale = 1 - sink;
      }
      if (this.deadT > 2.6) this.respawn();
    }
    root.scale.setScalar(Math.max(0.001, scale));

    this.anim.updateBody(dt, {
      localForward: 0,
      localRight: 0,
      grounded: true,
      landImpact: 0,
      crouch: false,
      sprint: false,
      ads: false,
      pitch: 0,
      yawRate: this.alive ? yawRate : 0,
      emote: false,
      emoteTime: 0,
    });
    root.updateMatrixWorld(true);
    this.anim.updateArms(dt, { fpp: false, aimPitch: 0, aimYaw: this.bodyYaw, bodyYaw: this.bodyYaw }, null);
    root.updateMatrixWorld(true);

    // błysk przy trafieniu
    this.hitFlash = damp(this.hitFlash, 0, 14, dt);
    const fl = this.hitFlash;
    for (const m of this.model.materials) {
      if (m.userData.baseEmissive === undefined) m.userData.baseEmissive = m.emissive.clone();
      m.emissive.copy(m.userData.baseEmissive).lerp(WHITE, fl * 0.55);
    }

    // pasek nad głową
    const head = this.model.bones.head.getWorldPosition(new THREE.Vector3());
    head.y += 0.55;
    const ndc = head.clone().project(camera);
    const visible = this.alive && ndc.z < 1 && Math.abs(ndc.x) < 1.2 && Math.abs(ndc.y) < 1.2;
    this.plate.style.display = visible ? 'block' : 'none';
    if (visible) {
      const x = (ndc.x * 0.5 + 0.5) * innerWidth;
      const y = (-ndc.y * 0.5 + 0.5) * innerHeight;
      this.plate.style.transform = `translate(${x - 60}px, ${y - 30}px)`;
    }
  }
}
