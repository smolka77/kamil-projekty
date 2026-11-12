/**
 * character/heroSculpt.js — definicja rzeźby postaci (prymitywy SDF → src/sculpt) w dwóch wariantach:
 *  'iskra' — Dr. Iskra (gracz): młoda wynalazczyni, fioletowe zaczesane włosy, mosiężne gogle,
 *            biały fartuch do kolan, żółte gumowe rękawice, czerwone trampki za kostkę, gadżet na plecach.
 *  'rival' — Manekin (cel treningowy): to samo ciało, grafitowy długi płaszcz z czerwonymi akcentami,
 *            czapka-beanie, czerwone gogle, czarne rękawice i buty.
 * Oba projekty są ORYGINALNE (nie odwzorowują żadnej istniejącej postaci ani stroju).
 *
 * Układ: metry, stopy na y = 0, postać patrzy w -Z, lewa strona postaci = x < 0 (kości ...L).
 * Ręce w bind pose są lekko odwiedzone (A-pose, ARM_A) — kości ramion mają rotację tak, by ich lokalna
 * oś -Y biegła wzdłuż kończyny (tego oczekuje IK w CharacterAnimator). Pozostałe kości: rotacja zerowa.
 *
 * Dłonie są wyrzeźbione od razu w chwycie broni: geometrię dłoni opisuję w układzie broni
 * (chwyt pistoletowy / łoże), a macierz ramki przenosi ją do bind pose tak, żeby w typowej pozie
 * celowania nadgarstek nie był skręcony (patrz gripCorrection w CharacterModel.js).
 */
import * as THREE from 'three';
import {
  sphere, ellipsoid, capsule, roundCone, roundBox, torus, cylinder, plane,
  group, shell, frame, both, mirror, bezierTube, cut, compileField, evalPoint,
} from '../sculpt/index.js';

const DEG = Math.PI / 180;

// ---------------------------------------------------------------------------
// proporcje (heroiczne, stylizowane: ~1.85 m, ~7.3 głowy)
// ---------------------------------------------------------------------------
export const ARM_A = 14 * DEG; // odwiedzenie ramion w bind pose
export const SH_L = [-0.2, 1.465, 0.005]; // staw barkowy (lewy)
const AD = [-Math.sin(ARM_A), -Math.cos(ARM_A), 0]; // kierunek lewej ręki
export const ELB_T = 0.3; // bark → łokieć
export const WRIST_T = 0.545; // bark → nadgarstek
export const PALM_T = 0.62; // bark → środek dłoni (kość hand)
/** punkt na lewej ręce w odległości t od barku (+ przesunięcie) */
export const armPt = (t, dx = 0, dy = 0, dz = 0) => [SH_L[0] + AD[0] * t + dx, SH_L[1] + AD[1] * t + dy, SH_L[2] + dz];
const armRad = (t) => (t < ELB_T ? lerp(0.056, 0.044, t / ELB_T) : lerp(0.044, 0.032, (t - ELB_T) / (WRIST_T - ELB_T)));

export const HIP_Y = 1.0;
const THIGH_L = [-0.097, 0.935, 0.0];
const KNEE_L = [-0.1, 0.515, 0.0];
const ANKLE_L = [-0.102, 0.095, 0.025];
export const EYE_L = [-0.0385, 1.727, -0.0745]; // środek lewej gałki ocznej
export const EYE_R = [0.0385, 1.727, -0.0745];
export const EYE_RAD = 0.0232;
// górna powieka: płaszczyzna cięcia (przesunięcie nad środkiem oka, normalna) i promień krawędzi —
// krawędź zakrywa górne ~20% tęczówki (spokojne, nie "wystraszone" spojrzenie)
const LID_OFF = 0.0125;
const LID_N = [0.08, 0.95, -0.15];
const LID_R = EYE_RAD + 0.0045;
// głowa jest lekko powiększona (stylizacja: większa głowa) — skala wokół nasady szyi
export const HEAD_SCALE = 1.07;
const HEAD_PIVOT = [0, 1.6, 0];
const HEAD_M = new THREE.Matrix4().makeTranslation(...HEAD_PIVOT).multiply(new THREE.Matrix4().makeScale(HEAD_SCALE, HEAD_SCALE, HEAD_SCALE)).multiply(new THREE.Matrix4().makeTranslation(-HEAD_PIVOT[0], -HEAD_PIVOT[1], -HEAD_PIVOT[2]));
/** punkt z przestrzeni "projektowej" głowy → bind pose (po skalowaniu) */
export const headPt = (p) => {
  const v = new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(HEAD_M);
  return [v.x, v.y, v.z];
};
const headFrame = (prims) => frame(HEAD_M, prims);

function lerp(a, b, t) {
  return a + (b - a) * t;
}
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const mx = (p) => [-p[0], p[1], p[2]];

// ---------------------------------------------------------------------------
// szkielet
// ---------------------------------------------------------------------------
export function heroSkeleton() {
  const s = [
    { name: 'hips', parent: null, pos: [0, HIP_Y, 0] },
    { name: 'coat', parent: 'hips', pos: [0, 1.04, 0] },
    { name: 'spine', parent: 'hips', pos: [0, 1.12, 0] },
    { name: 'chest', parent: 'spine', pos: [0, 1.3, 0] },
    { name: 'neck', parent: 'chest', pos: [0, 1.52, 0] },
    { name: 'head', parent: 'neck', pos: [0, 1.615, 0] },
  ];
  for (const [side, sx] of [['L', 1], ['R', -1]]) {
    const m = (p) => [p[0] * sx, p[1], p[2]];
    const rot = [0, 0, -ARM_A * sx];
    s.push({ name: 'upperArm' + side, parent: 'chest', pos: m(SH_L), rot });
    s.push({ name: 'forearm' + side, parent: 'upperArm' + side, pos: m(armPt(ELB_T)), rot });
    s.push({ name: 'hand' + side, parent: 'forearm' + side, pos: m(armPt(PALM_T)), rot });
    s.push({ name: 'thigh' + side, parent: 'hips', pos: m(THIGH_L) });
    s.push({ name: 'shin' + side, parent: 'thigh' + side, pos: m(KNEE_L) });
    s.push({ name: 'foot' + side, parent: 'shin' + side, pos: m(ANKLE_L) });
  }
  return s;
}

// ---------------------------------------------------------------------------
// bryły ciała (z opcjonalnym "napompowaniem" — ubrania to ciało + grubość)
// ---------------------------------------------------------------------------
function torsoPrims(inf = 0, opt = {}) {
  const o = (x) => ({ inflate: inf, ...x });
  const p = [
    ellipsoid([0, 0.985, 0.005], [0.158, 0.118, 0.112], o({ bone: 'hips' })),
    ...both([ellipsoid([-0.066, 0.95, 0.045], [0.075, 0.085, 0.07], o({ bone: 'hips', k: 0.05 }))]),
    ellipsoid([0, 1.13, -0.004], [0.14, 0.125, 0.102], o({ bone: 'spine', k: 0.07 })),
    ellipsoid([0, 1.318, 0.0], [0.178, 0.158, 0.118], o({ bone: 'chest', k: 0.07 })),
    ...both([
      ellipsoid([-0.072, 1.362, -0.056], [0.08, 0.062, 0.052], o({ bone: 'chest', k: 0.05 })), // piersiowe
      ellipsoid([-0.085, 1.37, 0.045], [0.09, 0.1, 0.062], o({ bone: 'chest', k: 0.06 })), // łopatki / najszersze
      roundCone([-0.035, 1.53, 0.018], [-0.15, 1.478, 0.012], 0.046, 0.042, o({ bone: 'chest', k: 0.05 })), // czworoboczne
    ]),
  ];
  if (opt.neck !== false) {
    p.push(capsule([0, 1.46, 0.014], [0, 1.66, 0.004], 0.066, o({ bone: 'neck', k: 0.05 })));
    // mięśnie mostkowo-obojczykowo-sutkowe: od miejsca za uchem do wcięcia mostka (szyja nie jest "patykiem")
    p.push(...both([roundCone([-0.058, 1.66, 0.012], [-0.014, 1.485, -0.045], 0.019, 0.015, o({ bone: 'neck', k: 0.03 }))]));
  }
  return p;
}

/** lewa ręka do t = tEnd; prawa przez both() */
function armPrims(inf = 0, tEnd = WRIST_T, opt = {}) {
  const o = (x) => ({ inflate: inf, ...x });
  const p = [
    sphere(armPt(0, -0.004, 0.004, 0), 0.059, o({ bone: 'upperArmL', k: 0.06 })), // naramienny
    roundCone(armPt(0.03), armPt(Math.min(tEnd, ELB_T)), 0.056, armRad(Math.min(tEnd, ELB_T)), o({ bone: 'upperArmL', k: 0.04 })),
  ];
  if (opt.muscles !== false) p.push(ellipsoid(armPt(0.15, 0, 0, -0.012), [0.045, 0.075, 0.046], o({ bone: 'upperArmL', rot: [0, 0, -ARM_A], k: 0.04 })));
  // rękaw ubrania: grubszy przy barku (ciało z mięśniami nie przebija materiału w ruchu)
  if (opt.shoulderInf) p.push(roundCone(armPt(0, -0.004, 0.004, 0), armPt(0.2), 0.059, armRad(0.2), { inflate: opt.shoulderInf, bone: 'upperArmL', k: 0.03 }));
  if (tEnd > ELB_T) {
    p.push(roundCone(armPt(ELB_T), armPt(tEnd), 0.044, armRad(tEnd), o({ bone: 'forearmL', k: 0.03 })));
    if (opt.muscles !== false) p.push(ellipsoid(armPt(0.37, 0, 0, -0.004), [0.044, 0.08, 0.042], o({ bone: 'forearmL', rot: [0, 0, -ARM_A], k: 0.04 })));
  }
  // ręka jako grupa: z tułowiem łączy się małym promieniem (inaczej łokieć "zlewa się" z talią w bind pose)
  return [group(p, { k: opt.joinK ?? 0.035, bone: 'upperArmL' })];
}

function legPrims(inf = 0, opt = {}) {
  const o = (x) => ({ inflate: inf, ...x });
  const os = (x) => ({ inflate: inf + (opt.shinExtra || 0), ...x }); // poniżej kolana (luźniejsze nogawki cargo)
  const ankle = opt.ankleY ? [ANKLE_L[0], opt.ankleY, ANKLE_L[2]] : ANKLE_L;
  return [group([
    roundCone(add3(THIGH_L, [0, 0.005, 0.005]), KNEE_L, 0.094, 0.064, o({ bone: 'thighL', k: 0.07 })),
    ellipsoid([-0.1, 0.75, -0.018], [0.064, 0.145, 0.068], o({ bone: 'thighL', k: 0.05 })), // czworogłowy
    sphere(KNEE_L, 0.061, o({ bone: 'shinL', k: 0.03 })),
    roundCone(KNEE_L, ankle, 0.06, 0.043, os({ bone: 'shinL', k: 0.03 })),
    ellipsoid([-0.1, 0.37, 0.028], [0.058, 0.11, 0.056], os({ bone: 'shinL', k: 0.04 })), // łydka
  ], { k: opt.joinK ?? 0.03, bone: 'thighL' })];
}

// ---------------------------------------------------------------------------
// narzędzia
// ---------------------------------------------------------------------------
/** sonda powierzchni: z (od przodu) albo dowolny promień po polu SDF zbudowanym z prymitywów */
function probe(prims, voxel = 0.01) {
  const F = compileField(prims, { voxel, pad: 0.05 });
  const d = (p) => evalPoint(F, p[0], p[1], p[2]);
  const ray = (o, dir, maxT = 0.6) => {
    const l = Math.hypot(dir[0], dir[1], dir[2]);
    const u = [dir[0] / l, dir[1] / l, dir[2] / l];
    let t0 = 0;
    let t = 0;
    const step = 0.0025;
    while (t < maxT) {
      const v = d(add3(o, mul3(u, t)));
      if (v < 0) break;
      t0 = t;
      t += step;
    }
    if (t >= maxT) return null;
    let a = t0, b = t;
    for (let i = 0; i < 14; i++) {
      const m = (a + b) / 2;
      if (d(add3(o, mul3(u, m))) < 0) b = m;
      else a = m;
    }
    return add3(o, mul3(u, (a + b) / 2));
  };
  return {
    d,
    ray,
    /** punkt powierzchni na przodzie (z < 0) dla danego x, y */
    front: (x, y) => ray([x, y, -0.6], [0, 0, 1]),
    back: (x, y) => ray([x, y, 0.6], [0, 0, -1]),
    side: (y, z, sx) => ray([0.6 * sx, y, z], [-sx, 0, 0]),
  };
}

