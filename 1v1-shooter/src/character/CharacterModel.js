import * as THREE from 'three';
import { MeshoptSimplifier } from 'meshoptimizer/simplifier';
import { sculptCharacter, cloneCharacter } from '../sculpt/index.js';
import * as M from '../style/materials.js';
import { buildHeroDef, VARIANTS, SH_L, ELB_T, PALM_T, armPt, EYE_L, EYE_R, HIP_Y, headPt } from './heroSculpt.js';
import { TPP, ARM_POLES, WEAPON_SCALE, GRIP_REF, BLADE } from './CharacterAnimator.js';

/**
 * Postać w stylu nowoczesnych gier battle-royale (stylizowany realizm, PBR): gładkie, wyrzeźbione
 * z pól SDF siatki ze skinningiem (src/sculpt), AO wypalone w wierzchołkach, materiały z
 * src/style/materials.js. Bez konturów i cel-shadingu.
 *
 * Projekty oryginalne (character/heroSculpt.js):
 *  'iskra' — Dr. Iskra (gracz), 'rival' — Manekin (cel treningowy).
 *
 * Interfejs (używany przez CharacterAnimator / Player / Dummy / Combat):
 *  root (Group, rotation.order 'YXZ'), body, bones{hips, spine, chest, neck, head, upperArmL/R,
 *  forearmL/R, handL/R, thighL/R, shinL/R, footL/R, coat}, hipHeight, armUpperLen, armLowerLen,
 *  skin.name, materials (błysk trafienia przez .emissive), headMaterials (ukrywane w FPP),
 *  setHeadHidden(bool), meshes (niewidoczne bryły trafień przypięte do kości; głowa: userData.part='head'),
 *  gripQ {R, L} (korekta orientacji dłoni względem broni), pouch (saszetka, układ hips).
 *
 * Postać patrzy w kierunku -Z (tak jak kamera Three.js przy yaw = 0).
 */

export const SKINS = VARIANTS;

const HEAD_LAYERS = ['head', 'eyeL', 'eyeR', 'brows', 'hair', 'hat', 'goggles', 'goggleLens', 'strap'];

// ---------- korekta chwytu ----------
// Dłonie są wyrzeźbione w chwycie. Żeby nadgarstek nie był skręcony, w referencyjnej pozie celowania
// (TPP.hip, celownik na wprost) orientacja dłoni ma być równa orientacji przedramienia z IK.
// C = (orientacja przedramienia z IK) w układzie broni; w grze: dłoń = broń · C.
function forearmQuat(S, L1, L2, T, pole) {
  const d = T.clone().sub(S);
  const dist = THREE.MathUtils.clamp(d.length(), 0.05, (L1 + L2) * 0.999);
  d.normalize();
  const p = pole.clone().addScaledVector(d, -pole.dot(d));
  if (p.lengthSq() < 1e-6) p.set(0, -1, 0);
  p.normalize();
  const cosA = THREE.MathUtils.clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  const e = S.clone().addScaledVector(d, L1 * cosA).addScaledVector(p, L1 * sinA);
  const t = S.clone().addScaledVector(d, dist);
  const y = e.clone().sub(t).normalize();
  const z = p.clone().addScaledVector(y, -p.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

export function gripCorrection() {
  const L1 = ELB_T;
  const L2 = PALM_T - ELB_T;
  const chestY = 1.3;
  const out = {};
  for (const [side, sx] of [['R', -1], ['L', 1]]) {
    const S = new THREE.Vector3(SH_L[0] * sx, SH_L[1] - chestY, SH_L[2]);
    const g = GRIP_REF[side];
    // klatka jest skręcona o -BLADE względem kierunku celowania → broń w układzie klatki: obrót +BLADE
    const Wq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), BLADE);
    const T = new THREE.Vector3(...TPP.hip.pos).add(new THREE.Vector3(g[0], g[1], g[2]).multiplyScalar(WEAPON_SCALE).applyQuaternion(Wq));
    const pole = new THREE.Vector3(...ARM_POLES[side]).normalize();
    out[side] = Wq.clone().invert().multiply(forearmQuat(S, L1, L2, T, pole));
  }
  return out;
}

