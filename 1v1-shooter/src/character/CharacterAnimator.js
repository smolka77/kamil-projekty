import * as THREE from 'three';

export const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

// ---------- pozy broni ----------
// TPP: pozycja chwytu w układzie klatki piersiowej, rotacja względem kierunku celowania
export const TPP = {
  // kolba w zagłębieniu prawego barku, lewy łokieć ugięty (~50°) — chwyt łoża w zasięgu ręki
  hip: { pos: [0.02, 0.09, -0.31], rot: [0, 0, 0] },
  ads: { pos: [-0.04, 0.19, -0.31], rot: [0, 0, 0] },
  sprint: { pos: [-0.07, -0.06, -0.25], rot: [-0.6, 0.8, 0.35] },
  reload: { pos: [-0.05, 0.0, -0.31], rot: [0.28, 0.12, 0.7] },
};
// menu (lobby): luźna poza, karabin opuszczony ~45° w poprzek ciała
const LOBBY = { pos: [-0.02, -0.1, -0.27], rot: [-0.78, 0.55, 0.25] };
// FPP: pozycja chwytu w układzie kamery (viewmodel)
const VIEW = {
  hip: { pos: [0.14, -0.2, -0.15], rot: [0, 0, 0] },
  ads: { pos: [0, -0.142, -0.09], rot: [0, 0, 0] },
  sprint: { pos: [0.09, -0.26, -0.1], rot: [-0.55, 0.6, 0.35] },
  reload: { pos: [0.12, -0.22, -0.12], rot: [0.32, 0.12, 0.7] },
};

const POUCH = new THREE.Vector3(-0.17, -0.12, -0.16); // saszetka na biodrze (układ hips) — domyślna, model może podać własną (model.pouch)

// skala broni w dłoniach, kierunki łokci (układ klatki) i punkty chwytu karabinu (AssaultRifle: gripR / gripL)
export const WEAPON_SCALE = 0.85;
// skręt tułowia przy trzymaniu broni (lewy bark do przodu — lewa dłoń sięga łoża); głowa kompensuje
export const BLADE = 0.58;
export const ARM_POLES = { R: [0.55, -0.7, 0.45], L: [-0.45, -0.85, 0.05] };
export const GRIP_REF = { R: [0, -0.045, 0.03], L: [0, -0.03, -0.34] };
const _poleR = new THREE.Vector3(...ARM_POLES.R).normalize();
const _poleL = new THREE.Vector3(...ARM_POLES.L).normalize();
const _gripFallbackL = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.5));

// tymczasowe obiekty
const _s = new THREE.Vector3();
const _d = new THREE.Vector3();
const _p = new THREE.Vector3();
const _e = new THREE.Vector3();
const _t = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _pq = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _pos = new THREE.Vector3();
const _rot = new THREE.Vector3();
const _scl = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();

/** Ustawia kość tak, by jej lokalna oś -Y wskazywała `dir` (świat), a +Z leżała w stronę `pole`. */
function orientBone(bone, dir, pole) {
  _y.copy(dir).normalize().negate();
  _z.copy(pole).addScaledVector(_y, -pole.dot(_y)).normalize();
  _x.crossVectors(_y, _z);
  _m.makeBasis(_x, _y, _z);
  _q.setFromRotationMatrix(_m);
  bone.parent.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(_q));
}

function setWorldQuaternion(bone, q) {
  bone.parent.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(q));
}

/** Analityczne IK dwóch kości (ramię + przedramię). */
function solveTwoBone(upper, lower, L1, L2, target, poleDir) {
  upper.getWorldPosition(_s);
  _d.subVectors(target, _s);
  const dist = clamp(_d.length(), 0.05, (L1 + L2) * 0.999);
  _d.normalize();
  _p.copy(poleDir).addScaledVector(_d, -poleDir.dot(_d));
  if (_p.lengthSq() < 1e-6) _p.set(0, -1, 0);
  _p.normalize();
  const cosA = clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  _e.copy(_s).addScaledVector(_d, L1 * cosA).addScaledVector(_p, L1 * sinA);
  orientBone(upper, _tmp.subVectors(_e, _s), _p);
  upper.updateMatrixWorld(true);
  _t.copy(_s).addScaledVector(_d, dist);
  orientBone(lower, _tmp.subVectors(_t, _e), _p);
  lower.updateMatrixWorld(true);
}