/** naszywka: skorupa grubości t na zewnątrz `base`, ograniczona do obszaru `region` */
function patch(base, t, region, o = {}) {
  return group(
    [shell(base, t, { offset: t / 2 + (o.lift || 0), blend: o.blend ?? 0.05 }), group(region, { op: 'int', k: o.kr ?? 0.0025 })],
    { k: o.k ?? 0.002, bone: o.bone },
  );
}

/** obszar klinowy (rozcięcie z przodu): |x| < w(y) liniowo między (y0,w0) a (y1,w1), dla z < zMax */
function wedge(y0, w0, y1, w1, zMin = -0.45, zMax = 0.0, k = 0.0) {
  const dir = [w1 - w0, y1 - y0];
  const l = Math.hypot(dir[0], dir[1]);
  const nR = [dir[1] / l, -dir[0] / l, 0]; // normalna na zewnątrz od prawej krawędzi
  if (y1 < y0) {
    nR[0] = -nR[0];
    nR[1] = -nR[1];
  }
  const ymin = Math.min(y0, y1), ymax = Math.max(y0, y1);
  return group([
    roundBox([0, (ymin + ymax) / 2, (zMin + zMax) / 2], [0.4, (ymax - ymin) / 2, (zMax - zMin) / 2], 0.004),
    plane([w0, y0, 0], nR, { op: 'int', k }),
    plane([-w0, y0, 0], [-nR[0], nR[1], 0], { op: 'int', k }),
  ]);
}

// ---------------------------------------------------------------------------
// dłonie w chwycie (układ broni)
// ---------------------------------------------------------------------------
const fingerSeg = (pts, radii, o) => {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) out.push(roundCone(pts[i], pts[i + 1], radii[i], radii[i + 1], { k: o.k ?? 0.004, ...o }));
  for (let i = 1; i < pts.length - 1; i++) out.push(sphere(pts[i], radii[i] * 1.06, { k: 0.003, ...o })); // stawy (kostki)
  return out;
};

/**
 * Prawa dłoń na chwycie pistoletowym. Układ "chwytu": x w prawo, y wzdłuż osi chwytu (w górę),
 * z do tyłu (przód chwytu = -z), początek = punkt chwytu (środek pięści). wrist = nadgarstek w tym układzie.
 */
function rightGripHand(wrist) {
  const p = [];
  const ax = 0.031, az = 0.0435; // elipsa, po której owijają się palce (chwyt + promień palca)
  const at = (deg, y, s = 1) => [ax * Math.cos(deg * DEG) * s, y, -az * Math.sin(deg * DEG) * s];
  const rows = [
    // y, skala długości
    [0.0, 1.0],
    [-0.0205, 0.98],
    [-0.0395, 0.9],
  ];
  const knuckles = [];
  for (const [y, s] of rows) {
    const K = at(32, y, 1.3);
    const P1 = at(88, y - 0.002, 1.0 * s + 0.03 * (1 - s));
    const P2 = at(140, y - 0.004, 0.98);
    const T = at(178 - (1 - s) * 60, y - 0.005, 0.93);
    knuckles.push(K);
    p.push(...fingerSeg([K, P1, P2, T], [0.0112, 0.0106, 0.0098, 0.0088], {}));
  }
  // palec wskazujący wzdłuż kabłąka, opuszek przy spuście
  const KI = at(30, 0.024, 1.25);
  const I1 = [0.022, 0.026, -0.054];
  const I2 = [0.008, 0.027, -0.068];
  const I3 = [-0.004, 0.025, -0.066];
  knuckles.push(KI);
  p.push(...fingerSeg([KI, I1, I2, I3], [0.0112, 0.0104, 0.0096, 0.0088], {}));
  // śródręcze: od nadgarstka do kostek (zlane w płytę)
  for (const K of knuckles) {
    const w = add3(wrist, [0, K[1] * 0.45, 0]);
    p.push(roundCone(w, K, 0.017, 0.0125, { k: 0.02 }));
  }
  p.push(ellipsoid(mix3(wrist, [0.022, -0.02, 0.02], 0.55), [0.02, 0.03, 0.022], { k: 0.02 })); // kłąb małego palca
  // kciuk: owija lewą stronę chwytu nad palcami
  const T0 = mix3(wrist, [-0.004, 0.03, 0.03], 0.62);
  const T1 = [-0.019, 0.04, 0.02];
  const T2 = [-0.03, 0.035, -0.004];
  const T3 = [-0.029, 0.027, -0.02];
  p.push(ellipsoid(mix3(T0, T1, 0.35), [0.018, 0.016, 0.02], { k: 0.018 })); // kłąb kciuka
  p.push(...fingerSeg([T0, T1, T2, T3], [0.0135, 0.0122, 0.011, 0.0096], {}));
  return p;
}

/** Lewa dłoń pod łożem. Układ broni przesunięty do punktu chwytu: łoże nad dłonią (dno na y≈0.022), wzdłuż z. */
function leftGuardHand(wrist) {
  const p = [];
  const fz = [-0.032, -0.0105, 0.011, 0.032];
  const len = [1.0, 1.04, 1.0, 0.86];
  const knuckles = [];
  fz.forEach((z, i) => {
    const s = len[i];
    // palce owinięte wokół boku łoża (opuszki dociśnięte do ścianki), z przerwami między palcami
    const K = [0.029, 0.006, z];
    const P1 = [0.0445, 0.006 + 0.03 * s, z - 0.001];
    const P2 = [0.0425, 0.006 + 0.057 * s, z - 0.002];
    const T = [0.034, 0.006 + 0.076 * s, z - 0.003];
    knuckles.push(K);
    p.push(...fingerSeg([K, P1, P2, T], [0.0101, 0.0096, 0.009, 0.0081], { k: 0.0025 }));
  });
  for (const K of knuckles) {
    const w = add3(wrist, [0, 0, K[2] * 0.45]);
    p.push(roundCone(w, K, 0.017, 0.0125, { k: 0.02 }));
  }
  p.push(ellipsoid(mix3(wrist, [0.004, 0.006, 0.01], 0.6), [0.026, 0.016, 0.03], { k: 0.02 }));
  const T0 = mix3(wrist, [-0.022, 0.004, 0.012], 0.6);
  const T1 = [-0.03, 0.01, 0.0];
  const T2 = [-0.0445, 0.032, -0.012];
  const T3 = [-0.042, 0.062, -0.03]; // opuszek kciuka wyżej na boku łoża
  p.push(ellipsoid(mix3(T0, T1, 0.4), [0.017, 0.016, 0.02], { k: 0.018 }));
  p.push(...fingerSeg([T0, T1, T2, T3], [0.0135, 0.0122, 0.011, 0.0096], {}));
  return p;
}

// ---------------------------------------------------------------------------
// warianty
// ---------------------------------------------------------------------------
export const VARIANTS = {
  iskra: {
    name: 'Dr. Iskra',
    skin: 0xeab394,
    iris: 0x3f9a63,
    brow: 0x2a1a48,
    lips: 0xc06a62,
    blush: 0xf08a7c,
    hair: { style: 'swept', color: 0x8c48ac, root: 0x44205e, tip: 0xd0a0f0 }, // cieplejszy fiolet (ACES nie przesuwa go w niebieski)
    coat: { long: false, color: 0xefe9df, trim: null, rolled: true },
    shirt: 0x3a2a68,
    emblem: 0xffc21f,
    pants: 0x4f6488,
    pads: 0x4a505c,
    belt: 0x6e4529,
    pouch: 0x8a6a3e,
    metal: 0xc99a47,
    gloves: { color: 0xf1c21c, kind: 'rubber' },
    shoes: { color: 0xd63a2e, sole: 0xe8e6de, laces: 0xf1efe8, boot: false },
    goggles: { frame: 0xc99a47, lens: 0x47e6ff, strap: 0x3c2a22 },
    backBling: true,
    smirk: 1,
  },
  rival: {
    name: 'Manekin',
    skin: 0xb07656,
    iris: 0xb8792a,
    brow: 0x3a1d18,
    lips: 0x9a5a4e,
    blush: 0xc9786a,
    hair: { style: 'beanie', color: 0x8c1d2a, root: 0x4a0d14, tip: 0xc23a44, hat: 0x3a3e48, hatStripe: 0xc8283a },
    coat: { long: true, color: 0x3b3f4a, trim: 0xc8283a, rolled: false },
    shirt: 0xe7e7e4,
    emblem: 0xc8283a,
    pants: 0x2c2f37,
    pads: 0x3a3e47,
    belt: 0x1d1d22,
    pouch: 0x2a2c33,
    metal: 0x9aa0aa,
    gloves: { color: 0x1d1e23, kind: 'leather' },
    shoes: { color: 0x2b2724, sole: 0x18181b, laces: 0xc8283a, boot: true },
    goggles: { frame: 0x4b505c, lens: 0xff3a52, strap: 0x18181b },
    backBling: false,
    smirk: 0,
  },
};

