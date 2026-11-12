import * as THREE from 'three';
import { CharacterModel } from '../character/CharacterModel.js';
import { CharacterAnimator, damp, clamp } from '../character/CharacterAnimator.js';
import { AssaultRifle } from '../weapons/AssaultRifle.js';

const lerp = (a, b, t) => a + (b - a) * t;
const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const dampAngle = (a, b, rate, dt) => a + angleDiff(a, b) * (1 - Math.exp(-rate * dt));

const MOVE = {
  run: 5.5,
  sprint: 8.0,
  crouch: 2.8,
  ads: 3.4,
  adsCrouch: 2.2,
  jump: 9.0,
  gravity: 26,
};

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _tpp = new THREE.Vector3();
const _eye = new THREE.Vector3();

export class Player {
  constructor(scene, camera, input) {
    this.camera = camera;
    this.input = input;

    this.model = new CharacterModel('iskra');
    this.weapon = new AssaultRifle({ rarity: 'rare' });
    this.anim = new CharacterAnimator(this.model, this.weapon);
    scene.add(this.model.root);

    this.position = new THREE.Vector3(0, 0, 8);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = -0.05;
    this.bodyYaw = 0;
    this.prevBodyYaw = 0;
    this.grounded = true;
    this.landImpact = 0;
    this.crouching = false;
    this.sprinting = false;
    this.ads = false;
    this.cameraMode = 'tpp';
    this.emoting = false;
    this.emoteTime = 0;
    this.emoteSpin = 0;
    this.emoteCamYaw = 0;
    this.fireLock = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.health = 100;
    this.shield = 100;
    this.showcase = true; // menu: kamera pokazuje postać od przodu
    this.showcaseT = 0;

    this.cam = { ads: 0, crouch: 0, emote: 0, pivotY: null, fov: 72 };
  }

  get speed() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  /** Kierunek celowania (z uwzględnieniem odrzutu). */
  get aimPitch() {
    return this.pitch + this.recoilPitch;
  }
  get aimYaw() {
    return this.yaw + this.recoilYaw;
  }

  toggleEmote() {
    if (this.emoting) return this.stopEmote();
    if (!this.grounded || this.weapon.reloading) return;
    this.emoting = true;
    this.emoteTime = 0;
    this.emoteSpin = 1.0;
    this.emoteCamYaw = this.bodyYaw + Math.PI;
    this.crouching = false;
  }

  stopEmote() {
    this.emoting = false;
  }

  /** Wywoływane przez system walki przy każdym strzale. */
  onShot() {
    this.fireLock = 0.35;
    this.sprinting = false;
    const k = this.ads ? 0.55 : 1;
    this.recoilPitch += (0.009 + Math.random() * 0.006) * k;
    this.recoilYaw += (Math.random() - 0.5) * 0.01 * k;
    this.pitch += 0.0015 * k; // niewielki trwały podrzut
    this.anim.kick();
  }