/** Ramki dłoni dla rzeźby: macierz (układ chwytu → bind pose) i pozycja nadgarstka w układzie chwytu. */
function handFrames(C) {
  const res = {};
  const GRIP_TILT = -0.21; // pochylenie chwytu pistoletowego karabinu (AssaultRifle: dół chwytu odchylony do tyłu)
  for (const [side, sx] of [['R', -1], ['L', 1]]) {
    const Hb = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -(14 * Math.PI) / 180 * sx));
    const palm = armPt(PALM_T);
    const P = new THREE.Vector3(palm[0] * sx, palm[1], palm[2]);
    const basis = side === 'R' ? new THREE.Quaternion().setFromEuler(new THREE.Euler(GRIP_TILT, 0, 0)) : new THREE.Quaternion();
    const q = Hb.clone().multiply(C[side].clone().invert()).multiply(basis);
    res[side] = new THREE.Matrix4().compose(P, q, new THREE.Vector3(1, 1, 1));
    // nadgarstek: 7.5 cm od środka dłoni w stronę łokcia (lokalne +Y kości dłoni) → układ chwytu
    const w = new THREE.Vector3(0, 0.075, 0).applyQuaternion(C[side]).applyQuaternion(basis.clone().invert());
    res['wrist' + side] = [w.x, w.y, w.z];
  }
  return res;
}

// ---------- materiały ----------
function makeMaterials(V) {
  const vc = { vertexColors: true };
  const paint = { vertexColors: true, vertexColorMode: 'color' };
  const map = {
    head: () => M.skin(V.skin, paint),
    eyeL: () => M.eye(V.iris, { ...vc, center: headPt(EYE_L), irisSize: 0.58, pupilSize: 0.4, catchlight: 1.4 }),
    eyeR: () => M.eye(V.iris, { ...vc, center: headPt(EYE_R), irisSize: 0.58, pupilSize: 0.4, catchlight: 1.4 }),
    brows: () => M.hair(V.brow, { ...vc, flow: [1, 0.1, 0], highlight: new THREE.Color(V.brow).multiplyScalar(1.6), sheen: 0.05 }),
    hair: () => M.hair(V.hair.color, { ...paint, flow: V.hair.style === 'swept' ? [0, -0.45, 1] : [0.3, -1, -0.3], highlight: V.hair.tip }),
    hat: () => M.fabric(V.hair.hat, { ...paint, kind: 'knit', scale: 15, detail: 0.8 }),
    goggles: () => (V.backBling ? M.metal(V.goggles.frame, vc) : M.metal(V.goggles.frame, { ...vc, painted: true })),
    goggleLens: () => M.lens(V.goggles.lens, { ...vc, intensity: 1.2, glow: 0.35 }),
    strap: () => M.leather(V.goggles.strap, vc),
    body: () => M.skin(V.skin, paint), // jak głowa: AO × malowanie (spójny ton głowy i szyi)
    shirt: () => M.fabric(V.shirt, { ...vc, kind: 'cotton', scale: 22, detail: 0.6 }),
    emblem: () => M.plastic(V.emblem, { ...vc, roughness: 0.55 }),
    // płaszcz: łagodniejsze AO (biały fartuch nie szarzeje / nie sinieje w zagłębieniach)
    coat: () => M.fabric(V.coat.color, { ...vc, kind: V.coat.long ? 'canvas' : 'cotton', scale: 40, detail: 0.35, ao: 0.85, aoDirect: 0.38 }),
    coatDetail: () => M.fabric(V.coat.color, { ...vc, kind: V.coat.long ? 'canvas' : 'cotton', scale: 40, detail: 0.35, ao: 0.85, aoDirect: 0.38 }),
    harness: () => M.leather(V.belt, vc),
    trim: () => M.fabric(V.coat.trim || 0xc8283a, { ...vc, kind: 'canvas', scale: 24, detail: 0.5 }),
    pants: () => M.fabric(V.pants, { ...vc, kind: 'canvas', scale: 22, detail: 0.6 }),
    pantsDetail: () => M.fabric(V.pants, { ...vc, kind: 'canvas', scale: 22, detail: 0.6 }),
    pads: () => M.rubber(V.pads, { ...vc, roughness: 0.6 }),
    belt: () => M.leather(V.belt, vc),
    buckle: () => M.metal(V.metal, vc),
    gloves: () => (V.gloves.kind === 'rubber' ? M.rubber(V.gloves.color, { ...vc, roughness: 0.4, clearcoat: 0.3, clearcoatRoughness: 0.35 }) : M.leather(V.gloves.color, vc)),
    shoes: () => (V.shoes.boot ? M.leather(V.shoes.color, vc) : M.fabric(V.shoes.color, { ...vc, kind: 'canvas', scale: 28, detail: 0.55 })),
    soles: () => M.rubber(V.shoes.sole, { ...vc, roughness: 0.7 }),
    laces: () => M.fabric(V.shoes.laces, { ...vc, kind: 'cotton' }),
    gadget: () => M.metal(V.metal, vc),
    coil: () => M.emissive(0x22c8ff, 3.2),
  };
  return (name) => {
    const f = map[name];
    if (!f) throw new Error('CharacterModel: brak materiału dla warstwy ' + name);
    const m = f();
    m.name = name;
    return m;
  };
}