// ---------------------------------------------------------------------------
// GŁOWA (warstwa 'head' — osobna siatka, sztywno na kości head)
// ---------------------------------------------------------------------------
function headPrims(V) {
  const E = EYE_L;
  const r = EYE_RAD;
  const sm = V.smirk;
  const p = [
    ellipsoid([0, 1.752, 0.012], [0.093, 0.104, 0.107]), // czaszka
    ellipsoid([0, 1.69, -0.026], [0.085, 0.085, 0.077], { k: 0.035 }), // twarz
    ...both([roundCone([-0.068, 1.685, 0.012], [-0.03, 1.615, -0.058], 0.025, 0.02, { k: 0.03 })]), // żuchwa (kanciasta, heroiczna)
    ellipsoid([0, 1.622, -0.068], [0.026, 0.02, 0.022], { k: 0.022 }), // broda
    ...both([
      ellipsoid([-0.06, 1.716, -0.062], [0.032, 0.016, 0.024], { k: 0.025 }), // kości policzkowe (wyżej — światło łapie górę policzka)
      ellipsoid([-0.048, 1.68, -0.05], [0.025, 0.019, 0.022], { k: 0.03 }), // policzki (szczuplejsze)
    ]),
    capsule([-0.046, 1.763, -0.087], [0.046, 1.763, -0.087], 0.014, { k: 0.022 }), // łuk brwiowy
    ellipsoid([0, 1.654, -0.07], [0.027, 0.018, 0.016], { k: 0.03 }), // okolica ust
    // oczodoły pod gałki
    ...both([sphere(E, r + 0.0003, { op: 'sub', k: 0.004 })]),
    // powieki: górna (gruba krawędź) i dolna
    ...both([
      group([sphere(E, LID_R), plane(add3(E, [0, LID_OFF, 0]), LID_N, { op: 'sub', k: 0.0016 })], { k: 0.004 }),
      group([sphere(E, r + 0.0024), plane(add3(E, [0, -0.0125, 0]), [0.05, -0.94, -0.1], { op: 'sub', k: 0.0016 })], { k: 0.004 }),
      ellipsoid(add3(E, [-0.002, 0.019, -0.002]), [0.022, 0.0035, 0.009], { k: 0.005 }), // fałd powieki (płaski)
      // kąciki oka: skóra domyka gałkę z boku (bez wystającej bieli przy widoku 3/4)
      sphere(add3(E, [-0.0205, 0.0005, 0.0045]), 0.0072, { k: 0.004 }),
      sphere(add3(E, [0.0185, -0.001, 0.004]), 0.0055, { k: 0.004 }),
    ]),
    // nos
    roundCone([0, 1.739, -0.094], [0, 1.691, -0.1135], 0.0042, 0.0072, { k: 0.012 }),
    sphere([0, 1.688, -0.1135], 0.0074, { k: 0.006 }),
    ...both([
      sphere([-0.0102, 1.6825, -0.1015], 0.0062, { k: 0.007 }), // skrzydełka
      ellipsoid([-0.0066, 1.6785, -0.1035], [0.0028, 0.0015, 0.003], { op: 'sub', k: 0.0028 }), // nozdrza (pod spodem, skierowane w dół)
      sphere([-0.0158, 1.684, -0.0975], 0.0045, { op: 'paint', color: 0xa86a5a, soft: 0.004, strength: 0.3 }), // bruzda nosowo-skrzydełkowa (cień malowany)
    ]),
    // usta (prawy kącik uniesiony przy uśmieszku)
    // górna warga z łukiem Kupidyna, dolna pełniejsza; rozchylenie tylko malowane (cienkie wycięcie aliasowało)
    ellipsoid([0, 1.651, -0.0985], [0.024, 0.0045, 0.0072], { k: 0.0045 }),
    ...[-1, 1].map((sx) => sphere([0.006 * sx, 1.6525, -0.1015], 0.004, { k: 0.003 })),
    ellipsoid([0, 1.6405, -0.0955], [0.02, 0.0068, 0.0088], { k: 0.0045 }),
    capsule([0, 1.668, -0.1065], [0, 1.6555, -0.1035], 0.0035, { op: 'sub', k: 0.004 }), // rynienka podnosowa
    ellipsoid([0, 1.632, -0.09], [0.016, 0.003, 0.006], { op: 'sub', k: 0.008 }), // bruzda bródkowo-wargowa (płytka)
    // kąciki ust: delikatnie schowane w policzki
    ...[-1, 1].map((sx) => sphere([0.0275 * sx, 1.6455 + (sx > 0 ? 0.0025 * sm : 0) - 0.001, -0.093], 0.0018, { op: 'sub', k: 0.004 })),
    // uszy
    ...both([
      ellipsoid([-0.095, 1.712, 0.012], [0.014, 0.032, 0.022], { rot: [0, 0.45, -0.08], k: 0.006 }),
      ellipsoid([-0.1035, 1.708, 0.012], [0.0055, 0.018, 0.012], { rot: [0, 0.45, -0.08], op: 'sub', k: 0.003 }),
      torus([-0.1025, 1.714, 0.013], 0.0205, 0.0036, { rot: [0, 0.45, Math.PI / 2 - 0.08], squash: { dir: [0, 1, 0], factor: 1.45 }, k: 0.003 }),
      ...bezierTube([[-0.1025, 1.727, 0.02], [-0.1045, 1.71, 0.022], [-0.1015, 1.695, 0.012]], 0.0026, 0.0018, { segments: 4, k: 0.003 }), // grzbiet przeciwobrąbka
      sphere([-0.087, 1.708, -0.006], 0.005, { k: 0.006 }), // skrawek (tragus) — wtopiony, bez szczeliny
    ]),
    // malowanie: usta, rumieńce, cień oczodołów
    ellipsoid([0, 1.6455, -0.098], [0.028, 0.0125, 0.015], { op: 'paint', color: V.lips, soft: 0.003, strength: 0.55 }),
    ellipsoid([0.0015 * sm, 1.6462 + 0.0012 * sm, -0.101], [0.026, 0.0012, 0.01], { rot: [0, 0, 0.06 * sm], op: 'paint', color: 0x5a2a2a, soft: 0.0012, strength: 0.6 }),
    // ciepłe zaczerwienienia: czubek nosa, uszy
    sphere([0, 1.69, -0.118], 0.012, { op: 'paint', color: 0xe07a6a, soft: 0.008, strength: 0.3 }),
    ...both([ellipsoid([-0.1, 1.712, 0.012], [0.016, 0.034, 0.024], { op: 'paint', color: 0xd98a78, soft: 0.006, strength: 0.35 })]),
    // "maska" ciepła: nos, policzki (subtelnie)
    ellipsoid([0, 1.695, -0.1], [0.05, 0.022, 0.03], { op: 'paint', color: 0xe08a78, soft: 0.02, strength: 0.14 }),
    // linia rzęs (kreska na krawędzi górnej powieki) z lekkim "skrzydełkiem"
    ...both([
      ellipsoid(add3(E, [0.0, 0.0095, -0.016]), [0.0245, 0.0032, 0.013], { op: 'paint', color: 0x24141c, soft: 0.0012, strength: 0.92 }),
      ellipsoid(add3(E, [-0.024, 0.0085, -0.007]), [0.0065, 0.0025, 0.011], { rot: [0, 0, -0.35], op: 'paint', color: 0x24141c, soft: 0.0012, strength: 0.85 }),
    ]),
    ...both([
      sphere([-0.058, 1.69, -0.075], 0.027, { op: 'paint', color: V.blush, soft: 0.02, strength: 0.45 }),
      ellipsoid(add3(E, [0, 0.013, -0.006]), [0.026, 0.011, 0.02], { op: 'paint', color: 0xc78f7c, soft: 0.006, strength: 0.15 }), // cień powieki (tylko górna)
    ]),
    // podkład brwi (miękki cień pod włoskami)
    ...both(browPath(V, 'L').slice(0, -1).map((a, i, arr) => capsule(a, browPath(V, 'L')[i + 1], 0.0045, { op: 'paint', color: V.brow, soft: 0.004, strength: 0.4 }))),
  ];
  // chłodniejszy ton żuchwy / nad wargą (Manekin: cień zarostu)
  if (!sm) {
    p.push(ellipsoid([0, 1.632, -0.06], [0.06, 0.03, 0.05], { op: 'paint', color: 0x8a6a66, soft: 0.02, strength: 0.12 }));
    p.push(ellipsoid([0, 1.659, -0.094], [0.022, 0.006, 0.012], { op: 'paint', color: 0x8a6a66, soft: 0.006, strength: 0.12 }));
  }
  return p;
}

/** linia brwi (lewa strona postaci; 'R' = druga brew przed odbiciem) — punkty krzywej Béziera */
function browPath(V, side) {
  const up = V.smirk ? 0.004 : -0.001;
  // brwi wtopione 1.5 mm w skórę (nie "leżą" na czole)
  if (side === 'L') return [[-0.012, 1.7585, -0.1033], [-0.038, 1.771 + up, -0.1063], [-0.066, 1.764 + up * 0.5, -0.093]];
  return [[-0.012, 1.7585, -0.1033], [-0.038, 1.769, -0.1063], [-0.066, V.smirk ? 1.762 : 1.763, -0.093]];
}

function browPrims(V) {
  const bo = { segments: 6, squash: { dir: [0, 0.2, 1], factor: 0.4 }, k: 0.002 };
  const L = bezierTube(browPath(V, 'L'), 0.0044, 0.0018, bo);
  const R = mirror(bezierTube(browPath(V, 'R'), 0.0044, 0.0018, bo));
  // linia rzęs wzdłuż krawędzi górnej powieki (z "skrzydełkiem" w zewnętrznym kąciku)
  const E = EYE_L;
  const rr = LID_R + 0.0002;
  const [nx, ny, nz] = LID_N;
  const lid = [];
  for (const dx of [0.0195, 0.0105, 0.0, -0.0105, -0.019]) {
    let dy = LID_OFF;
    let dz = 0;
    for (let it = 0; it < 6; it++) {
      dz = -Math.sqrt(Math.max(1e-8, rr * rr - dx * dx - dy * dy));
      dy = LID_OFF - (nx * dx + nz * dz) / ny;
    }
    lid.push([E[0] + dx, E[1] + dy - 0.0002, E[2] + dz - 0.0012]);
  }
  const last = lid[lid.length - 1];
  lid.push([last[0] - 0.004, last[1] + 0.0018, last[2] + 0.003]);
  const lashes = [];
  for (let i = 0; i < lid.length - 1; i++) {
    const t = i / (lid.length - 2);
    lashes.push(roundCone(lid[i], lid[i + 1], 0.0011 + 0.0007 * Math.sin(Math.PI * Math.min(1, t * 1.2)), i === lid.length - 2 ? 0.0006 : 0.0011 + 0.0007 * Math.sin(Math.PI * Math.min(1, (t + 0.25) * 1.2)), { k: 0.0015, squash: { dir: [0, 1, 0], factor: 0.7 } }));
  }
  return [...L, ...R, ...both(lashes)];
}

// bryła głowy (bez wgłębień i malowania) — do rzutowania kępek włosów na powierzchnię
function headSolid() {
  return [
    ellipsoid([0, 1.752, 0.012], [0.093, 0.104, 0.107]),
    ellipsoid([0, 1.69, -0.026], [0.085, 0.085, 0.077], { k: 0.035 }),
    ...both([roundCone([-0.068, 1.685, 0.012], [-0.03, 1.615, -0.058], 0.025, 0.02, { k: 0.03 })]),
    capsule([0, 1.5, 0.012], [0, 1.66, 0.006], 0.062, { k: 0.04 }),
  ];
}
let _headProbe = null;
const headProbe = () => (_headProbe ||= probe(headSolid(), 0.005));