  update(dt, active) {
    const inp = this.input;

    // ---------- rozglądanie ----------
    const m = inp.consumeMouse();
    if (active) {
      const sens = 0.0022 * (this.ads ? 0.62 : 1);
      this.yaw -= m.x * sens;
      this.pitch -= m.y * sens;
      const kr = 2.4 * dt;
      if (inp.down('ArrowLeft')) this.yaw += kr;
      if (inp.down('ArrowRight')) this.yaw -= kr;
      if (inp.down('ArrowUp')) this.pitch += kr * 0.7;
      if (inp.down('ArrowDown')) this.pitch -= kr * 0.7;
      this.pitch = clamp(this.pitch, -1.25, 1.3);
    }
    this.recoilPitch = damp(this.recoilPitch, 0, 7, dt);
    this.recoilYaw = damp(this.recoilYaw, 0, 7, dt);

    // ---------- przełączniki ----------
    if (active) {
      if (inp.pressed('KeyV')) this.cameraMode = this.cameraMode === 'tpp' ? 'fpp' : 'tpp';
      if (inp.pressed('KeyC') && !this.emoting) this.crouching = !this.crouching;
      if (inp.pressed('KeyB')) this.toggleEmote();
    }

    // ---------- ruch ----------
    let ix = 0;
    let iz = 0;
    if (active) {
      ix = (inp.down('KeyD') ? 1 : 0) - (inp.down('KeyA') ? 1 : 0);
      iz = (inp.down('KeyW') ? 1 : 0) - (inp.down('KeyS') ? 1 : 0);
    }
    const wantsMove = ix !== 0 || iz !== 0;
    const jump = active && inp.pressed('Space');
    if (this.emoting && (wantsMove || jump || inp.mouse.left || inp.mouse.right)) this.stopEmote();

    this.ads = active && inp.mouse.right && !this.emoting;
    this.fireLock = Math.max(0, this.fireLock - dt);
    const shift = active && (inp.down('ShiftLeft') || inp.down('ShiftRight'));
    this.sprinting = shift && iz > 0 && !this.ads && this.fireLock <= 0 && !this.emoting;
    if (this.sprinting && this.crouching) this.crouching = false;

    let target = MOVE.run;
    if (this.crouching) target = MOVE.crouch;
    if (this.ads) target = this.crouching ? MOVE.adsCrouch : MOVE.ads;
    if (this.sprinting) target = MOVE.sprint;
    if (iz < 0) target *= 0.85;
    if (this.emoting) target = 0;

    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);
    let wx = fx * iz + rx * ix;
    let wz = fz * iz + rz * ix;
    const wl = Math.hypot(wx, wz);
    if (wl > 0) {
      wx /= wl;
      wz /= wl;
    }
    const accel = this.grounded ? 13 : 2.2;
    const k = 1 - Math.exp(-accel * dt);
    this.velocity.x += (wx * target - this.velocity.x) * k;
    this.velocity.z += (wz * target - this.velocity.z) * k;

    if (jump && this.grounded && !this.emoting) {
      this.velocity.y = MOVE.jump;
      this.grounded = false;
      this.crouching = false;
    }
    this.velocity.y -= MOVE.gravity * dt;
    this.position.addScaledVector(this.velocity, dt);
    this.landImpact = 0;
    if (this.position.y <= 0) {
      if (!this.grounded) this.landImpact = -this.velocity.y;
      this.position.y = 0;
      this.velocity.y = 0;
      this.grounded = true;
    }
    const LIM = 140;
    this.position.x = clamp(this.position.x, -LIM, LIM);
    this.position.z = clamp(this.position.z, -LIM, LIM);

    // ---------- obrót ciała ----------
    if (this.emoting) {
      this.emoteTime += dt;
      if (this.emoteSpin > 0) {
        this.emoteSpin -= dt;
        this.yaw = dampAngle(this.yaw, this.emoteCamYaw, 4.5, dt);
        this.pitch = damp(this.pitch, -0.12, 4.5, dt);
      }
    } else if (active || !this.showcase) {
      const rate = wantsMove || this.ads || this.fireLock > 0 ? 16 : 9;
      this.bodyYaw = dampAngle(this.bodyYaw, this.yaw, rate, dt);
    }
    const yawRate = angleDiff(this.prevBodyYaw, this.bodyYaw) / Math.max(dt, 1e-4);
    this.prevBodyYaw = this.bodyYaw;

    const bfx = -Math.sin(this.bodyYaw);
    const bfz = -Math.cos(this.bodyYaw);
    const localForward = this.velocity.x * bfx + this.velocity.z * bfz;
    const localRight = this.velocity.x * -bfz + this.velocity.z * bfx;