// ---------- wagi poł płaszcza ----------
// Poły (poniżej pasa) wiszą na kości 'coat'; przednie części częściowo podążają za udem,
// żeby noga w biegu nie przebijała materiału.
const smooth = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const ARM_BONES = ['upperArmL', 'forearmL', 'handL', 'upperArmR', 'forearmR', 'handR'];
function distSeg(p, a, b) {
  const ab = b.clone().sub(a);
  const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
  return p.distanceTo(a.clone().addScaledVector(ab, t));
}
function reweightSkirt(mesh, index, skirt = true, hemY = 0.47) {
  const g = mesh.geometry;
  const pos = g.attributes.position;
  const si = g.attributes.skinIndex;
  const sw = g.attributes.skinWeight;
  const iH = index.hips, iC = index.coat, iTL = index.thighL, iTR = index.thighR;
  const armIdx = new Set(ARM_BONES.map((n) => index[n]));
  const sh = new THREE.Vector3(...SH_L), wr = new THREE.Vector3(...armPt(0.56));
  const nrm = g.attributes.normal;
  const ad = wr.clone().sub(sh).normalize();
  const latOut = new THREE.Vector3(ad.y, -ad.x, 0); // prostopadle do ręki, na zewnątrz od tułowia (lewa strona)
  if (latOut.x > 0) latOut.negate();
  const p = new THREE.Vector3();
  const cp = new THREE.Vector3();
  for (let v = 0; v < pos.count; v++) {
    const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
    // tułów płaszcza nie może dziedziczyć wag ręki (rękaw wisi blisko boku → "rozciągnięta płachta")
    p.set(-Math.abs(x), y, z);
    const dArm = distSeg(p, sh, wr);
    // płynne wygaszanie wpływu ręki z odległością od jej osi — tylko na tułowiu płaszcza (blisko boku,
    // poniżej pachy); rękaw przy barku zostaje z wagami ciała (inaczej ramię przebija rękaw)
    // bok tułowia: wierzchołek po przyśrodkowej stronie osi ręki, z normalną skierowaną na zewnątrz (ku ręce),
    // poniżej barku. Wewnętrzna strona rękawa ma normalną do środka ciała → zostaje z ręką.
    const ab = wr.clone().sub(sh);
    const tt = THREE.MathUtils.clamp(p.clone().sub(sh).dot(ab) / ab.lengthSq(), 0, 1);
    cp.copy(sh).addScaledVector(ab, tt);
    const lateral = p.clone().sub(cp).dot(latOut);
    const outwardX = Math.sign(x || 1) * nrm.getX(v);
    const torsoMask = smooth(-0.004, -0.022, lateral) * smooth(0.05, 0.4, outwardX) * smooth(1.45, 1.39, y);
    const fa = 1 - (1 - smooth(0.11, 0.05, dArm)) * torsoMask;
    if (fa < 1) {
      // wpływ ręki wygaszany; odjęta waga przechodzi na kość tułowia (wg wysokości)
      const w = [sw.getX(v), sw.getY(v), sw.getZ(v), sw.getW(v)];
      const id = [si.getX(v), si.getY(v), si.getZ(v), si.getW(v)];
      const tb = y > 1.24 ? index.chest : y > 1.06 ? index.spine : iH;
      let moved = 0;
      for (let j = 0; j < 4; j++) {
        if (armIdx.has(id[j])) {
          moved += w[j] * (1 - fa);
          w[j] *= fa;
        }
      }
      if (moved > 0) {
        let slot = id.indexOf(tb);
        if (slot < 0 || w[slot] === 0 && id[slot] !== tb) slot = -1;
        if (slot < 0) {
          // najmniejsza waga ustępuje miejsca kości tułowia
          slot = 0;
          for (let j = 1; j < 4; j++) if (w[j] < w[slot]) slot = j;
          moved += w[slot];
          w[slot] = 0;
          id[slot] = tb;
        }
        w[slot] += moved;
        const sum = w[0] + w[1] + w[2] + w[3];
        si.setXYZW(v, id[0], id[1], id[2], id[3]);
        sw.setXYZW(v, w[0] / sum, w[1] / sum, w[2] / sum, w[3] / sum);
      }
    }
    if (!skirt || y > 1.035 || Math.abs(x) > 0.34 || dArm < 0.1) continue;
    const t = smooth(1.035, 0.82, y);
    // udział uda: przednie panele (|kąt od przodu| < ~1.2 rad) od 0.25 na y 0.9 do 0.6 przy dole poły;
    // boki mniej, tył zostaje na kości 'coat' (rozporek / środek pleców)
    const ang = Math.abs(Math.atan2(x, -z));
    const front = smooth(1.55, 1.05, ang);
    // przód poły: udział uda rośnie od 0 (y 1.0) do ≥0.55 poniżej y 0.85, przy dole 0.7
    const f = front * (0.58 * smooth(1.0, 0.85, y) + 0.12 * smooth(0.85, hemY, y)) * smooth(0.015, 0.06, Math.abs(x));
    si.setXYZW(v, iH, iC, x < 0 ? iTL : iTR, 0);
    sw.setXYZW(v, 1 - t, t * (1 - f), t * f, 0);
  }
  si.needsUpdate = true;
  sw.needsUpdate = true;
}