function blendPose(P, ads, sprint, reload, outPos, outRot) {
  const mix = (key, out) => {
    for (let i = 0; i < 3; i++) {
      let v = lerp(P.hip[key][i], P.ads[key][i], ads);
      v = lerp(v, P.sprint[key][i], sprint);
      v = lerp(v, P.reload[key][i], reload);
      out.setComponent(i, v);
    }
  };
  mix('pos', outPos);
  mix('rot', outRot);
}

/**
 * Proceduralna animacja postaci: chód / bieg / sprint / kucanie / skok / lądowanie,
 * skręt bioder przy strafe, pochylenie tułowia za celownikiem, IK rąk na broni,
 * przeładowanie i taniec.
 */
export class CharacterAnimator {
  constructor(model, weapon) {
    this.m = model;
    this.b = model.bones;
    this.weapon = weapon;
    this.weaponPivot = new THREE.Group();
    this.b.chest.add(this.weaponPivot);
    this.weaponPivot.add(weapon.group);
    this.weaponScale = WEAPON_SCALE;
    this.pouch = model.pouch || POUCH;
    this.gripR = model.gripQ ? model.gripQ.R : new THREE.Quaternion();
    this.gripL = model.gripQ ? model.gripQ.L : _gripFallbackL;

    this.L1 = model.armUpperLen;
    this.L2 = model.armLowerLen;

    this.time = 0;
    this.phase = 0;
    this.hipYaw = 0;
    this.moveAmt = 0;
    this.crouch = 0;
    this.sprint = 0;
    this.ads = 0;
    this.air = 0;
    this.landDip = 0;
    this.reloadW = 0;
    this.emoteW = 0;
    this.lobbyW = 0;
    this.recoil = 0;
    this.flinch = 0;
    this.flinchSide = 1;
    this.dance = { half: 0, beat: 0 };

    this.baseRot = {};
    for (const k in this.b) this.baseRot[k] = this.b[k].rotation.clone();
  }

  kick() {
    this.recoil = Math.min(1.4, this.recoil + 1);
  }

  hitReact() {
    this.flinch = 1;
    this.flinchSide = Math.random() < 0.5 ? -1 : 1;
  }