    // ---------- animacja ----------
    const root = this.model.root;
    root.position.copy(this.position);
    root.rotation.y = this.bodyYaw;
    this.anim.updateBody(dt, {
      localForward,
      localRight,
      grounded: this.grounded,
      landImpact: this.landImpact,
      crouch: this.crouching,
      sprint: this.sprinting && this.speed > 1,
      ads: this.ads,
      pitch: this.showcase && !active ? 0 : this.aimPitch,
      yawRate,
      emote: this.emoting,
      emoteTime: this.emoteTime,
    });
    root.updateMatrixWorld(true);

    this.updateCamera(dt, active);

    const fpp = this.cameraMode === 'fpp' && !this.emoting && !(this.showcase && !active);
    this.anim.updateArms(
      dt,
      { fpp, aimPitch: this.showcase && !active ? 0 : this.aimPitch, aimYaw: this.showcase && !active ? this.bodyYaw : this.aimYaw, bodyYaw: this.bodyYaw },
      this.camera,
    );
    this.weapon.update(dt);
  }

  updateCamera(dt, active) {
    const cam = this.camera;
    const c = this.cam;

    if (this.debugCam) {
      cam.position.fromArray(this.debugCam.pos);
      cam.lookAt(new THREE.Vector3().fromArray(this.debugCam.target));
      cam.fov = this.debugCam.fov ?? 40;
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      return;
    }

    // --- menu: ujęcie postaci od przodu ---
    if (this.showcase && !active) {
      this.showcaseT += dt;
      const ang = this.bodyYaw + Math.sin(this.showcaseT * 0.35) * 0.35;
      const fwd = _v.set(-Math.sin(ang), 0, -Math.cos(ang));
      const right = new THREE.Vector3(Math.cos(this.bodyYaw), 0, -Math.sin(this.bodyYaw));
      cam.position.copy(this.position).addScaledVector(fwd, 3.3).add(new THREE.Vector3(0, 1.35, 0));
      const tgt = this.position.clone().add(new THREE.Vector3(0, 1.0, 0)).addScaledVector(right, 0.85);
      cam.lookAt(tgt);
      cam.fov = 45;
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      this.model.setHeadHidden(false);
      c.pivotY = null;
      return;
    }

    c.ads = damp(c.ads, this.ads ? 1 : 0, 14, dt);
    c.crouch = damp(c.crouch, this.crouching ? 1 : 0, 12, dt);
    c.emote = damp(c.emote, this.emoting ? 1 : 0, 5, dt);
    const fpp = this.cameraMode === 'fpp' && !this.emoting;

    const eyeH = lerp(1.6, 1.2, c.crouch) - 0.35 * c.emote;
    const targetY = this.position.y + eyeH;
    c.pivotY = c.pivotY === null ? targetY : damp(c.pivotY, targetY, 22, dt);

    _q.setFromEuler(_e.set(this.aimPitch, this.aimYaw, 0, 'YXZ'));

    // TPP: kamera zza prawego ramienia; ADS = przybliżenie
    const ox = lerp(lerp(0.72, 0.62, c.ads), 0, c.emote);
    const oy = lerp(lerp(0.24, 0.08, c.ads), 0.1, c.emote);
    const oz = lerp(lerp(2.9, 1.35, c.ads), 3.6, c.emote);
    _tpp.set(ox, oy, oz).applyQuaternion(_q);
    _tpp.x += this.position.x;
    _tpp.y += c.pivotY;
    _tpp.z += this.position.z;
    if (_tpp.y < 0.3) _tpp.y = 0.3;

    if (fpp) {
      _eye.set(0, 0.18, -0.05);
      this.model.bones.head.localToWorld(_eye);
      cam.position.copy(_eye);
    } else {
      cam.position.copy(_tpp);
    }
    cam.quaternion.copy(_q);

    const fovT = fpp ? lerp(80, 58, c.ads) : lerp(72, 52, c.ads);
    c.fov = damp(c.fov, fovT, 18, dt);
    cam.fov = c.fov;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    this.model.setHeadHidden(fpp);
  }
}