// ---------- upraszczanie siatek (meshoptimizer, WASM) ----------
let simplifierOK = false;
/** Promise: gotowość upraszczacza. Postaci tworzyć po jego rozwiązaniu (inaczej siatki będą pełne/ciężkie). */
export const charactersReady = MeshoptSimplifier.ready.then(
  () => {
    simplifierOK = true;
    // tekstury proceduralne materiałów (wspólne dla wszystkich postaci) — generowane z góry
    for (const k of ['skin', 'cotton', 'canvas', 'knit', 'leather', 'rubber', 'plastic', 'brushed', 'paint', 'hair']) M.getDetailTexture(k);
    M.getMacroTexture();
    for (const V of Object.values(VARIANTS)) M.getEyeTexture(V.iris, { irisSize: 0.58, pupilSize: 0.4 });
  },
  (e) => console.warn('CharacterModel: meshoptimizer niedostępny — siatki bez upraszczania', e),
);
function simplify(indices, positions, normals, nVerts, target, o) {
  if (!simplifierOK) return null;
  const [idx] = MeshoptSimplifier.simplifyWithAttributes(indices, positions, 3, normals, 3, [0.35, 0.35, 0.35], null, target, o.error ?? 0.0012, ['ErrorAbsolute']);
  return idx;
}

// ---------- cache rzeźb (generacja jest deterministyczna) ----------
const _cache = new Map();

function sculptVariant(key) {
  const V = VARIANTS[key];
  const t0 = performance.now();
  const C = gripCorrection();
  const hands = handFrames(C);
  const mats = makeMaterials(V);
  const def = buildHeroDef(V, hands, mats);
  def.simplify = simplify;
  def.warn = false; // pogrubienia cienkich naszywek (do wewnątrz) są zamierzone
  const t1 = performance.now();
  const char = sculptCharacter(def);
  for (const n of ['coat', 'coatDetail', 'trim', 'shirt', 'harness']) if (char.meshes[n]) reweightSkirt(char.meshes[n], char.skel.index, n === 'coat' || n === 'coatDetail' || n === 'trim', def.hemY);
  const stats = { ...char.stats, defMs: t1 - t0, totalMs: performance.now() - t0 };
  const entry = { char, C, pouchTop: def.pouchTop, stats, mats };
  _cache.set(key, entry);
  return entry;
}