// włosy zaczesane do tyłu (Iskra)
function sweptHair(V) {
  const hp = headProbe();
  const EAR = [-0.097, 1.712, 0.012];
  // czepiec: czaszka + grubość, pełne pokrycie aż do karku; linia włosów z przodu, łuk nad uszami
  const cap = group(
    [
      ellipsoid([0, 1.752, 0.012], [0.093, 0.104, 0.107], { inflate: 0.0085 }),
      ellipsoid([0, 1.8, 0.018], [0.086, 0.07, 0.1], { inflate: 0.012, k: 0.03 }),
      // kark: włosy schodzą niżej za uszami
      ellipsoid([0, 1.69, 0.07], [0.07, 0.05, 0.04], { inflate: 0.004, k: 0.03 }),
      plane([0, 1.798, -0.08], [0, 0.5, 0.866], { op: 'sub', k: 0.012 }), // linia włosów nad czołem
      plane([0, 1.712, 0.0], [0, 1, 0.55], { op: 'sub', k: 0.012 }), // boki nad uszami, kark nisko (y≈1.655)
      ...both([sphere(EAR, 0.025, { op: 'sub', k: 0.012 })]), // wycięcie wokół ucha
    ],
    { k: 0.0 },
  );
  const p = [cap];
  const K = 0.006; // miękkie łączenie kępek z czepcem
  const clumps = []; // osie kępek (do rowków między sąsiadami)
  const clump = (pts, r0, r1, sq = [0, 1, 0], f = 0.62, rec = null, taper = 1.15) => {
    if (rec) rec.push({ pts, r0, r1 });
    return bezierTube(pts, r0, r1, { segments: 7, taper, squash: { dir: sq, factor: Math.min(0.85, f + 0.12) }, k: K });
  };
  // końcówka odgięta w górę i na zewnątrz (nie "kapie" kroplą)
  const flick = (q) => add3(q, [0, 0.006, 0.012]);
  // przedni rząd: od linii włosów w górę i do tyłu, końcówki odgięte nad karkiem
  const front = [-0.062, -0.031, 0.0, 0.031, 0.062];
  const frontRec = [];
  front.forEach((x, i) => {
    const s = Math.abs(x) / 0.062;
    const lift = 0.012 * (1 - s) + (i === 2 ? 0.008 : 0);
    p.push(
      ...clump(
        [
          [x * 0.95, 1.816 - s * 0.012, -0.08 + s * 0.012],
          [x * 1.12, 1.905 + lift - s * 0.02, -0.1 + s * 0.016],
          [x * 1.18, 1.925 + lift - s * 0.03, 0.04],
          [x * 1.25 + (i - 2) * 0.006, 1.87 - s * 0.035, 0.142 - s * 0.01],
        ],
        0.025,
        0.005,
        [x * 0.6, 1, -0.25],
        0.62,
        frontRec,
      ),
    );
  });
  // drugi rząd (objętość na czubku)
  const secondRec = [];
  [-0.046, -0.015, 0.016, 0.047].forEach((x) => {
    p.push(...clump([[x, 1.845, -0.045], [x * 1.15, 1.912, -0.01], [x * 1.25, 1.905, 0.09], [x * 1.3, 1.845, 0.152]], 0.034, 0.007, [x, 1, 0.2], 0.6, secondRec));
  });
  // boki: od skroni nad uchem do tyłu
  p.push(
    ...both([
      ...clump([[-0.086, 1.785, -0.055], [-0.1, 1.81, 0.0], [-0.102, 1.8, 0.075], [-0.084, 1.79, 0.125]], 0.024, 0.006, [-1, 0.2, 0], 0.4),
      ...clump([[-0.076, 1.84, -0.02], [-0.096, 1.875, 0.03], [-0.098, 1.855, 0.105], [-0.082, 1.825, 0.145]], 0.028, 0.007, [-0.7, 0.7, 0], 0.5),
    ]),
  );
  // tył: gładko w dół, końcówki odchylone na karku
  const backRec = [];
  [-0.05, 0.0, 0.05].forEach((x) => {
    p.push(...clump([[x, 1.86, 0.06], [x * 1.1, 1.81, 0.13], [x * 1.2, 1.755, 0.126], flick([x * 1.3, 1.73, 0.128])], 0.032, 0.0035, [0, 0, 1], 0.5, backRec, 1.4));
  });
  // kark: 4 kępki od potylicy w dół (naprzemienna długość), rzutowane na powierzchnię głowy, końcówki odgięte
  const onBack = (x, y, out) => {
    const s = hp.back(x, y) || [x, y, 0.1];
    return [s[0], s[1], s[2] + out];
  };
  [-0.06, -0.02, 0.02, 0.06].forEach((x, i) => {
    const len = [0.008, -0.008, 0.008, -0.008][i];
    p.push(
      ...clump(
        [onBack(x * 0.85, 1.8, 0.008), onBack(x * 0.95, 1.74, 0.009), onBack(x * 1.02, 1.698 - len, 0.008), flick(onBack(x * 1.05, 1.682 - len, 0.006))],
        0.034,
        0.0035,
        [0, 0, 1],
        0.4,
        null,
        1.4,
      ),
    );
  });
  // skronie / baczki przed uchem (2 na stronę)
  const onSide = (y, z, out) => {
    const s = hp.side(y, z, -1) || [-0.09, y, z];
    return [s[0] - out, s[1], s[2]];
  };
  p.push(
    ...both([
      ...clump([onSide(1.81, -0.045, 0.008), onSide(1.775, -0.04, 0.007), onSide(1.745, -0.034, 0.005), onSide(1.72, -0.031, 0.003)], 0.017, 0.006, [-1, 0, 0], 0.4),
      ...clump([onSide(1.83, -0.064, 0.008), onSide(1.8, -0.066, 0.007), onSide(1.772, -0.062, 0.004), onSide(1.752, -0.058, 0.002)], 0.014, 0.005, [-1, 0, 0.3], 0.42),
    ]),
  );
  // rowki między sąsiednimi kępkami przedniego rzędu (czytelny podział na pasma)
  const C0 = [0, 1.77, 0.02];
  for (const [rec, r0, r1] of [[frontRec, 0.0055, 0.0022], [secondRec, 0.005, 0.002], [backRec, 0.005, 0.002]]) {
    for (let i = 0; i < rec.length - 1; i++) {
      const A = rec[i], B = rec[i + 1];
      const pts = A.pts.map((pa, j) => {
        const m = mix3(pa, B.pts[j], 0.5);
        const d = sub3(m, C0);
        const l = Math.hypot(d[0], d[1], d[2]);
        const rr = lerp(A.r0, A.r1, j / (A.pts.length - 1));
        return add3(m, mul3(d, (rr * 0.55) / l));
      });
      p.push(...bezierTube(pts.slice(0, rec === backRec ? 3 : 4), r0, r1, { segments: 6, op: 'sub', k: 0.003 }));
    }
  }
  // jaśniejsze końcówki, ciemniejsze nasady (malowanie)
  p.push(ellipsoid([0, 1.9, 0.12], [0.14, 0.06, 0.1], { op: 'paint', color: V.hair.tip, soft: 0.05, strength: 0.75 }));
  p.push(...both([sphere([-0.095, 1.81, 0.16], 0.04, { op: 'paint', color: V.hair.tip, soft: 0.03, strength: 0.6 })]));
  p.push(ellipsoid([0, 1.775, -0.05], [0.12, 0.03, 0.05], { op: 'paint', color: V.hair.root, soft: 0.025, strength: 0.55 }));
  p.push(ellipsoid([0, 1.7, 0.08], [0.1, 0.05, 0.06], { op: 'paint', color: V.hair.root, soft: 0.03, strength: 0.45 }));
  return p;
}

// krótka grzywka spod czapki (Manekin)
function beanieHair(V) {
  const p = [];
  const clump = (pts, r0, r1, sq, f = 0.55, k = 0.01) => bezierTube(pts, r0, r1, { segments: 6, taper: 1.2, squash: { dir: sq, factor: f }, k });
  // grzywka na czoło, lekko na bok: 4 osobne, zwężające się kosmyki o różnej długości (z przerwami ~3 mm)
  [[-0.052, 0.034], [-0.022, 0.048], [0.008, 0.04], [0.036, 0.03]].forEach(([x, len], i) => {
    const y0 = 1.802, tipY = 1.8 - len;
    p.push(...clump([[x, y0, -0.083], [x + 0.008, y0 - len * 0.35, -0.1015], [x + 0.016 + i * 0.002, tipY, -0.0995]], 0.0115, 0.0022, [0, 0.3, -1], 0.5, 0.003));
  });
  // baczki i kark (undercut: krótko)
  p.push(
    ...both([
      ...clump([[-0.088, 1.785, -0.035], [-0.096, 1.755, -0.03], [-0.094, 1.728, -0.028]], 0.014, 0.004, [-1, 0, 0], 0.5),
    ]),
  );
  p.push(group([ellipsoid([0, 1.752, 0.012], [0.0975, 0.108, 0.1115]), plane([0, 1.705, 0.0], [0, 1, 0.55], { op: 'sub', k: 0.01 })], { k: 0.0 }));
  // krótkie kępki na karku spod czapki (z tyłu nie widać jednolitej "opaski")
  [[-0.05, 0.004], [-0.017, -0.004], [0.017, 0.003], [0.05, -0.003]].forEach(([x, dl]) => {
    p.push(...clump([[x, 1.75, 0.124], [x * 1.05, 1.716 - dl, 0.121], [x * 1.1, 1.692 - dl, 0.118]], 0.013, 0.003, [0, 0, 1], 0.5, 0.006));
  });
  p.push(ellipsoid([0, 1.74, 0.05], [0.12, 0.03, 0.08], { op: 'paint', color: V.hair.root, soft: 0.02, strength: 0.6 }));
  return p;
}

function beaniePrims(V) {
  const p = [
    group([
      ellipsoid([0, 1.79, 0.018], [0.106, 0.11, 0.118]),
      ellipsoid([0, 1.875, 0.035], [0.075, 0.03, 0.075], { k: 0.04 }), // lekko luźny czubek
      plane([0, 1.785, 0.0], [0, 1, 0.45], { op: 'sub', k: 0.006 }),
    ]),
    torus([0, 1.787, 0.018], 0.101, 0.017, { rot: [0.42, 0, 0], squash: { dir: [0, 0, 1], factor: 1.12 }, k: 0.006 }), // wywinięty brzeg
    torus([0, 1.787, 0.018], 0.101, 0.0195, { rot: [0.42, 0, 0], squash: { dir: [0, 0, 1], factor: 1.12 }, op: 'paint', color: V.hair.hatStripe, soft: 0.003, strength: 0.9 }),
  ];
  // prążki dzianiny na brzegu (rowki prostopadłe do brzegu)
  const c = new THREE.Vector3(0, 1.787, 0.018);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42, 0, 0));
  const P = (x, y, z) => new THREE.Vector3(x, y, z).applyQuaternion(q).add(c);
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2;
    const sx = Math.sin(a) * 0.117, sz = -Math.cos(a) * 0.117 * 1.12;
    p.push(capsule(P(sx, -0.014, sz), P(sx, 0.014, sz), 0.0032, { op: 'sub', k: 0.003 }));
  }
  return p;
}

// gogle na czole: obudowy + mostek (mosiądz), szkła, pasek
function gogglePrims(V, hairProbe) {
  const lensC = [];
  const frameP = [];
  const lensP = [];
  const y = V.hair.style === 'beanie' ? 1.83 : 1.842;
  for (const sx of [-1, 1]) {
    const x = 0.043 * sx;
    const s = hairProbe.front(x, y) || [x, y, -0.09];
    const n = new THREE.Vector3(0.28 * sx, 0.42, -0.86).normalize();
    const back = [s[0] + n.x * 0.0, s[1] + n.y * 0.0, s[2] + n.z * 0.0 + 0.004];
    const fr = [back[0] + n.x * 0.026, back[1] + n.y * 0.026, back[2] + n.z * 0.026];
    lensC.push(fr);
    frameP.push(cylinder(back, fr, 0.03, 0.009, { k: 0.002 }));
    frameP.push(cylinder(add3(fr, mul3([n.x, n.y, n.z], -0.004)), add3(fr, mul3([n.x, n.y, n.z], 0.003)), 0.033, 0.004, { k: 0.002 })); // obręcz
    frameP.push(cylinder(add3(fr, mul3([n.x, n.y, n.z], -0.01)), add3(fr, mul3([n.x, n.y, n.z], 0.01)), 0.0235, 0.002, { op: 'sub', k: 0.0015 }));
    lensP.push(cylinder(add3(fr, mul3([n.x, n.y, n.z], -0.008)), add3(fr, mul3([n.x, n.y, n.z], -0.0005)), 0.025, 0.004));
    // śrubki na obręczy
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.6;
      const u0 = new THREE.Vector3(1, 0, 0).addScaledVector(n, -n.x).normalize();
      const u = u0.applyAxisAngle(n, a).multiplyScalar(0.0295);
      frameP.push(sphere([fr[0] + u.x + n.x * 0.003, fr[1] + u.y + n.y * 0.003, fr[2] + u.z + n.z * 0.003], 0.0028, { k: 0.001 }));
    }
  }
  frameP.push(roundCone(add3(lensC[0], [0.024, -0.006, 0.012]), add3(lensC[1], [-0.024, -0.006, 0.012]), 0.006, 0.006, { k: 0.004 })); // mostek
  const strapC = V.hair.style === 'beanie' ? [0, 1.815, 0.022] : [0, 1.815, 0.02];
  // krótkie odcinki paska od obudów do tyłu (dalej pasek chowa się we włosach / czapce)
  const strap = [];
  lensC.forEach((c, i) => {
    const sx = i === 0 ? -1 : 1;
    const a = [c[0] + 0.026 * sx, c[1] - 0.008, c[2] + 0.02];
    const b = [0.098 * sx, strapC[1] - 0.004, strapC[2] - 0.035];
    const d = [0.104 * sx, strapC[1] - 0.012, strapC[2] + 0.03];
    strap.push(...bezierTube([a, b, d], 0.0075, 0.0075, { segments: 4, squash: { dir: [sx, 0, 0], factor: 0.5 }, k: 0.002 }).slice(0, 2));
  });
  return { frameP, lensP, strap, lensC };
}

// ---------------------------------------------------------------------------
// GŁÓWNA DEFINICJA
// ---------------------------------------------------------------------------
/**
 * V — wariant (VARIANTS[key]); hands — { R: Matrix4, L: Matrix4, wristR: [x,y,z], wristL } (ramki dłoni),
 * mats — fabryka materiałów: mats(nazwaWarstwy) → THREE.Material.
 */
