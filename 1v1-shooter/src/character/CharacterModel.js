import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { toonMat, toonGradientSoft, makeOutlineMaterial, addOutline } from '../style/toon.js';

/**
 * Postać w stylu animowanej kreskówki: wysoka, chuda sylwetka, długie cienkie
 * kończyny, wydłużona twarz z wyłupiastymi oczami i kropkami źrenic,
 * płaskie kolory i czarny kontur.
 *
 * Projekt oryginalny: "Dr. Iskra" — szalony wynalazca w fartuchu laboratoryjnym,
 * fioletowe włosy zaczesane do tyłu, mosiężne gogle na czole, żółte gumowe
 * rękawice, czerwone trampki.
 *
 * Postać patrzy w kierunku -Z (tak jak kamera Three.js przy yaw = 0).
 */

export const SKINS = {
  iskra: {
    name: 'Dr. Iskra',
    skin: 0xf2c6a4,
    hair: 0x7b45f0,
    hairLight: 0xa883ff,
    brows: 0x4a22a6,
    lips: 0x7a3a33,
    coat: 0xf4f6fb,
    coatInner: 0xc7cedc,
    coatTrim: 0xe3e8f0,
    shirt: 0x2b2547,
    emblem: 0xffd23c,
    pants: 0x46577a,
    belt: 0x5b3b25,
    buckle: 0xd9dde3,
    shoes: 0xe8463a,
    soles: 0xffffff,
    gloves: 0xffd23c,
    goggleFrame: 0xc08a2e,
    goggleLens: 0x5ff3ff,
    goggleStrap: 0x2b2b30,
  },
  rival: {
    name: 'Manekin',
    skin: 0xb07650,
    hair: 0xe8364f,
    hairLight: 0xff7a8a,
    brows: 0x6b1020,
    lips: 0x5a2a22,
    coat: 0x34384a,
    coatInner: 0x22252f,
    coatTrim: 0x464b60,
    shirt: 0xf2f2f2,
    emblem: 0xe8364f,
    pants: 0x23252f,
    belt: 0x15161b,
    buckle: 0xc9ccd4,
    shoes: 0x1e1f26,
    soles: 0xe8364f,
    gloves: 0x1c1d22,
    goggleFrame: 0x50566c,
    goggleLens: 0xff4d6a,
    goggleStrap: 0x111111,
  },
};

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function boltShape() {
  const s = new THREE.Shape();
  s.moveTo(0.012, 0.045);
  s.lineTo(-0.02, -0.004);
  s.lineTo(-0.002, -0.004);
  s.lineTo(-0.014, -0.045);
  s.lineTo(0.022, 0.008);
  s.lineTo(0.004, 0.008);
  s.lineTo(0.016, 0.045);
  s.closePath();
  return s;
}

export class CharacterModel {
  constructor(skinKey = 'iskra') {
    this.skin = SKINS[skinKey];
    this.root = new THREE.Group();
    this.root.rotation.order = 'YXZ';
    this.body = new THREE.Group();
    this.body.scale.setScalar(0.9);
    this.root.add(this.body);
    this.hipHeight = 1.05;

    this.bones = {};
    this.meshes = [];
    this.materials = [];
    this.headMaterials = [];
    this.outline = makeOutlineMaterial();
    this.outlineHead = makeOutlineMaterial();
    this.headMaterials.push(this.outlineHead);

    this.build();

    this.root.updateMatrixWorld(true);
    const wp = (n) => this.bones[n].getWorldPosition(new THREE.Vector3());
    this.armUpperLen = wp('upperArmR').distanceTo(wp('forearmR'));
    this.armLowerLen = wp('forearmR').distanceTo(wp('handR'));
    this.headHidden = false;
  }

  // ---------- helpers ----------
  mat(color, opts = {}) {
    const m = toonMat(color, opts);
    this.materials.push(m);
    return m;
  }

  headMat(color, opts = {}) {
    const m = this.mat(color, opts);
    this.headMaterials.push(m);
    return m;
  }