  /**
   * st: { localForward, localRight, grounded, landImpact, crouch, sprint, ads,
   *       pitch, yawRate, emote, emoteTime }
   */
  updateBody(dt, st) {
    const b = this.b;
    this.time += dt;

    this.crouch = damp(this.crouch, st.crouch ? 1 : 0, 12, dt);
    this.sprint = damp(this.sprint, st.sprint ? 1 : 0, 9, dt);
    this.ads = damp(this.ads, st.ads ? 1 : 0, 16, dt);
    this.air = damp(this.air, st.grounded ? 0 : 1, st.grounded ? 16 : 7, dt);
    this.emoteW = damp(this.emoteW, st.emote ? 1 : 0, 7, dt);
    this.lobbyW = damp(this.lobbyW, st.lobby ? 1 : 0, 6, dt);
    this.flinch = damp(this.flinch, 0, 9, dt);
    if (st.landImpact > 2) this.landDip = Math.min(0.13, st.landImpact * 0.011);
    this.landDip = damp(this.landDip, 0, 8, dt);

    // reset do pozy bazowej
    for (const k in b) b[k].rotation.copy(this.baseRot[k]);
    b.hips.position.set(0, this.m.hipHeight, 0);

    const speed = Math.hypot(st.localForward, st.localRight);
    const moving = speed > 0.3;
    let targetHip = 0;
    let dir = 1;
    if (moving) {
      let a = Math.atan2(st.localRight, st.localForward);
      if (Math.abs(a) > 1.95) {
        dir = -1;
        a = a > 0 ? a - Math.PI : a + Math.PI;
      }
      targetHip = -clamp(a, -1.1, 1.1);
    }
    this.hipYaw = damp(this.hipYaw, targetHip * (1 - this.emoteW), 10, dt);

    const shuffle = !moving && st.grounded ? Math.min(Math.abs(st.yawRate) * 0.45, 3) : 0;
    const effSpeed = speed + shuffle;
    const stride = lerp(1.35, 2.0, this.sprint) * lerp(1, 0.7, this.crouch);
    this.phase += (effSpeed / stride) * Math.PI * 2 * dt * dir;
    this.moveAmt = damp(this.moveAmt, clamp(effSpeed / 5.5, 0, 1.45), 10, dt);

    const amt = this.moveAmt * (1 - this.air) * (1 - this.emoteW);
    const sinP = Math.sin(this.phase);
    const cosP = Math.cos(this.phase);
    const A = lerp(0.55, 0.8, this.sprint) * lerp(1, 0.55, this.crouch) * amt;
    const K = lerp(0.95, 1.35, this.sprint) * amt;

    // skręt bioder (strafe) z kontrą tułowia
    b.hips.rotation.y = this.hipYaw;
    b.spine.rotation.y = -this.hipYaw * 0.6;
    b.chest.rotation.y = -this.hipYaw * 0.4;
    const blade = BLADE * (1 - this.emoteW);
    b.spine.rotation.y -= blade * 0.55;
    b.chest.rotation.y -= blade * 0.45;
    b.neck.rotation.y += blade * 0.5;
    b.head.rotation.y += blade * 0.5;

    // cykl kroku
    b.thighL.rotation.x = sinP * A;
    b.thighR.rotation.x = -sinP * A;
    b.shinL.rotation.x = -(Math.max(0, cosP) * K + 0.1 * amt);
    b.shinR.rotation.x = -(Math.max(0, -cosP) * K + 0.1 * amt);
    b.footL.rotation.x = -b.thighL.rotation.x * 0.35 + Math.max(0, cosP) * 0.35 * amt;
    b.footR.rotation.x = -b.thighR.rotation.x * 0.35 + Math.max(0, -cosP) * 0.35 * amt;
    b.hips.position.y += (Math.abs(sinP) * 0.05 - 0.035) * amt;
    b.hips.rotation.z = sinP * 0.05 * amt;
    b.spine.rotation.z = -sinP * 0.04 * amt;
    b.chest.rotation.y += -sinP * 0.06 * amt * (1 - this.ads);

    // sprint — pochylenie do przodu
    b.spine.rotation.x -= 0.22 * this.sprint * Math.min(1, amt + 0.2);

    // oddychanie w miejscu
    const idle = 1 - Math.min(1, amt);
    b.chest.rotation.x += Math.sin(this.time * 1.9) * 0.018 * idle;
    b.hips.position.y += Math.sin(this.time * 1.9) * 0.004 * idle;

    // kucanie
    const c = this.crouch;
    b.hips.position.y -= 0.3 * c;
    b.thighL.rotation.x += 1.05 * c;
    b.thighR.rotation.x += 1.05 * c;
    b.thighL.rotation.z -= 0.12 * c;
    b.thighR.rotation.z += 0.12 * c;
    b.shinL.rotation.x -= 1.65 * c;
    b.shinR.rotation.x -= 1.65 * c;
    b.footL.rotation.x += 0.6 * c;
    b.footR.rotation.x += 0.6 * c;
    b.spine.rotation.x -= 0.22 * c;

    // w powietrzu
    const air = this.air * (1 - this.emoteW);
    b.thighL.rotation.x += 0.8 * air;
    b.shinL.rotation.x -= 1.25 * air;
    b.footL.rotation.x += 0.3 * air;
    b.thighR.rotation.x += 0.12 * air;
    b.shinR.rotation.x -= 0.55 * air;
    b.spine.rotation.x -= 0.06 * air;

    // lądowanie — ugięcie
    const ld = this.landDip;
    b.hips.position.y -= ld;
    b.thighL.rotation.x += ld * 3.2;
    b.thighR.rotation.x += ld * 3.2;
    b.shinL.rotation.x -= ld * 5.5;
    b.shinR.rotation.x -= ld * 5.5;
    b.footL.rotation.x += ld * 2.3;
    b.footR.rotation.x += ld * 2.3;

    // poły fartucha: odchylają się przy biegu / skoku, zakrywają kolana przy kucaniu
    if (b.coat) {
      // przy kucaniu poła podąża za udami (przednie panele mają też własne wagi uda)
      const thighMean = 0.5 * (b.thighL.rotation.x + b.thighR.rotation.x);
      b.coat.rotation.x = -0.12 * amt - 0.32 * this.sprint * Math.min(1, amt) - 0.3 * air + 0.4 * Math.max(0, thighMean) * c + ld * 2;
      b.coat.rotation.x += 0.12 * c;
      b.coat.rotation.z = -sinP * 0.04 * amt;
      // w kucaniu poła lekko się rozszerza (kolana nie przebijają materiału)
      b.coat.scale.set(1 + 0.08 * c, 1, 1 + 0.06 * c);
      if (this.emoteW > 0.001) b.coat.rotation.z += Math.sin(st.emoteTime * Math.PI * 2) * 0.08 * this.emoteW;
    }

    // menu: kontrapost (ciężar na prawej nodze), tułów obrócony ~25° do kamery, głowa patrzy w obiektyw
    if (this.lobbyW > 0.001) {
      const l = this.lobbyW * (1 - this.emoteW);
      b.hips.position.x += 0.035 * l;
      b.hips.rotation.z += 0.07 * l;
      b.hips.rotation.y += 0.32 * l;
      b.spine.rotation.z -= 0.09 * l;
      b.chest.rotation.z -= 0.03 * l;
      b.thighR.rotation.z += 0.02 * l;
      b.thighL.rotation.z -= 0.1 * l;
      b.thighL.rotation.x += 0.12 * l;
      b.shinL.rotation.x -= 0.22 * l;
      b.footL.rotation.x += 0.08 * l;
      b.thighR.rotation.z -= 0.07 * l;
      b.neck.rotation.y -= 0.18 * l;
      b.head.rotation.y -= 0.14 * l;
      b.head.rotation.z += 0.05 * l;
    }

    // trafienie — szarpnięcie
    b.spine.rotation.x -= this.flinch * 0.22;
    b.chest.rotation.z += this.flinch * 0.12 * this.flinchSide;
    b.head.rotation.x += this.flinch * 0.25;

    // celowanie w pionie — rozłożone na kręgosłup, klatkę i głowę
    const pitch = st.pitch * (1 - this.emoteW);
    b.spine.rotation.x += pitch * 0.45;
    b.chest.rotation.x += pitch * 0.35;
    b.neck.rotation.x += pitch * 0.1;
    b.head.rotation.x += pitch * 0.1;
    // głowa kompensuje pochylenia
    b.head.rotation.x += 0.2 * this.sprint + 0.2 * c;

    // taniec
    if (this.emoteW > 0.001) {
      const e = this.emoteW;
      const t = st.emoteTime * Math.PI * 2 * 2.0;
      const half = Math.sin(t / 2);
      const beat = 0.5 + 0.5 * Math.cos(t);
      this.dance.half = half;
      this.dance.beat = beat;
      b.hips.position.x += half * 0.07 * e;
      b.hips.position.y -= (0.02 + 0.05 * (1 - beat)) * e;
      b.hips.rotation.z += half * 0.12 * e;
      b.spine.rotation.z -= half * 0.16 * e;
      b.chest.rotation.y += half * 0.3 * e;
      b.chest.rotation.x += (beat - 0.5) * 0.08 * e;
      b.head.rotation.z += half * 0.2 * e;
      b.head.rotation.x += (beat - 0.5) * 0.18 * e;
      const kb = (0.25 + 0.25 * (1 - beat)) * e;
      b.thighL.rotation.x += kb * 0.6;
      b.thighR.rotation.x += kb * 0.6;
      b.shinL.rotation.x -= kb * 1.1;
      b.shinR.rotation.x -= kb * 1.1;
      b.footL.rotation.x += kb * 0.5;
      b.footR.rotation.x += kb * 0.5;
      b.thighL.rotation.z -= Math.max(0, -half) * 0.35 * e;
      b.thighR.rotation.z += Math.max(0, half) * 0.35 * e;
    }
  }