export function buildHeroDef(V, hands, mats) {
  const long = V.coat.long;
  const rolled = V.coat.rolled;
  const hemY = long ? 0.3 : 0.47;

  // ---------------- ciało ----------------
  const body = [
    ...torsoPrims(0), ...both([...armPrims(0), ...legPrims(0)]), sphere([0, 1.655, 0.0], 0.045, { bone: 'head', k: 0.04 }),
    // miękki cień pod żuchwą (głowa nie wygląda na "doklejoną" do szyi)
    ellipsoid([0, 1.6, -0.02], [0.07, 0.025, 0.06], { op: 'paint', color: 0x7a4a3a, soft: 0.02, strength: 0.25 }),
  ];

  // ---------------- koszulka ----------------
  const shirtBase = [...torsoPrims(0.009, { neck: false }), ...both([...armPrims(0.006, 0.16, { muscles: false })])]; // krótki, cienki rękaw (nie przebija rękawa płaszcza)
  const shirt = [
    ...shirtBase,
    capsule([0, 1.44, 0.016], [0, 1.66, 0.004], 0.0735, { op: 'sub', k: 0.006, bone: 'chest' }), // dekolt: otwór wokół szyi
    // ściągacz: pas materiału na powierzchni koszulki wokół otworu (z lekkim nawisem nad krawędzią)
    patch(torsoPrims(0.009, { neck: false }), 0.0065, [capsule([0, 1.44, 0.016], [0, 1.66, 0.004], 0.091)], { bone: 'chest', kr: 0.004, blend: 0.04 }),
    capsule([0, 1.44, 0.016], [0, 1.66, 0.004], 0.0695, { op: 'sub', k: 0.004, bone: 'chest' }),
    plane([0, 0.96, 0], [0, 1, 0], { op: 'sub', k: 0.01, bone: 'hips' }),
    ...both([cut(armPt(0.12), [-AD[0], -AD[1], 0], [capsule(armPt(0.12), armPt(0.45), 0.09)], { k: 0.012, bone: 'upperArmL' })]),
  ];
  const shirtProbe = probe([...torsoPrims(0.009, { neck: false })], 0.008);
  // emblemat: geometryczny piorun (Iskra) / pionowy pasek (Manekin) — naszywka na koszulce
  const embC = shirtProbe.front(0, 1.335) || [0, 1.335, -0.13];
  let emblemRegion;
  if (V.smirk) {
    const z0 = embC[2] - 0.05;
    const z1 = embC[2] + 0.05;
    const slab = (cx, cy, hx, hy, rz) => roundBox([cx, cy, (z0 + z1) / 2], [hx, hy, (z1 - z0) / 2], 0.002, { rot: [0, 0, rz] });
    emblemRegion = [
      slab(0.006, 1.356, 0.0085, 0.024, -0.5),
      slab(0.0, 1.335, 0.019, 0.0065, 0.18),
      slab(-0.006, 1.312, 0.0085, 0.025, -0.5),
      sphere([0.0, 1.335, embC[2]], 0.04, { op: 'int', k: 0.0 }),
    ];
  } else {
    emblemRegion = [roundBox([0, 1.3, embC[2]], [0.012, 0.14, 0.06], 0.003)];
  }
  const emblem = [patch(torsoPrims(0.009, { neck: false }), 0.0026, emblemRegion, { bone: 'chest', lift: -0.0005, kr: 0.0012 })];

  // ---------------- płaszcz / fartuch ----------------
  const coatInf = 0.019;
  const sleeveEnd = rolled ? 0.425 : 0.505;
  const coatTorso = [...torsoPrims(coatInf, { neck: false }), ...both([...armPrims(0.014, sleeveEnd, { muscles: false, shoulderInf: 0.012 })])];
  const skirtTop = [0, 1.06, 0.01];
  const skirtBot = [0, hemY - 0.02, long ? 0.045 : 0.035];
  const skirtR0 = 0.178, skirtR1 = long ? 0.292 : 0.262; // dół poły szerzej (kolano w kucaniu nie przebija)
  const skirtCone = [roundCone(skirtTop, skirtBot, skirtR0, skirtR1, { squash: { dir: [0, 0, 1], factor: 0.84 }, bone: 'coat' })];
  const coatSkirtShell = shell(skirtCone, 0.019, { offset: 0.0095, bone: 'coat', k: 0.02 });
  const openUpper = long ? 0.07 : 0.082; // pół-szerokość rozcięcia na piersi
  const coat = [
    group([...coatTorso, plane([0, 1.0, 0], [0, 1, 0], { op: 'sub', k: 0.03, bone: 'hips' })], { k: 0, blend: 0.035 }),
    coatSkirtShell,
    // fałdy poły (miękkie, pionowe)
    ...[-2.3, -1.6, -0.75, 0.75, 1.6, 2.3, Math.PI].map((a) => {
      const r0 = skirtR0 + 0.012, r1 = skirtR1 + 0.012;
      const pa = [Math.sin(a) * r0, 0.98, skirtTop[2] - Math.cos(a) * r0 * 0.84];
      const pb = [Math.sin(a) * r1 * 1.01, hemY + 0.02, skirtBot[2] - Math.cos(a) * r1 * 0.84 * 1.01];
      return roundCone(pa, pb, 0.004, 0.016, { k: 0.04, bone: 'coat' });
    }),
    // rozcięcie z przodu: tors (wąskie przy pasie, szerzej na piersi) + poły (rozchylone ku dołowi)
    group(
      [
        wedge(1.16, 0.075, 1.62, openUpper + 0.012, -0.45, -0.02),
        wedge(hemY - 0.05, long ? 0.15 : 0.175, 1.2, 0.072, -0.45, 0.0),
      ],
      { op: 'sub', k: 0.011, bone: 'hips' }, // k ≥ ~1.2 woksela: gładka krawędź rozcięcia (bez "poszarpania")
    ),
    // dół (podwinięcie), rozporek z tyłu
    plane([0, hemY, 0], [0, 1, 0], { op: 'sub', k: 0.01, bone: 'coat' }),
    roundBox([0, hemY, 0.3], [0.006, long ? 0.2 : 0.11, 0.1], 0.004, { op: 'sub', k: 0.004, bone: 'coat' }),
  ];
  if (rolled) {
    // podwinięte rękawy: gruby wałek + rowek
    coat.push(
      ...both([
        cylinder(armPt(0.372), armPt(sleeveEnd), armRad(0.4) + 0.024, 0.012, { k: 0.008, bone: 'forearmL' }),
        torus(armPt(0.398), armRad(0.4) + 0.026, 0.0032, { rot: [0, 0, Math.PI / 2 - ARM_A + Math.PI / 2], op: 'sub', k: 0.004, bone: 'forearmL' }),
      ]),
    );
  } else {
    coat.push(...both([cylinder(armPt(0.47), armPt(sleeveEnd), armRad(0.48) + 0.027, 0.01, { k: 0.008, bone: 'forearmL' })]));
  }
  // kołnierz: postawiony, rozchylony
  const collar = group(
    [
      roundCone([0, 1.475, 0.012], [0, 1.6, 0.026], 0.097, 0.088, { bone: 'neck', squash: { dir: [0, 0, 1], factor: 0.95 } }),
      roundCone([0, 1.475, 0.012], [0, 1.6, 0.026], 0.08, 0.071, { op: 'sub', k: 0.004, bone: 'neck' }),
      plane([0, long ? 1.627 : 1.612, 0], [0, -1, 0.15], { op: 'sub', k: 0.006 }),
      plane([0, 1.47, 0], [0, 1, 0], { op: 'sub', k: 0.006 }),
      roundBox([0, 1.55, -0.13], [openUpper - 0.012, 0.12, 0.1], 0.012, { op: 'sub', k: 0.008 }),
    ],
    { k: 0.012, bone: 'neck' },
  );
  coat.push(collar);

  // detale płaszcza (osobna, drobniejsza warstwa): klapy, kieszenie, pagony, przeszycia
  const coatProbe = probe(coatTorso, 0.01);
  const detail = [];

  // --- fałdy i szwy płaszcza (rowki w materiale) ---
  const groove = (pts, r, o = {}) => bezierTube(pts, r, o.r1 ?? r, { segments: o.segments ?? 6, op: 'sub', k: o.k ?? 0.003, bone: o.bone });
  const sleeveS = [Math.cos(ARM_A), -Math.sin(ARM_A), 0]; // poprzecznie do ręki (na zewnątrz), lewa ręka
  const arc = (t, ph0, ph1, extra = 0, n = 4) => {
    const c = armPt(t);
    const R = armRad(t) + 0.014 + extra;
    const out = [];
    for (let i = 0; i < n; i++) {
      const ph = lerp(ph0, ph1, i / (n - 1));
      out.push([c[0] + R * Math.sin(ph) * sleeveS[0], c[1] + R * Math.sin(ph) * sleeveS[1] + (i % 2 ? 0.004 : -0.002), c[2] - R * Math.cos(ph)]);
    }
    return out;
  };
  // zagięcia w łokciu: miękkie wałki materiału (wypukłe — rowki w zginanym rękawie dawały dziury)
  for (const [t, a0, a1] of [[0.285, -1.2, 0.6], [0.335, -0.9, 0.9]]) coat.push(...both([...bezierTube(arc(t, a0, a1, -0.004), 0.0045, 0.003, { segments: 6, k: 0.012, bone: 'forearmL' })]));
  // ukośne fałdy pod pachą (z przodu, od pachy w stronę piersi) — płytkie i szerokie
  for (const [x0, y0, x1, y1] of [[-0.172, 1.38, -0.13, 1.3]]) {
    const pts = [0, 0.33, 0.66, 1].map((u) => coatProbe.front(lerp(x0, x1, u), lerp(y0, y1, u))).filter(Boolean).map((q) => add3(q, [0, 0, 0.003]));
    // (wypukły wałek zamiast rowka — odejmowane rowki w płaszczu dawały dziury po skinningu)
    if (pts.length === 4) coat.push(...both([...bezierTube(pts, 0.0045, 0.003, { segments: 6, k: 0.012, bone: 'chest' })]));
  }
  const piping = (pts, r = 0.0026, bone = 'chest') => bezierTube(pts, r, r, { segments: 8, k: 0.002, bone });
  // szew barkowy: od nasady szyi do barku (z góry)
  {
    const pts = [-0.1, -0.135, -0.17, -0.205].map((x, i) => coatProbe.ray([x, 1.8, 0.004 - i * 0.002], [0, -1, 0])).filter(Boolean).map((q) => add3(q, [0, 0.0006, 0]));
    if (pts.length === 4) detail.push(...both([...piping(pts)]));
  }
  // karczek na plecach: prawdziwy rowek szwu + wypukła lamówka tuż pod nim (czytelne z dystansu gry)
  {
    const xs = [-0.17, -0.06, 0.06, 0.17];
    const pts = xs.map((x) => coatProbe.back(x, 1.42 + Math.abs(x) * 0.12)).filter(Boolean);
    if (pts.length === 4) {
      // szew: dwie równoległe lamówki (wąska szczelina między nimi czyta się jak przeszycie)
      detail.push(...piping(pts.map((q) => add3(q, [0, 0.0045, 0.0004])), 0.0032));
      detail.push(...piping(pts.map((q) => add3(q, [0, -0.0045, 0.0004])), 0.0032));
    }
  }
  // ramiona: płaskie, kanciaste nakładki (wyraźna linia barków zamiast "poduszek")
  for (const sx of [-1, 1]) {
    const top = coatProbe.ray([0.16 * sx, 1.8, 0.0], [0, -1, 0]);
    if (top) coat.push(roundBox([0.16 * sx, top[1] - 0.006, 0.0], [0.05, 0.012, 0.06], 0.01, { rot: [0, 0, 0.18 * sx], k: 0.018, bone: 'chest' }));
  }
  // szew środkowy pleców (rowek + lamówka obok)
  {
    const ys = long ? [1.38, 1.25, 1.12, 1.02] : [1.4, 1.25, 1.12, 1.02]; // (długi płaszcz: poniżej karczka)
    const pts = ys.map((y) => coatProbe.back(0, y)).filter(Boolean);
    if (pts.length === 4) {
      detail.push(...piping(pts.map((q) => add3(q, [0.0045, 0, 0.0004])), 0.0032, 'spine'));
      detail.push(...piping(pts.map((q) => add3(q, [-0.0045, 0, 0.0004])), 0.0032, 'spine'));
    }
  }
  // zakładki pleców: dwa pionowe, miękkie fałdy od karczka do talii
  for (const sx of [-1, 1]) {
    const pts = (long ? [1.38, 1.29, 1.2, 1.1] : [1.4, 1.3, 1.2, 1.1]).map((y, i) => coatProbe.back((0.07 + i * 0.004) * sx, y)).filter(Boolean).map((q) => add3(q, [0, 0, -0.002]));
    if (pts.length === 4) coat.push(...bezierTube(pts, 0.0065, 0.004, { segments: 6, k: 0.014, bone: 'spine' }));
  }
  // poziome fałdy ściśnięcia nad talią (płytkie, faliste)
  for (const [y, w] of [[1.115, 0.11], [1.14, 0.085], [1.165, 0.06]]) {
    const pts = [-w, -w / 3, w / 3, w].map((x, i) => coatProbe.back(x, y + (i % 2 ? 0.004 : -0.003))).filter(Boolean).map((q) => add3(q, [0, 0, -0.003]));
    if (pts.length === 4) coat.push(...bezierTube(pts, 0.006, 0.0045, { segments: 6, k: 0.014, bone: 'spine' }));
  }
  // klapy: naszywki wzdłuż krawędzi rozcięcia
  const lapel = (sx) => {
    const yTop = 1.5, yBot = 1.2;
    const xT = (openUpper + 0.012) * sx, xB = 0.075 * sx;
    const cx = (xT + xB) / 2 + 0.022 * sx, cy = (yTop + yBot) / 2;
    const ang = Math.atan2(xT - xB, yTop - yBot);
    return roundBox([cx, cy, -0.2], [0.026, (yTop - yBot) / 2 + 0.01, 0.12], 0.006, { rot: [0, 0, -ang] });
  };
  detail.push(patch(coatTorso, 0.0055, [lapel(-1), lapel(1)], { bone: 'chest', kr: 0.004 }));
  // kieszeń na piersi (lewa) z klapką + długopis (Iskra)
  const pk = coatProbe.front(-0.128, 1.35) || [-0.128, 1.35, -0.15];
  if (!long) {
    detail.push(patch(coatTorso, 0.004, [roundBox([pk[0], pk[1] - 0.028, pk[2]], [0.034, 0.04, 0.06], 0.006)], { bone: 'chest' }));
    detail.push(patch(coatTorso, 0.008, [roundBox([pk[0], pk[1] + 0.012, pk[2]], [0.037, 0.011, 0.06], 0.005)], { bone: 'chest' }));
  }
  // pagony / ramiona: przeszycie wzdłuż szwu barkowego (rząd drobnych wgłębień)
  // kieszenie na połach (biodra) z klapkami
  const skirtProbe = probe([shell(skirtCone, 0.019, { offset: 0.0095 })], 0.01);
  const hipPockets = [];
  for (const sx of [-1, 1]) {
    const a = 1.25 * sx; // kieszenie z boku poły, poza rozcięciem
    const o = [Math.sin(a) * 0.5, 0.82, -Math.cos(a) * 0.5];
    const s = skirtProbe.ray(o, [-o[0], 0, -o[2]]) || [Math.sin(a) * 0.22, 0.82, -Math.cos(a) * 0.19];
    const rotY = -a;
    hipPockets.push(roundBox([s[0], s[1] - 0.025, s[2]], [0.065, 0.06, 0.08], 0.008, { rot: [0, rotY, 0] }));
    detail.push(patch([shell(skirtCone, 0.019, { offset: 0.0095 })], 0.0075, [roundBox([s[0], s[1] + 0.035, s[2]], [0.068, 0.012, 0.08], 0.006, { rot: [0, rotY, 0] })], { bone: 'coat' }));
  }
  detail.push(patch([shell(skirtCone, 0.019, { offset: 0.0095 })], 0.004, hipPockets, { bone: 'coat' }));
  // pasek z tyłu (półpasek) z guzikami
  const bk = coatProbe.back(0, 1.07) || [0, 1.07, 0.15];
  // (Iskra: skórzany, w kolorze uprzęży — czytelny na białym fartuchu; Manekin: z materiału płaszcza)
  const halfBelt = [patch(coatTorso, 0.011, [roundBox([0, 1.07, bk[2]], [0.1, 0.02, 0.08], 0.006)], { bone: 'spine', kr: 0.003 })];
  for (const sx of [-1, 1]) {
    const q = coatProbe.back(0.075 * sx, 1.07);
    if (q) halfBelt.push(sphere(add3(q, [0, 0, 0.012]), 0.008, { bone: 'spine', squash: { dir: [0, 0, 1], factor: 0.55 }, k: 0.002 }));
  }
  if (!V.backBling) detail.push(...halfBelt);
  if (long) {
    // karczek (nakładka na barkach z tyłu)
    detail.push(patch(coatTorso, 0.0045, [group([roundBox([0, 1.47, 0.2], [0.2, 0.05, 0.12], 0.01), plane([0, 1.41, 0.2], [0, 1, 0], { op: 'int', k: 0.004 })])], { bone: 'chest', kr: 0.004 }));
  }
  // naszywki nie mogą istnieć nad rozcięciem płaszcza (np. fragmenty kieszeni "w powietrzu")
  detail.push(
    group(
      [
        wedge(1.16, 0.075, 1.62, openUpper + 0.012, -0.45, -0.02),
        wedge(hemY - 0.05, long ? 0.15 : 0.175, 1.2, 0.072, -0.45, 0.0),
      ],
      { op: 'sub', k: 0.004, bone: 'hips' },
    ),
  );
  // obszycie (Manekin: czerwone lamówki — osobna warstwa)
  const trim = [];
  if (V.coat.trim) {
    const tr = (sx) => {
      const yTop = 1.5, yBot = 1.2;
      const xT = (openUpper + 0.012) * sx, xB = 0.075 * sx;
      const ang = Math.atan2(xT - xB, yTop - yBot);
      return roundBox([(xT + xB) / 2 + 0.006 * sx, (yTop + yBot) / 2, -0.2], [0.0085, (yTop - yBot) / 2 + 0.01, 0.12], 0.003, { rot: [0, 0, -ang] });
    };
    trim.push(patch(coatTorso, 0.0075, [tr(-1), tr(1)], { bone: 'chest', kr: 0.002 }));
    // pas wzdłuż poł
    const trSk = (sx) => {
      const y0 = hemY, y1 = 1.18;
      const x0 = 0.175 * sx * (long ? 0.86 : 1), x1 = 0.072 * sx;
      const ang = Math.atan2(x1 - x0, y1 - y0);
      return roundBox([(x0 + x1) / 2 + 0.008 * sx, (y0 + y1) / 2, -0.25], [0.011, (y1 - y0) / 2 + 0.01, 0.12], 0.003, { rot: [0, 0, -ang] });
    };
    trim.push(patch([shell(skirtCone, 0.019, { offset: 0.0095 })], 0.004, [trSk(-1), trSk(1)], { bone: 'coat', kr: 0.002 }));
    // lamówki wzdłuż rozporka z tyłu
    trim.push(patch([shell(skirtCone, 0.019, { offset: 0.0095 })], 0.004, [roundBox([-0.013, hemY + 0.11, 0.3], [0.0055, 0.115, 0.12], 0.003), roundBox([0.013, hemY + 0.11, 0.3], [0.0055, 0.115, 0.12], 0.003)], { bone: 'coat', kr: 0.002 }));
    // dwie ukośne zakładki na poły z tyłu
    for (const sx of [-1, 1]) {
      const pts = [[0.05, 0.95], [0.065, 0.8], [0.085, 0.62], [0.1, 0.45]].map(([x, y]) => skirtProbe.back(x * sx, y)).filter(Boolean).map((q) => add3(q, [0, 0, 0.004]));
      if (pts.length === 4) coat.push(...bezierTube(pts, 0.008, 0.011, { segments: 6, op: 'sub', k: 0.012, bone: 'coat' }));
    }
    // mankiety
    trim.push(...both([cylinder(armPt(0.478), armPt(0.508), armRad(0.48) + 0.031, 0.008, { bone: 'forearmL' })]));
    // pasek u dołu poły
    trim.push(
      group(
        [
          shell(skirtCone, 0.023, { offset: 0.0115 }),
          plane([0, hemY + 0.03, 0], [0, -1, 0], { op: 'sub', k: 0.003 }),
          plane([0, hemY - 0.002, 0], [0, 1, 0], { op: 'sub', k: 0.003 }),
          group([wedge(hemY - 0.05, 0.155, 1.2, 0.072, -0.45, 0.0)], { op: 'sub', k: 0.004 }),
        ],
        { bone: 'coat' },
      ),
    );
  }

  // ---------------- spodnie ----------------
  const pantsInf = 0.012;
  const pantsBase = [
    ellipsoid([0, 0.985, 0.005], [0.158, 0.118, 0.112], { inflate: pantsInf, bone: 'hips' }),
    ...both([ellipsoid([-0.066, 0.95, 0.045], [0.075, 0.085, 0.07], { inflate: pantsInf, bone: 'hips', k: 0.05 })]),
    ellipsoid([0, 1.06, -0.002], [0.148, 0.09, 0.104], { inflate: pantsInf, bone: 'spine', k: 0.05 }),
    ...both(legPrims(pantsInf + 0.004, { ankleY: 0.2, shinExtra: 0.006 })),
  ];
  const pants = [
    ...pantsBase,
    plane([0, 1.045, 0], [0, -1, 0], { op: 'sub', k: 0.008, bone: 'hips' }),
    // marszczenie nad butem
    ...both([
      torus([-0.101, 0.235, 0.022], 0.058, 0.01, { k: 0.012, bone: 'shinL' }),
      torus([-0.101, 0.268, 0.02], 0.06, 0.008, { k: 0.012, bone: 'shinL', rot: [0.15, 0, 0] }),
      // fałdy pod kolanem / w pachwinie
      ellipsoid([-0.1, 0.46, 0.05], [0.05, 0.012, 0.03], { k: 0.015, bone: 'shinL' }),
      ellipsoid([-0.06, 0.86, -0.08], [0.04, 0.01, 0.02], { k: 0.015, bone: 'thighL', rot: [0, 0, 0.5] }),
    ]),
  ];
  const pantsDetail = [];
  // kieszenie cargo na udach
  const legProbe = probe(both(legPrims(pantsInf + 0.004, { shinExtra: 0.006 })), 0.008);
  for (const sx of [-1, 1]) {
    const bone = 'thigh' + (sx < 0 ? 'L' : 'R');
    const s = legProbe.side(0.62, 0.0, sx) || [0.18 * sx, 0.62, 0];
    // kieszeń cargo (głębsza) + klapka z nawisem 6 mm (rzuca cień AO)
    pantsDetail.push(roundBox([s[0] - 0.008 * sx, 0.6, 0.002], [0.02, 0.056, 0.045], 0.013, { rot: [0, 0, 0.05 * sx], bone, k: 0.004 }));
    pantsDetail.push(roundBox([s[0] + 0.0 * sx, 0.659, 0.002], [0.017, 0.013, 0.05], 0.006, { rot: [0, 0, 0.05 * sx], bone, k: 0.003 }));
    // szew boczny: rowek od biodra do kostki + lamówka obok
    const seam = [0.9, 0.72, 0.42, 0.26].map((y) => legProbe.side(y, 0.008, sx)).filter(Boolean);
    if (seam.length === 4) {
      const sb = (y) => (y > 0.5 ? bone : 'shin' + (sx < 0 ? 'L' : 'R'));
      for (let i = 0; i < 3; i++) pants.push(capsule(add3(seam[i], [0.001 * sx, 0, 0]), add3(seam[i + 1], [0.001 * sx, 0, 0]), 0.003, { op: 'sub', k: 0.003, bone: sb(seam[i][1]) }));
      for (let i = 0; i < 3; i++) pantsDetail.push(capsule(add3(seam[i], [0, 0, 0.0065]), add3(seam[i + 1], [0, 0, 0.0065]), 0.0028, { k: 0.002, bone: sb(seam[i][1]) }));
    }
    // ukośne zagięcia pod kolanem (z tyłu) i nad nakolannikiem
    for (let i = 0; i < 3; i++) {
      const y0 = 0.47 + i * 0.03;
      const pts = [-0.15, -0.115, -0.085, -0.055].map((x, j) => legProbe.back(x * -sx, y0 + 0.012 - j * 0.008)).filter(Boolean).map((q) => add3(q, [0, 0, 0.002]));
      if (pts.length === 4) pants.push(...bezierTube(pts, 0.005, 0.0035, { segments: 5, op: 'sub', k: 0.005, bone: 'shin' + (sx < 0 ? 'L' : 'R') }));
    }
  }
  // nakolanniki
  const pads = both([
    group(
      [
        ellipsoid([-0.1, 0.525, -0.058], [0.056, 0.068, 0.04], { rot: [0.08, 0, 0] }), // kopuła (wyraźnie 3D)
        roundBox([-0.1, 0.525, -0.096], [0.032, 0.034, 0.01], 0.008, { k: 0.008 }),
        torus([-0.1, 0.525, -0.084], 0.05, 0.008, { rot: [Math.PI / 2 + 0.08, 0, 0], squash: { dir: [0, 1, 0], factor: 1.25 }, k: 0.006 }), // fazowany brzeg
        torus([-0.1, 0.545, 0.0], 0.074, 0.006, { rot: [0.15, 0, 0], squash: { dir: [0, 0, 1], factor: 0.82 }, k: 0.006 }),
        torus([-0.1, 0.49, 0.0], 0.07, 0.006, { rot: [-0.12, 0, 0], squash: { dir: [0, 0, 1], factor: 0.82 }, k: 0.006 }),
      ],
      { bone: 'shinL', k: 0.004 },
    ),
  ]);

  // ---------------- pas i saszetki ----------------
  const beltBand = [
    group(
      [
        shell([ellipsoid([0, 1.0, 0.003], [0.158, 0.13, 0.112], { inflate: pantsInf })], 0.012, { offset: 0.006 }),
        plane([0, 1.034, 0], [0, -1, 0], { op: 'sub', k: 0.003 }),
        plane([0, 0.995, 0], [0, 1, 0], { op: 'sub', k: 0.003 }),
      ],
      { bone: 'hips' },
    ),
  ];
  const beltProbe = probe([ellipsoid([0, 1.0, 0.003], [0.158, 0.13, 0.112], { inflate: pantsInf + 0.012 })], 0.006);
  const bf = beltProbe.front(0, 1.0145) || [0, 1.0145, -0.13];
  const buckle = [
    group([
      roundBox([0, 1.0145, bf[2] - 0.003], [0.03, 0.023, 0.0055], 0.004),
      roundBox([0, 1.0145, bf[2] - 0.008], [0.019, 0.012, 0.006], 0.003, { op: 'sub', k: 0.002 }),
      capsule([-0.012, 1.0145, bf[2] - 0.006], [0.012, 1.0145, bf[2] - 0.006], 0.0028, { k: 0.002 }),
    ]),
  ];
  // saszetki: lewa z przodu (magazynek przy przeładowaniu), prawa z boku, mała z tyłu
  const pouchList = [];
  const pouch = (ang, y, hx, hy, hz) => {
    const o = [Math.sin(ang) * 0.5, y, -Math.cos(ang) * 0.5];
    const s = beltProbe.ray(o, [-o[0], 0, -o[2]]) || [Math.sin(ang) * 0.17, y, -Math.cos(ang) * 0.13];
    const n = [Math.sin(ang), 0, -Math.cos(ang)];
    const c = add3(s, mul3(n, hz - 0.004));
    const rot = [0, -ang, 0];
    pouchList.push(
      group([
        roundBox([c[0], y - hy * 0.25, c[2]], [hx, hy, hz], Math.min(hx, hz) * 0.75, { rot }),
        roundBox(add3([c[0], y + hy * 0.55, c[2]], mul3(n, 0.004)), [hx + 0.003, hy * 0.4, hz + 0.003], Math.min(hx, hz) * 0.55, { rot, k: 0.004 }), // klapka
        sphere(add3([c[0], y + hy * 0.35, c[2]], mul3(n, hz + 0.006)), 0.0055, { k: 0.002 }), // zatrzask
      ]),
    );
    return { c, n, top: [c[0], y + hy * 0.75, c[2]] };
  };
  const pouchL = pouch(-0.62, 0.975, 0.032, 0.04, 0.022);
  pouch(1.25, 0.98, 0.026, 0.034, 0.02);
  pouch(2.6, 0.99, 0.034, 0.026, 0.018);
  pouch(-2.6, 0.99, 0.034, 0.026, 0.018);

  // ---------------- rękawice ----------------
  const handR = frame(hands.R, group(rightGripHand(hands.wristR), { bone: 'handR' }));
  const handL = frame(hands.L, group(leftGuardHand(hands.wristL), { bone: 'handL' }));
  const cuffT0 = WRIST_T - 0.012;
  const gloves = [
    handR,
    handL,
    ...both([
      roundCone(armPt(cuffT0), armPt(V.gloves.kind === 'rubber' ? 0.468 : 0.49), 0.036, V.gloves.kind === 'rubber' ? 0.047 : 0.04, { bone: 'forearmL', k: 0.008 }),
      sphere(armPt(WRIST_T + 0.02), 0.034, { bone: 'handL', k: 0.02 }),
    ]),
  ];
  if (V.gloves.kind === 'rubber') gloves.push(...both([torus(armPt(0.47), 0.047, 0.004, { rot: [0, 0, Math.PI / 2 - ARM_A + Math.PI / 2], k: 0.004, bone: 'forearmL' })]));
  else gloves.push(...both([torus(armPt(0.5), 0.038, 0.0045, { rot: [0, 0, Math.PI - ARM_A], k: 0.004, bone: 'forearmL' })]));

  // ---------------- buty ----------------
  const shoeX = -0.104;
  const boot = V.shoes.boot;
  const shoeUpper = (inf = 0, low = false) => {
    const o = (x) => ({ inflate: inf, ...x });
    const p = [
      roundBox([shoeX, 0.068, -0.035], [0.054, 0.052, 0.118], 0.048, o({ bone: 'footL' })),
      ellipsoid([shoeX - 0.002, 0.05, -0.118], [0.056, 0.043, 0.072], o({ k: 0.035, bone: 'footL' })),
      ellipsoid([shoeX, 0.075, 0.05], [0.051, 0.062, 0.042], o({ k: 0.03, bone: 'footL' })), // pięta
    ];
    if (low) return p;
    p.push(
      roundCone([shoeX, 0.1, 0.024], [shoeX, boot ? 0.25 : 0.215, 0.022], 0.061, 0.057, o({ k: 0.035, bone: 'shinL' })), // cholewka
      torus([shoeX, boot ? 0.247 : 0.212, 0.022], 0.056, 0.0135, o({ k: 0.01, bone: 'shinL' })), // wyściełany brzeg
      roundBox([shoeX, 0.165, -0.04], [0.032, 0.06, 0.013], 0.011, o({ rot: [-0.38, 0, 0], k: 0.012, bone: 'footL' })), // język
    );
    if (!boot) p.push(sphere([shoeX - 0.058, 0.108, 0.026], 0.014, o({ k: 0.01, bone: 'shinL' }))); // okrągła łata na kostce
    return p;
  };
  const shoes = both(shoeUpper());
  const soleL = [
    group([...shoeUpper(0.0065, true), plane([0, 0.036, 0], [0, -1, 0], { op: 'sub', k: 0.003 }), plane([0, 0.0, 0], [0, 1, 0], { op: 'sub', k: 0.002 })], { bone: 'footL' }),
    group([...shoeUpper(0.0045, true).slice(1, 2), plane([0, 0, -0.122], [0, 0, -1], { op: 'sub', k: 0.008 }), plane([0, 0.08, 0], [0, -1, 0], { op: 'sub', k: 0.004 })], { bone: 'footL', k: 0.006 }), // nosek
    group([...shoeUpper(0.004, true).slice(2, 3), plane([0, 0, 0.06], [0, 0, 1], { op: 'sub', k: 0.004 }), plane([0, 0.075, 0], [0, -1, 0], { op: 'sub', k: 0.004 })], { bone: 'footL', k: 0.006 }), // zapiętek
    // bieżnik
    ...[0, 1, 2, 3, 4, 5].map((i) => roundBox([shoeX, 0.0, -0.13 + i * 0.045], [0.08, 0.0035, 0.004], 0.002, { op: 'sub', k: 0.002, bone: 'footL' })),
    roundBox([shoeX, 0.03, -0.03], [0.08, 0.0018, 0.2], 0.001, { op: 'sub', k: 0.0015, bone: 'footL' }), // rowek na boku podeszwy
  ];
  const soles = both(soleL);
  const shoeProbe = probe(shoeUpper(0, true), 0.005);
  const lacesL = [];
  const nL = boot ? 6 : 5;
  const topPt = (x, z) => shoeProbe.ray([x, 0.4, z], [0, -1, 0]) || [x, 0.12, z];
  for (let i = 0; i < nL; i++) {
    const z = -0.095 + i * 0.019;
    const a = add3(topPt(shoeX - 0.022, z + 0.005), [0, 0.0035, 0]);
    const b = add3(topPt(shoeX + 0.022, z - 0.005), [0, 0.0035, 0]);
    const c = add3(topPt(shoeX - 0.022, z - 0.005), [0, 0.0035, 0]);
    const d = add3(topPt(shoeX + 0.022, z + 0.005), [0, 0.0035, 0]);
    lacesL.push(capsule(a, b, 0.0036, { bone: 'footL', k: 0.002 }));
    lacesL.push(capsule(c, d, 0.0036, { bone: 'footL', k: 0.002 }));
  }
  const knot = add3(topPt(shoeX, -0.095 + (nL - 1) * 0.019), [0, 0.008, 0]);
  lacesL.push(sphere(knot, 0.006, { bone: 'footL', k: 0.003 }));
  lacesL.push(...bezierTube([knot, add3(knot, [0.03, 0.01, -0.02]), add3(knot, [0.04, -0.03, -0.03])], 0.0042, 0.0032, { segments: 4, bone: 'footL' }));
  lacesL.push(...bezierTube([knot, add3(knot, [-0.025, 0.012, -0.015]), add3(knot, [-0.035, -0.025, -0.03])], 0.0042, 0.0032, { segments: 4, bone: 'footL' }));
  const laces = both(lacesL);

  // ---------------- głowa: oczy, brwi, włosy, gogle ----------------
  const head = headFrame(headPrims(V));
  const eyeL = headFrame([sphere(EYE_L, EYE_RAD)]);
  const eyeR = headFrame([sphere(EYE_R, EYE_RAD)]);
  const brows = headFrame(browPrims(V));
  const hair = headFrame(V.hair.style === 'swept' ? sweptHair(V) : beanieHair(V));
  const hat = V.hair.style === 'beanie' ? headFrame(beaniePrims(V)) : null;
  const gProbe = probe(hat ? beaniePrims(V).slice(0, 2) : [...sweptHair(V).filter((n) => n.op !== 3)], 0.006);
  const gg0 = gogglePrims(V, gProbe);
  const gg = { frameP: headFrame(gg0.frameP), lensP: headFrame(gg0.lensP), strap: headFrame(gg0.strap) };

  // ---------------- gadżet na plecach (Iskra) ----------------
  let gadget = null, coil = null, harness = null;
  if (V.backBling) {
    const bb = coatProbe.back(0, 1.36) || [0, 1.36, 0.16];
    const z = bb[2] + 0.047; // bliżej pleców
    const y0 = 1.25, y1 = 1.47;
    // gadżet w skali 0.85 wokół środka płyty (mniej zasłania widok przy celowaniu)
    const GS = new THREE.Matrix4().makeTranslation(0, 1.33, bb[2]).multiply(new THREE.Matrix4().makeScale(0.85, 0.85, 0.85)).multiply(new THREE.Matrix4().makeTranslation(0, -1.33, -bb[2]));
    gadget = frame(GS, [
      roundBox([0, 1.36, bb[2] + 0.012], [0.07, 0.1, 0.014], 0.01), // płyta mocująca
      cylinder([0, y0, z], [0, y0 + 0.035, z], 0.06, 0.012, { k: 0.006 }),
      cylinder([0, y1 - 0.035, z], [0, y1, z], 0.06, 0.012, { k: 0.006 }),
      cylinder([0, y0, z], [0, y1, z], 0.018, 0.004, { k: 0.006 }), // rdzeń
      ...[-1, 1].map((sx) => capsule([0.05 * sx, y0 + 0.02, z - 0.03], [0.05 * sx, y1 - 0.02, z - 0.03], 0.0065, { k: 0.004 })), // pręty
      capsule([0.03, y1, z], [0.045, y1 + 0.075, z + 0.01], 0.004, { k: 0.004 }), // antenka
      sphere([0.046, y1 + 0.08, z + 0.01], 0.009, { k: 0.002 }),
      torus([0, y1 - 0.004, z], 0.052, 0.005, { k: 0.002 }),
      torus([0, y0 + 0.004, z], 0.052, 0.005, { k: 0.002 }),
      // łączniki z płytą
      ...[-1, 1].map((sx) => roundBox([0.035 * sx, 1.36, (bb[2] + z) / 2], [0.009, 0.06, (z - bb[2]) / 2], 0.004, { k: 0.004 })),
    ]);
    coil = [];
    for (let i = 0; i < 5; i++) coil.push(torus([0, y0 + 0.055 + i * 0.027, z], 0.038, 0.0075, { rot: [0.12 * (i % 2 ? 1 : -1), 0, 0], k: 0.003 }));
    coil.push(sphere([0.046, y1 + 0.08, z + 0.01], 0.0062));
    coil = frame(GS, coil);
    // uprząż: dwa skórzane pasy od płyty przez barki na pierś + pasek mostkowy ze sprzączką
    const W = 0.0175; // pół-szerokość pasa
    const strapPath = (sx) => {
      const pts = [
        coatProbe.back(0.05 * sx, 1.4),
        coatProbe.back(0.075 * sx, 1.47),
        coatProbe.ray([0.1 * sx, 1.8, 0.03], [0, -1, 0]),
        coatProbe.ray([0.105 * sx, 1.8, -0.04], [0, -1, 0]),
        coatProbe.front(0.108 * sx, 1.43),
        coatProbe.front(0.112 * sx, 1.33),
        coatProbe.front(0.114 * sx, 1.24),
      ].filter(Boolean);
      const out = [];
      for (let i = 0; i < pts.length - 1; i++) out.push(capsule(pts[i], pts[i + 1], W, { k: 0.004 }));
      return { caps: out, pts };
    };
    const sL = strapPath(-1), sR = strapPath(1);
    const yS = 1.36;
    const fL = coatProbe.front(-0.11, yS), fR = coatProbe.front(0.11, yS);
    const sternum = fL && fR ? [capsule(add3(fL, [0, 0, -0.02]), add3(fR, [0, 0, -0.02]), 0.011, { k: 0.003 })] : [];
    harness = [
      patch(coatTorso, 0.006, [...sL.caps, ...sR.caps], { bone: 'chest', lift: 0.0045, kr: 0.003 }),
      ...halfBelt,
    ];
    // pasek mostkowy: osobny, prosty (przerzucony nad rozcięciem płaszcza)
    if (fL && fR) {
      const a = add3(fL, [0.004, 0, -0.008]), c = add3(fR, [-0.004, 0, -0.008]);
      const mid = [0, yS, Math.min(a[2], c[2]) - 0.012];
      harness.push(...bezierTube([a, mid, c], 0.0095, 0.0095, { segments: 6, squash: { dir: [0, 0, 1], factor: 0.35 }, k: 0.003 }));
      // sprzączka na pasku mostkowym i na pasach naramiennych (metal → warstwa gadżetu)
      gadget.push(roundBox(add3(mid, [0, 0, -0.002]), [0.018, 0.013, 0.004], 0.003, { k: 0.002 }));
      gadget.push(roundBox(add3(mid, [0, 0, -0.0055]), [0.011, 0.007, 0.003], 0.002, { op: 'sub', k: 0.0015 }));
      void sternum;
    }
    for (const sp of [sL, sR]) {
      const q = sp.pts[sp.pts.length - 2];
      if (q) gadget.push(group([roundBox(add3(q, [0, 0, -0.008]), [0.021, 0.012, 0.004], 0.003), roundBox(add3(q, [0, 0, -0.0115]), [0.014, 0.0065, 0.003], 0.002, { op: 'sub', k: 0.0015 })], { k: 0.002 }));
    }
  }

  // ---------------- warstwy ----------------
  const L = [];
  const add = (l) => L.push({ ...l, material: mats(l.name) });
  // AO: bez czarnych obwódek wokół oczu i w małżowinach uszu (lokalne progi)
  const eyeCs = [headPt(EYE_L), headPt(EYE_R)];
  const earCs = [headPt([-0.1, 1.712, 0.012]), headPt([0.1, 1.712, 0.012])];
  const headAO = (pos, ao, n) => {
    for (let v = 0; v < n; v++) {
      const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
      for (const c of eyeCs) {
        const d = Math.hypot(x - c[0], y - c[1], z - c[2]);
        if (d < EYE_RAD * HEAD_SCALE + 0.009) ao[v] = Math.max(ao[v], lerp(0.85, 0.6, Math.max(0, (d - EYE_RAD * HEAD_SCALE - 0.004) / 0.005)));
      }
      // małżowina: brzeg jaśniejszy (≥0.75), wnętrze (muszla) przyciemnione do 0.55 — bez plastikowego połysku
      for (const c of earCs) {
        const d = Math.hypot(x - c[0], (y - c[1]) * 0.6, z - c[2]);
        if (d < 0.03) ao[v] = d > 0.019 ? Math.max(ao[v], 0.75) : Math.min(Math.max(ao[v], 0.5), 0.55);
      }
    }
  };
  add({ name: 'head', simplify: { tris: 8000, error: 0.0005 }, voxel: 0.005, blend: 0.02, prims: head, rigidBone: 'head', hiddenBy: hat ? ['hat', 'hair'] : ['hair'], hiddenDepth: 0.002, aoAdjust: headAO });
  // oczy bez przycinania (przycięte trójkąty dawały poszarpaną szarą obwódkę w kącikach)
  add({ name: 'eyeL', simplify: { tris: 700, error: 0.0003 }, voxel: 0.0022, prims: eyeL, rigidBone: 'head', aoMin: 0.72 });
  add({ name: 'eyeR', simplify: { tris: 700, error: 0.0003 }, voxel: 0.0022, prims: eyeR, rigidBone: 'head', aoMin: 0.72 });
  add({ name: 'brows', simplify: { tris: 900, error: 0.0003 }, voxel: 0.0016, prims: brows, rigidBone: 'head', hiddenBy: ['head'], hiddenDepth: 0.001 });
  add({ name: 'hair', simplify: { tris: 8000, error: 0.0009 }, voxel: 0.0056, prims: hair, rigidBone: 'head', hiddenBy: hat ? ['hat'] : [], paintBase: 0xffffff, aoMin: 0.35 });
  if (hat) add({ name: 'hat', simplify: { tris: 2600, error: 0.0012 }, voxel: 0.0065, prims: hat, rigidBone: 'head' });
  add({ name: 'goggles', simplify: { tris: 2200, error: 0.0006 }, voxel: 0.0038, prims: gg.frameP, rigidBone: 'head' });
  add({ name: 'goggleLens', simplify: { tris: 500, error: 0.0004 }, voxel: 0.0032, prims: gg.lensP, rigidBone: 'head', hiddenBy: ['goggles'], hiddenDepth: 0.001 });
  // pasek gogli tylko pod czapką (Manekin); u Iskry gogle są wsunięte we włosy (bez pływających odcinków)
  if (hat) add({ name: 'strap', simplify: { tris: 600, error: 0.0008 }, voxel: 0.0045, prims: gg.strap, rigidBone: 'head', hiddenBy: ['hat', 'goggles'], hiddenDepth: 0.0015 });
  add({
    // skóra pod płaszczem usuwana także tuż przed jego powierzchnią (ujemna głębokość) — bez przebić w ruchu
    name: 'body', simplify: { tris: 2600, error: 0.0015 }, voxel: 0.011, blend: 0.05, prims: body,
    hiddenBy: ['head', 'hair', 'shirt', { layer: 'coat', depth: -0.003 }, 'pants', 'gloves', 'shoes'],
    skin: { sigma: 0.028 }, hiddenDepth: 0.0025,
  });
  add({ name: 'shirt', simplify: { tris: 1200, error: 0.0012 }, voxel: 0.011, prims: shirt, skinFrom: 'body', hiddenBy: ['coat', 'pants'], hiddenDepth: 0.0005, bounds: [-0.35, 0.9, -0.3, 0.35, 1.65, 0.3] });
  add({ name: 'emblem', simplify: { tris: 300, error: 0.0004 }, voxel: 0.0024, prims: emblem, skinFrom: 'body', hiddenBy: ['shirt'], hiddenDepth: 0.0008 });
  add({ name: 'coat', simplify: { tris: 16000, error: 0.0007 }, voxel: 0.009, blend: 0.06, prims: coat, skinFrom: 'body', hiddenBy: ['shirt'], hiddenDepth: 0.009, aoMin: 0.55 });
  add({ name: 'coatDetail', simplify: { tris: 3000, error: 0.001 }, voxel: 0.0055, prims: detail, skinFrom: 'body', hiddenBy: ['coat'], hiddenDepth: 0.0015, aoMin: 0.55 });
  if (trim.length) add({ name: 'trim', simplify: { tris: 1500, error: 0.001 }, voxel: 0.0058, prims: trim, skinFrom: 'body', hiddenBy: ['coat'], hiddenDepth: 0.0015 });
  add({ name: 'pants', simplify: { tris: 5000, error: 0.0014 }, voxel: 0.012, blend: 0.05, prims: pants, skinFrom: 'body', hiddenBy: ['shoes', 'belt'] });
  add({ name: 'pantsDetail', simplify: { tris: 800, error: 0.001 }, voxel: 0.0055, prims: pantsDetail, skinFrom: 'body', hiddenBy: ['pants'], hiddenDepth: 0.002 });
  add({ name: 'pads', simplify: { tris: 700, error: 0.0008 }, voxel: 0.0055, prims: pads, skinFrom: 'body', hiddenBy: ['pants'], hiddenDepth: 0.002 });
  add({ name: 'belt', simplify: { tris: 2400, error: 0.0009 }, voxel: 0.006, prims: [...beltBand, ...pouchList], rigidBone: 'hips' });
  add({ name: 'buckle', simplify: { tris: 300, error: 0.0004 }, voxel: 0.0028, prims: buckle, rigidBone: 'hips', hiddenBy: ['belt'], hiddenDepth: 0.001 });
  add({ name: 'gloves', simplify: { tris: 5500, error: 0.0006 }, voxel: 0.0047, blend: 0.006, prims: gloves, skin: { sigma: 0.016 } });
  add({ name: 'shoes', simplify: { tris: 3000, error: 0.001 }, voxel: 0.0075, blend: 0.02, prims: shoes, skin: { sigma: 0.03 }, hiddenBy: ['soles'], hiddenDepth: 0.002 });
  add({ name: 'soles', simplify: { tris: 1800, error: 0.001 }, voxel: 0.0075, prims: soles, rigidBone: null, skinPrims: soles.filter((n) => n.op === 0), skin: { sigma: 0.03 } });
  add({ name: 'laces', simplify: { tris: 1000, error: 0.0005 }, voxel: 0.0034, prims: laces, skin: { sigma: 0.03 }, hiddenBy: ['shoes'], hiddenDepth: 0.0012 });
  if (gadget) {
    add({ name: 'gadget', simplify: { tris: 2400, error: 0.0007 }, voxel: 0.0055, blend: 0.004, prims: gadget, rigidBone: 'chest' });
    add({ name: 'harness', simplify: { tris: 2200, error: 0.0008 }, voxel: 0.0055, prims: harness, skinFrom: 'body', hiddenBy: ['coat', 'coatDetail'], hiddenDepth: 0.0015 });
    add({ name: 'coil', simplify: { tris: 1400, error: 0.0006 }, voxel: 0.0048, prims: coil, rigidBone: 'chest', ao: false, hiddenBy: ['gadget'], hiddenDepth: 0.001 });
  }

  return {
    skeleton: heroSkeleton(),
    ao: { radius: 0.08, samples: 3, strength: 1.0, gradient: { y0: 0.0, y1: 1.3, bottom: 0.82 } },
    aoLayers: L.filter((l) => !['coil', 'goggleLens', 'emblem', 'laces', 'eyeL', 'eyeR', 'buckle', 'brows', 'strap', 'pantsDetail'].includes(l.name)).map((l) => l.name),
    skin: { sigma: 0.025 },
    layers: L,
    pouchTop: pouchL.top,
    hemY,
  };
}