  bone(name, parent, x, y, z) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    parent.add(g);
    this.bones[name] = g;
    return g;
  }

  part(parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1], tag = 'body', outline = true) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(pos[0], pos[1], pos[2]);
    m.rotation.set(rot[0], rot[1], rot[2]);
    m.scale.set(scl[0], scl[1], scl[2]);
    m.castShadow = true;
    m.receiveShadow = false; // płaski, kreskówkowy wygląd — postać rzuca cień, ale sama go nie łapie
    m.userData.part = tag;
    parent.add(m);
    this.meshes.push(m);
    if (outline) addOutline(m, tag === 'head' ? this.outlineHead : this.outline);
    return m;
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

  // ---------- build ----------
  build() {
    const s = this.skin;
    const M = {
      skin: this.mat(s.skin, { gradientMap: toonGradientSoft() }),
      coat: this.mat(s.coat),
      coatInner: this.mat(s.coatInner, { side: THREE.BackSide }),
      coatTrim: this.mat(s.coatTrim),
      shirt: this.mat(s.shirt),
      emblem: this.mat(s.emblem, { emissive: s.emblem, emissiveIntensity: 0.25 }),
      pants: this.mat(s.pants),
      belt: this.mat(s.belt),
      buckle: this.mat(s.buckle),
      shoes: this.mat(s.shoes),
      soles: this.mat(s.soles),
      gloves: this.mat(s.gloves),
    };
    const RB = (w, h, d, r = 0.03, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, r);
    const CAP = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 16);
    const SPH = (r, w = 22, h = 16) => new THREE.SphereGeometry(r, w, h);
    const CYL = (rt, rb, h, seg = 18) => new THREE.CylinderGeometry(rt, rb, h, seg);

    // ---- miednica + poły fartucha ----
    const hips = this.bone('hips', this.body, 0, this.hipHeight, 0);
    this.part(hips, RB(0.27, 0.17, 0.19, 0.06), M.pants, [0, -0.02, 0]);
    this.part(hips, RB(0.285, 0.045, 0.2, 0.02), M.belt, [0, 0.055, 0]);
    this.part(hips, RB(0.06, 0.042, 0.02, 0.008), M.buckle, [0, 0.055, -0.104]);

    const coat = this.bone('coat', hips, 0, 0.08, 0);
    const gap = 0.42; // rozcięcie z przodu
    const skirtGeo = new THREE.CylinderGeometry(0.17, 0.26, 0.56, 28, 1, true, Math.PI + gap, Math.PI * 2 - gap * 2);
    this.part(coat, skirtGeo, M.coat, [0, -0.27, 0]);
    this.part(coat, skirtGeo, M.coatInner, [0, -0.27, 0], [0, 0, 0], [0.995, 1, 0.995], 'body', false);
    for (const sx of [-1, 1]) {
      // kieszenie
      this.part(coat, RB(0.1, 0.075, 0.014, 0.006), M.coatTrim, [0.17 * sx, -0.25, -0.15], [-0.15, 0.85 * sx, 0]);
    }

    // ---- tułów ----
    const spine = this.bone('spine', hips, 0, 0.1, 0);
    this.part(spine, CAP(0.11, 0.08), M.shirt, [0, 0.06, 0], [0, 0, 0], [1.15, 1, 0.82]);

    const chest = this.bone('chest', spine, 0, 0.24, 0);
    this.part(chest, RB(0.37, 0.46, 0.23, 0.09, 4), M.coat, [0, -0.05, 0]);
    this.part(chest, RB(0.15, 0.4, 0.02, 0.008), M.shirt, [0, -0.06, -0.113]); // koszulka w rozcięciu
    const bolt = new THREE.ExtrudeGeometry(boltShape(), { depth: 0.006, bevelEnabled: false });
    this.part(chest, bolt, M.emblem, [0, -0.01, -0.127], [0, 0, 0], [1, 1, 1], 'body', false);
    for (const sx of [-1, 1]) {
      // klapy fartucha
      this.part(chest, RB(0.075, 0.34, 0.018, 0.008), M.coatTrim, [0.088 * sx, 0.0, -0.119], [0, 0.12 * sx, -0.2 * sx]);
    }
    // postawiony kołnierz
    const collar = new THREE.Group();
    collar.position.set(0, 0.165, 0.005);
    collar.rotation.x = Math.PI / 2;
    chest.add(collar);
    this.part(collar, new THREE.TorusGeometry(0.085, 0.026, 8, 22, Math.PI * 1.35), M.coatTrim, [0, 0, 0], [0, 0, -Math.PI * 0.175], [1, 1, 1.7]);

    // ---- szyja + głowa ----
    const neck = this.bone('neck', chest, 0, 0.18, 0);
    this.part(neck, CYL(0.042, 0.048, 0.15), M.skin, [0, 0.04, 0]);
    const head = this.bone('head', neck, 0, 0.1, 0);
    this.buildHead(head);

    // ---- ręce (długie i cienkie, rękawy fartucha) ----
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? -1 : 1;
      const ua = this.bone('upperArm' + side, chest, 0.2 * sx, 0.12, 0);
      this.part(ua, SPH(0.064), M.coat);
      this.part(ua, CAP(0.05, 0.2), M.coat, [0, -0.15, 0]);
      const fa = this.bone('forearm' + side, ua, 0, -0.31, 0);
      this.part(fa, CAP(0.046, 0.17), M.coat, [0, -0.11, 0]);
      this.part(fa, CYL(0.058, 0.054, 0.06), M.coatTrim, [0, -0.235, 0]); // mankiet
      const hand = this.bone('hand' + side, fa, 0, -0.3, 0);
      this.part(hand, CYL(0.04, 0.036, 0.06), M.gloves, [0, 0.035, 0]);
      this.part(hand, RB(0.068, 0.085, 0.085, 0.03), M.gloves, [0, -0.01, 0]);
      this.part(hand, CAP(0.017, 0.035), M.gloves, [0.04 * -sx, 0.0, -0.035], [0.6, 0, 0]);
    }

    // ---- nogi ----
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? -1 : 1;
      const th = this.bone('thigh' + side, hips, 0.075 * sx, -0.06, 0);
      this.part(th, CAP(0.066, 0.32), M.pants, [0, -0.225, 0]);
      const sh = this.bone('shin' + side, th, 0, -0.45, 0);
      this.part(sh, CAP(0.058, 0.32), M.pants, [0, -0.21, 0]);
      this.part(sh, CYL(0.064, 0.07, 0.07), M.pants, [0, -0.395, 0]);
      const ft = this.bone('foot' + side, sh, 0, -0.45, 0);
      this.part(ft, RB(0.12, 0.12, 0.15, 0.045), M.shoes, [0, -0.005, 0.005]);
      this.part(ft, RB(0.125, 0.085, 0.24, 0.04), M.shoes, [0, -0.035, -0.07]);
      this.part(ft, RB(0.135, 0.036, 0.27, 0.014), M.soles, [0, -0.072, -0.066]);
      this.part(ft, RB(0.06, 0.012, 0.09, 0.005), M.soles, [0, 0.004, -0.1], [-0.35, 0, 0], [1, 1, 1], 'body', false);
    }
  }

  buildHead(head) {
    const s = this.skin;
    const T = 'head';
    const skin = this.headMat(s.skin, { side: THREE.DoubleSide, gradientMap: toonGradientSoft() });
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.headMaterials.push(white);
    const pupil = new THREE.MeshBasicMaterial({ color: 0x0d0b12 });
    this.headMaterials.push(pupil);
    const brow = this.headMat(s.brows);
    const lip = this.headMat(s.lips);
    const hair = this.headMat(s.hair, { side: THREE.DoubleSide });
    const hairLight = this.headMat(s.hairLight, { side: THREE.DoubleSide });
    const frame = this.headMat(s.goggleFrame);
    const lens = this.headMat(s.goggleLens, { emissive: s.goggleLens, emissiveIntensity: 0.55 });
    const strap = this.headMat(s.goggleStrap);

    const H = 0.15;
    // czaszka — wydłużona
    this.part(head, new THREE.SphereGeometry(0.13, 36, 28), skin, [0, H, 0], [0, 0, 0], [1, 1.22, 1.06], T);
    // broda
    this.part(head, new THREE.SphereGeometry(0.072, 22, 16), skin, [0, H - 0.115, -0.045], [0, 0, 0], [1.25, 0.82, 1], T);

    // oczy: wyłupiaste, z małymi kropkami źrenic i opadniętymi powiekami
    for (const sx of [-1, 1]) {
      const ex = 0.05 * sx;
      const ey = H + 0.035;
      this.part(head, new THREE.SphereGeometry(0.043, 22, 16), white, [ex, ey, -0.113], [0, 0, 0], [1, 1.15, 0.72], T);
      this.part(head, new THREE.SphereGeometry(0.0095, 10, 8), pupil, [ex - 0.006 * sx, ey - 0.006, -0.142], [0, 0, 0], [1, 1, 1], T, false);
      // powieka
      this.part(head, new THREE.SphereGeometry(0.0465, 22, 12, 0, Math.PI * 2, 0, 1.2), skin, [ex, ey, -0.113], [-0.45, 0, 0.18 * sx], [1, 1.15, 0.78], T);
      // brew
      this.part(head, new RoundedBoxGeometry(0.066, 0.017, 0.022, 2, 0.007), brow, [0.053 * sx, H + 0.098, -0.108], [0, -0.32 * sx, 0.22 * sx], [1, 1, 1], T);
      // ucho
      this.part(head, new THREE.SphereGeometry(0.032, 14, 12), skin, [0.13 * sx, H + 0.005, 0.0], [0, 0, 0], [0.45, 1, 0.75], T);
    }
    // nos — długi, kreskówkowy
    this.part(head, new THREE.SphereGeometry(0.021, 16, 12), skin, [0, H - 0.008, -0.142], [0.25, 0, 0], [0.9, 1.15, 1.7], T);
    // usta — krzywy uśmieszek
    this.part(head, new THREE.TorusGeometry(0.032, 0.0055, 6, 16, Math.PI * 0.7), lip, [0.01, H - 0.072, -0.123], [0, 0, Math.PI + 0.45], [1, 1, 1], T, false);

    // ---- włosy: zaczesane mocno do tyłu ----
    this.part(head, new THREE.SphereGeometry(0.134, 30, 16, 0, Math.PI * 2, 0, 1.25), hair, [0, H + 0.006, 0.008], [0.28, 0, 0], [1.05, 1.25, 1.1], T);
    this.part(head, new THREE.SphereGeometry(0.133, 26, 16, 0.2, Math.PI - 0.4, 0.5, 1.75), hair, [0, H - 0.005, 0.006], [0, 0, 0], [1.05, 1.22, 1.1], T);
    const cone = new THREE.ConeGeometry(0.048, 0.24, 9);
    const spikes = [
      // azymut, elewacja, kierunek [x, y, z], skala, jaśniejszy
      [0.0, 0.95, [0, 0.5, 0.87], 1.05, 1],
      [-0.35, 0.92, [-0.15, 0.45, 0.88], 0.95, 0],
      [0.35, 0.92, [0.15, 0.45, 0.88], 0.95, 0],
      [-0.7, 0.75, [-0.22, 0.45, 0.87], 0.85, 1],
      [0.7, 0.75, [0.22, 0.45, 0.87], 0.85, 1],
      [0.0, 1.25, [0, 0.45, 0.9], 1.15, 0],
      [-0.4, 1.2, [-0.25, 0.35, 0.9], 1.05, 0],
      [0.4, 1.2, [0.25, 0.35, 0.9], 1.05, 0],
      [-1.15, 0.55, [-0.28, 0.2, 0.94], 0.8, 0],
      [1.15, 0.55, [0.28, 0.2, 0.94], 0.8, 0],
      [Math.PI - 0.5, 0.75, [-0.25, 0.05, 1], 1.0, 1],
      [Math.PI, 0.8, [0, 0.1, 1], 1.1, 0],
      [Math.PI + 0.5, 0.75, [0.25, 0.05, 1], 1.0, 1],
      [Math.PI - 0.35, 0.3, [-0.2, -0.25, 1], 0.85, 0],
      [Math.PI + 0.35, 0.3, [0.2, -0.25, 1], 0.85, 0],
    ];
    const c = new THREE.Vector3(0, H, 0);
    for (const [az, el, d, sc, light] of spikes) {
      const n = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el) * 1.2, -Math.cos(az) * Math.cos(el));
      const p = c.clone().addScaledVector(n, 0.13);
      const dir = new THREE.Vector3(...d).normalize();
      const m = this.part(head, cone, light ? hairLight : hair, [p.x, p.y, p.z], [0, 0, 0], [sc, sc, sc], T);
      m.quaternion.setFromUnitVectors(Y_AXIS, dir);
      m.position.addScaledVector(dir, 0.07 * sc);
    }

    // ---- gogle na czole ----
    const g = new THREE.Group();
    g.position.set(0, H + 0.11, 0.004);
    g.rotation.x = 0.3;
    head.add(g);
    this.part(g, new THREE.TorusGeometry(0.1, 0.011, 8, 40), strap, [0, 0, 0], [Math.PI / 2, 0, 0], [1.1, 1.16, 1], T);
    for (const sx of [-1, 1]) {
      const lensGroup = new THREE.Group();
      lensGroup.position.set(0.046 * sx, 0.01, -0.118);
      lensGroup.rotation.set(-0.25, 0.28 * sx, 0);
      g.add(lensGroup);
      this.part(lensGroup, new THREE.CylinderGeometry(0.034, 0.03, 0.032, 20), frame, [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], T);
      this.part(lensGroup, new THREE.CircleGeometry(0.025, 20), lens, [0, 0, -0.0165], [0, Math.PI, 0], [1, 1, 1], T, false);
    }
    this.part(g, new THREE.BoxGeometry(0.03, 0.012, 0.012), frame, [0, 0.01, -0.13], [0, 0, 0], [1, 1, 1], T);
  }
}