  /**
   * Ustawia broń (TPP: przy klatce, FPP: przed kamerą) i dopasowuje do niej ręce (IK).
   * Wymaga aktualnych macierzy świata (wywołać po root.updateMatrixWorld()).
   * st: { fpp, aimPitch, aimYaw, bodyYaw }
   */
  updateArms(dt, st, camera) {
    const b = this.b;
    const w = this.weapon;
    const chest = b.chest;

    const rp = w.reloadProgress;
    this.reloadW = damp(this.reloadW, rp >= 0 && rp < 0.93 ? 1 : 0, 10, dt);
    this.recoil = damp(this.recoil, 0, 15, dt);

    w.group.visible = this.emoteW < 0.5;

    // ---- pozycja broni ----
    const P = st.fpp ? VIEW : TPP;
    blendPose(P, this.ads, this.sprint * (1 - this.ads), this.reloadW, _pos, _rot);
    if (!st.fpp && this.lobbyW > 0.001) {
      _a.fromArray(LOBBY.pos);
      _b.fromArray(LOBBY.rot);
      _pos.lerp(_a, this.lobbyW);
      _rot.lerp(_b, this.lobbyW);
    }
    _pos.z += this.recoil * (st.fpp ? 0.045 : 0.06);
    _pos.y += this.recoil * 0.01;
    _rot.x += this.recoil * (st.fpp ? 0.05 : 0.09);
    if (st.fpp) {
      // lekkie bujanie viewmodelu przy ruchu
      const amt = this.moveAmt * (1 - this.air) * (1 - this.ads * 0.8);
      _pos.x += Math.cos(this.phase) * 0.012 * amt;
      _pos.y += -Math.abs(Math.sin(this.phase)) * 0.014 * amt;
    }
    _euler.set(_rot.x, _rot.y, _rot.z, 'YXZ');
    _q2.setFromEuler(_euler);
    _scl.setScalar(this.weaponScale);

    if (st.fpp && camera) {
      _m2.compose(_pos, _q2, _scl);
      _m.multiplyMatrices(camera.matrixWorld, _m2);
    } else {
      _a.copy(_pos);
      chest.localToWorld(_a);
      const aim = new THREE.Quaternion().setFromEuler(_euler.set(st.aimPitch, st.aimYaw, 0, 'YXZ'));
      const flat = _q.setFromEuler(_euler.set(0, st.bodyYaw, 0, 'YXZ'));
      aim.slerp(flat, this.sprint * 0.75 * (1 - this.ads));
      aim.multiply(_q2);
      _m.compose(_a, aim, _scl);
    }
    _m2.copy(chest.matrixWorld).invert().multiply(_m);
    _m2.decompose(this.weaponPivot.position, this.weaponPivot.quaternion, this.weaponPivot.scale);
    this.weaponPivot.updateMatrixWorld(true);

    // ---- zasięg rąk: jeśli chwyt jest poza zasięgiem ramienia, broń cofa się wzdłuż własnej osi ----
    const reach = 0.97 * (this.L1 + this.L2);
    for (let it = 0; it < 3; it++) {
      let excess = 0;
      for (const [grip, upper] of [[w.gripL, b.upperArmL], [w.gripR, b.upperArmR]]) {
        upper.getWorldPosition(_s);
        w.group.localToWorld(_t.copy(grip.position));
        excess = Math.max(excess, _t.distanceTo(_s) - reach);
      }
      if (excess <= 0.002) break;
      // przód broni = lokalne -Z → cofnięcie = +Z broni (w świecie)
      w.group.getWorldQuaternion(_q);
      _tmp.set(0, 0, 1).applyQuaternion(_q).multiplyScalar(excess * 1.05);
      this.weaponPivot.parent.worldToLocal(_tmp.add(this.weaponPivot.getWorldPosition(_e)));
      this.weaponPivot.position.copy(_tmp);
      this.weaponPivot.updateMatrixWorld(true);
    }

    // ---- lewa dłoń: łoże albo animacja przeładowania ----
    const leftLocal = _b.copy(w.gripL.position);
    w.magGroup.position.copy(w.magRest);
    if (rp >= 0) {
      const guard = w.gripL.position;
      const grab = w.magGrab;
      _c.copy(this.pouch);
      b.hips.localToWorld(_c);
      w.group.worldToLocal(_c);
      const pouch = _c;
      let attached = false;
      if (rp < 0.15) leftLocal.copy(guard);
      else if (rp < 0.28) leftLocal.lerpVectors(guard, grab, ease((rp - 0.15) / 0.13));
      else if (rp < 0.48) {
        leftLocal.lerpVectors(grab, pouch, ease((rp - 0.28) / 0.2));
        attached = true;
      } else if (rp < 0.58) {
        leftLocal.copy(pouch);
        attached = true;
      } else if (rp < 0.76) {
        leftLocal.lerpVectors(pouch, grab, ease((rp - 0.58) / 0.18));
        attached = true;
      } else if (rp < 0.9) leftLocal.lerpVectors(grab, guard, ease((rp - 0.76) / 0.14));
      else leftLocal.copy(guard);
      if (attached) w.magGroup.position.copy(w.magRest).add(_tmp.subVectors(leftLocal, grab));
    }

    // ---- IK ----
    w.group.getWorldQuaternion(_q);
    const weaponQ = _q.clone();
    const rightT = w.gripR.getWorldPosition(new THREE.Vector3());
    const leftT = w.group.localToWorld(leftLocal.clone());
    chest.getWorldQuaternion(_pq);
    const poleR = _poleR.clone().applyQuaternion(_pq);
    const poleL = _poleL.clone().applyQuaternion(_pq);
    solveTwoBone(b.upperArmR, b.forearmR, this.L1, this.L2, rightT, poleR);
    solveTwoBone(b.upperArmL, b.forearmL, this.L1, this.L2, leftT, poleL);
    // dłonie wyrzeźbione w chwycie: orientacja = broń · korekta chwytu z modelu
    setWorldQuaternion(b.handR, weaponQ.clone().multiply(this.gripR));
    setWorldQuaternion(b.handL, weaponQ.clone().multiply(this.gripL));

    // ---- taniec: ręce przejmują pozę taneczną ----
    if (this.emoteW > 0.001) {
      const e = this.emoteW;
      const h = this.dance.half;
      const up = Math.max(0, h);
      const dn = Math.max(0, -h);
      const pose = [
        [b.upperArmR, 0.35 + 1.1 * up, 0, 0.45 + 1.9 * up],
        [b.forearmR, -0.5 - 1.3 * dn, 0, 0],
        [b.handR, 0, 0, 0],
        [b.upperArmL, 0.35 + 1.1 * dn, 0, -(0.45 + 1.9 * dn)],
        [b.forearmL, -0.5 - 1.3 * up, 0, 0],
        [b.handL, 0, 0, 0],
      ];
      for (const [bone, x, y, z] of pose) {
        _q2.setFromEuler(_euler.set(x, y, z));
        bone.quaternion.slerp(_q2, e);
      }
    }
  }
}