export class CharacterModel {
  constructor(skinKey = 'iskra') {
    if (!VARIANTS[skinKey]) skinKey = 'iskra';
    this.skinKey = skinKey;
    this.skin = VARIANTS[skinKey];
    this.root = new THREE.Group();
    this.root.rotation.order = 'YXZ';
    this.hipHeight = HIP_Y;
    this.headHidden = false;

    let entry = _cache.get(skinKey);
    let inst;
    if (!entry) {
      entry = sculptVariant(skinKey);
      inst = entry.char;
      entry.used = true;
    } else if (!entry.used) {
      inst = entry.char;
      entry.used = true;
    } else {
      // kolejna instancja: współdzielona geometria, nowe kości i materiały
      const mats = {};
      for (const name in entry.char.meshes) mats[name] = entry.mats(name);
      inst = cloneCharacter(entry.char, mats);
    }
    this.stats = entry.stats;
    this.sculpt = entry.char; // (debug) pola SDF i statystyki
    this.body = inst.root;
    this.root.add(this.body);
    this.sculptMeshes = inst.meshes;
    this.bones = {};
    for (const n of ['hips', 'spine', 'chest', 'neck', 'head', 'upperArmL', 'forearmL', 'handL', 'upperArmR', 'forearmR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR', 'coat']) {
      if (!inst.bones[n]) throw new Error('CharacterModel: brak kości ' + n);
      this.bones[n] = inst.bones[n];
    }

    this.materials = [];
    this.headMaterials = [];
    for (const name in inst.meshes) {
      const mesh = inst.meshes[name];
      this.materials.push(mesh.material);
      if (HEAD_LAYERS.includes(name)) this.headMaterials.push(mesh.material);
    }

    this.gripQ = { R: entry.C.R.clone(), L: entry.C.L.clone() };
    // saszetka na lewym biodrze (cel lewej dłoni przy przeładowaniu), układ kości hips
    const pt = entry.pouchTop;
    this.pouch = new THREE.Vector3(pt[0], pt[1] - HIP_Y, pt[2] - 0.012);

    this.meshes = [];
    this.buildHitboxes();

    this.root.updateMatrixWorld(true);
    const wp = (n) => this.bones[n].getWorldPosition(new THREE.Vector3());
    this.armUpperLen = wp('upperArmR').distanceTo(wp('forearmR'));
    this.armLowerLen = wp('forearmR').distanceTo(wp('handR'));
  }

  /** Niewidoczne bryły trafień (Combat raycastuje je zamiast ciężkich siatek ze skinningiem). */
  buildHitboxes() {
    const mat = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true });
    const add = (boneName, geo, worldPos, part, rot) => {
      const bone = this.bones[boneName];
      const m = new THREE.Mesh(geo, mat);
      // bind pose: kość ma pozycję/rotację świata z definicji szkieletu → przeliczenie do układu kości
      bone.updateWorldMatrix(true, false);
      const inv = this.body.matrixWorld.clone().invert().multiply(bone.matrixWorld).invert();
      m.position.copy(new THREE.Vector3(...worldPos).applyMatrix4(inv));
      if (rot) m.quaternion.copy(rot);
      m.userData.part = part;
      m.visible = false;
      m.castShadow = false;
      bone.add(m);
      this.meshes.push(m);
      return m;
    };
    this.root.updateMatrixWorld(true);
    add('head', new THREE.SphereGeometry(0.135, 12, 10), headPt([0, 1.752, -0.008]), 'head');
    add('chest', new THREE.CapsuleGeometry(0.165, 0.2, 4, 10), [0, 1.33, 0.0], 'body');
    add('spine', new THREE.CapsuleGeometry(0.15, 0.06, 4, 10), [0, 1.13, 0.0], 'body');
    add('hips', new THREE.CapsuleGeometry(0.15, 0.1, 4, 10), [0, 0.97, 0.0], 'body', new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)));
    // kończyny: kapsuły wzdłuż lokalnej osi -Y kości
    const limb = (boneName, r, len) => {
      const bone = this.bones[boneName];
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 4, 8), mat);
      m.position.set(0, -len / 2, 0);
      m.userData.part = 'body';
      m.visible = false;
      bone.add(m);
      this.meshes.push(m);
    };
    for (const s of ['L', 'R']) {
      limb('upperArm' + s, 0.07, this.bones['forearm' + s].position.length() + 0.04);
      limb('forearm' + s, 0.06, this.bones['hand' + s].position.length() + 0.04);
      limb('thigh' + s, 0.095, this.bones['shin' + s].position.length() + 0.04);
      limb('shin' + s, 0.075, this.bones['foot' + s].position.length() + 0.06);
    }
  }

  /** Pokazuje bryły trafień (debug). */
  showHitboxes(v = true) {
    for (const m of this.meshes) m.visible = v;
  }

  /** Ukrywa głowę (dla widoku FPP), ale zachowuje jej cień. */
  setHeadHidden(hidden) {
    if (hidden === this.headHidden) return;
    this.headHidden = hidden;
    for (const m of this.headMaterials) {
      m.colorWrite = !hidden;
      m.depthWrite = !hidden;
    }
  }
}
