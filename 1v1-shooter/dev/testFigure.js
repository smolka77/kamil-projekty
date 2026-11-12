/**
 * dev/testFigure.js — figury testowe dla laboratorium rzeźbienia (NIE są częścią gry).
 *  simpleFigure()  — tułów + jedna ręka (z łokciem) + głowa + koszulka; do testu zgięcia łokcia i AO.
 *  benchFigure()   — pełna postać (12 warstw, ~160 prymitywów) do pomiaru wydajności i jako przykład API.
 * Oryginalny, generyczny projekt (podróżnik w kamizelce) — nie odwzorowuje żadnej istniejącej postaci.
 */
import * as THREE from 'three';
import {
  sphere, ellipsoid, capsule, roundCone, roundBox, torus, cylinder, plane,
  group, shell, frame, mirror, both, bezierTube, tube, cut,
} from '../src/sculpt/index.js';

const DEG = Math.PI / 180;

function mat(color, roughness = 0.7, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, vertexColors: true, ...extra });
}
function fabric(color, roughness = 0.85, sheen = 0x888888) {
  return new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, vertexColors: true, sheen: 0.6, sheenRoughness: 0.6, sheenColor: sheen });
}
function skinMat(color) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, metalness: 0, vertexColors: true, sheen: 0.35, sheenRoughness: 0.4, sheenColor: 0xff8a6a, clearcoat: 0.05 });
}

// ---------------------------------------------------------------------------
// prosta figura: tułów + prawa ręka + głowa
// ---------------------------------------------------------------------------
export function simpleFigure() {
  const sh = [0.2, 1.47, 0];
  const el = [0.27, 1.19, 0.0];
  const wr = [0.32, 0.94, -0.02];
  const skeleton = [
    { name: 'hips', parent: null, pos: [0, 0.98, 0] },
    { name: 'spine', parent: 'hips', pos: [0, 1.1, 0] },
    { name: 'chest', parent: 'spine', pos: [0, 1.3, 0] },
    { name: 'neck', parent: 'chest', pos: [0, 1.52, 0] },
    { name: 'head', parent: 'neck', pos: [0, 1.62, 0] },
    { name: 'upperArmR', parent: 'chest', pos: sh },
    { name: 'forearmR', parent: 'upperArmR', pos: el },
    { name: 'handR', parent: 'forearmR', pos: wr },
  ];
  const torso = [
    ellipsoid([0, 1.0, 0], [0.16, 0.12, 0.11], { bone: 'hips' }),
    ellipsoid([0, 1.13, 0], [0.14, 0.13, 0.1], { bone: 'spine' }),
    ellipsoid([0, 1.34, -0.005], [0.18, 0.15, 0.115], { bone: 'chest' }),
  ];
  const arm = [
    sphere(sh, 0.062, { bone: 'upperArmR' }),
    roundCone(sh, el, 0.056, 0.044, { bone: 'upperArmR' }),
    roundCone(el, wr, 0.044, 0.032, { bone: 'forearmR' }),
  ];
  const skin = [
    ...torso,
    ...arm,
    capsule([0, 1.44, 0], [0, 1.63, 0.0], 0.052, { bone: 'neck' }),
    ellipsoid([0.334, 0.875, -0.022], [0.022, 0.06, 0.042], { bone: 'handR', rot: [0, 0, 12 * DEG] }),
    ellipsoid([0, 1.73, 0.0], [0.095, 0.115, 0.105], { bone: 'head', k: 0.03 }),
    ellipsoid([0, 1.665, -0.035], [0.075, 0.07, 0.07], { bone: 'head', k: 0.04 }),
    roundCone([0, 1.73, -0.095], [0, 1.69, -0.112], 0.009, 0.014, { bone: 'head', k: 0.012 }),
    ...both([sphere([0.036, 1.715, -0.088], 0.022, { bone: 'head', op: 'sub', k: 0.015 })]),
    ...both([ellipsoid([0.097, 1.71, 0.005], [0.013, 0.03, 0.022], { bone: 'head', k: 0.01 })]),
  ];
  const shirtBase = [...torso, sphere(sh, 0.062, { bone: 'upperArmR' }), roundCone(sh, el, 0.056, 0.044, { bone: 'upperArmR' })];
  const shirt = [
    shell(shirtBase, 0.017, { offset: 0.0105, blend: 0.05 }),
    sphere([0, 1.56, 0], 0.075, { op: 'sub', k: 0.01 }), // dekolt
    plane([0, 0.95, 0], [0, 1, 0], { op: 'sub', k: 0.005 }), // dół (normalna wskazuje część ZACHOWANĄ)
    // rękaw: cięcie tylko w obrębie ramienia (nie tnie tułowia)
    cut([0.235, 1.33, 0], [-0.24, 0.97, 0], [capsule([0.235, 1.33, 0], el, 0.078)], { k: 0.003, bone: 'upperArmR' }),
  ];
  return {
    skeleton,
    ao: { radius: 0.08, strength: 1.0, gradient: { y0: 0.6, y1: 1.4, bottom: 0.85 } },
    skin: { sigma: 0.025 },
    layers: [
      { name: 'skin', voxel: 0.006, blend: 0.05, prims: skin, material: skinMat(0xe9b08f), hiddenBy: ['shirt'] },
      { name: 'shirt', voxel: 0.007, prims: shirt, material: fabric(0x2e8bd8), skinFrom: 'skin' },
    ],
  };
}

// ---------------------------------------------------------------------------
// pełna postać (benchmark)
// ---------------------------------------------------------------------------
const A = 20 * DEG; // odwiedzenie ramion (A-pose)
const DIRL = [-Math.sin(A), -Math.cos(A), 0];
const SHL = [-0.19, 1.47, 0];
const armL = (t, dz = 0) => [SHL[0] + DIRL[0] * t, SHL[1] + DIRL[1] * t, SHL[2] + dz];
const ELB = 0.29;
const WRI = 0.54;

export function benchSkeleton() {
  const rotL = [0, 0, -A];
  const rotR = [0, 0, A];
  const s = [
    { name: 'hips', parent: null, pos: [0, 0.98, 0] },
    { name: 'spine', parent: 'hips', pos: [0, 1.1, 0] },
    { name: 'chest', parent: 'spine', pos: [0, 1.3, 0] },
    { name: 'neck', parent: 'chest', pos: [0, 1.53, 0] },
    { name: 'head', parent: 'neck', pos: [0, 1.62, 0] },
  ];
  for (const [side, sx, rot] of [['L', 1, rotL], ['R', -1, rotR]]) {
    const m = (p) => [p[0] * sx, p[1], p[2]];
    s.push({ name: 'upperArm' + side, parent: 'chest', pos: m(SHL), rot });
    s.push({ name: 'forearm' + side, parent: 'upperArm' + side, pos: m(armL(ELB)), rot });
    s.push({ name: 'hand' + side, parent: 'forearm' + side, pos: m(armL(WRI)), rot });
    s.push({ name: 'thigh' + side, parent: 'hips', pos: m([-0.1, 0.93, 0]) });
    s.push({ name: 'shin' + side, parent: 'thigh' + side, pos: m([-0.105, 0.5, 0.01]) });
    s.push({ name: 'foot' + side, parent: 'shin' + side, pos: m([-0.11, 0.09, 0.02]) });
  }
  return s;
}

function bodyL() {
  // lewa połowa kończyn (prawa przez mirror)
  return [
    sphere(SHL, 0.066, { bone: 'upperArmL', k: 0.06 }),
    roundCone(armL(0.02), armL(ELB), 0.058, 0.045, { bone: 'upperArmL' }),
    roundCone(armL(ELB), armL(WRI), 0.045, 0.033, { bone: 'forearmL', k: 0.03 }),
    ellipsoid(armL(0.4, 0.008), [0.04, 0.07, 0.04], { bone: 'forearmL', rot: [0, 0, -A], k: 0.04 }),
    roundCone([-0.1, 0.93, 0], [-0.105, 0.5, 0.01], 0.088, 0.058, { bone: 'thighL', k: 0.07 }),
    roundCone([-0.105, 0.5, 0.01], [-0.11, 0.1, 0.02], 0.057, 0.04, { bone: 'shinL', k: 0.03 }),
    ellipsoid([-0.107, 0.36, 0.04], [0.05, 0.1, 0.05], { bone: 'shinL', k: 0.04 }),
  ];
}

function torsoPrims(inflate = 0) {
  const o = { inflate };
  return [
    ellipsoid([0, 0.97, 0], [0.17, 0.12, 0.12], { bone: 'hips', ...o }),
    ellipsoid([0, 1.12, 0.0], [0.15, 0.13, 0.11], { bone: 'spine', k: 0.07, ...o }),
    ellipsoid([0, 1.33, -0.005], [0.185, 0.15, 0.12], { bone: 'chest', k: 0.07, ...o }),
    ...both([ellipsoid([-0.07, 1.36, -0.06], [0.075, 0.06, 0.05], { bone: 'chest', k: 0.05, ...o })]),
  ];
}

function handL() {
  // dłoń w układzie lokalnym nadgarstka: palce wzdłuż -Y, wnętrze dłoni w stronę +X (do ciała), kciuk w -Z
  const p = [
    roundBox([0.0, -0.05, -0.002], [0.021, 0.045, 0.043], 0.018, { k: 0.015 }),
    cylinder([0, 0.035, 0], [0, -0.01, 0], 0.042, 0.012, { k: 0.01 }), // mankiet rękawicy
  ];
  const fz = [-0.03, -0.01, 0.01, 0.03];
  const fl = [0.04, 0.045, 0.043, 0.035];
  fz.forEach((z, i) => {
    const a = [0.002, -0.09, z * 0.95];
    const b = [0.008, -0.09 - fl[i] * 0.55, z];
    const c = [0.02, -0.09 - fl[i], z * 1.02];
    p.push(capsule(a, b, 0.0105, { k: 0.008 }));
    p.push(capsule(b, c, 0.0095, { k: 0.006 }));
  });
  p.push(capsule([0.008, -0.03, -0.038], [0.02, -0.065, -0.052], 0.012, { k: 0.01 }));
  p.push(capsule([0.02, -0.065, -0.052], [0.03, -0.09, -0.055], 0.0105, { k: 0.006 }));
  return p;
}

function shoeL() {
  const x = -0.11;
  return [
    roundBox([x, 0.07, 0.0], [0.05, 0.06, 0.065], 0.04, { k: 0.02 }),
    ellipsoid([x - 0.002, 0.045, -0.1], [0.052, 0.042, 0.08], { k: 0.04 }),
    roundBox([x, 0.016, -0.04], [0.058, 0.016, 0.14], 0.012, { k: 0.008 }),
    roundBox([x, 0.13, 0.005], [0.055, 0.02, 0.06], 0.018, { k: 0.015 }), // kołnierz
    ...[0, 1, 2].map((i) => capsule([x - 0.03, 0.098 - i * 0.012, -0.03 - i * 0.025], [x + 0.03, 0.098 - i * 0.012, -0.03 - i * 0.025], 0.006, { k: 0.004 })),
    roundBox([x, 0.008, -0.04], [0.059, 0.009, 0.141], 0.006, { op: 'paint', color: 0xf2efe6, soft: 0.004 }),
  ];
}

function hairPrims() {
  const p = [
    ellipsoid([0, 1.765, 0.014], [0.103, 0.1, 0.112], { k: 0.02 }),
    plane([0, 1.725, -0.07], [0, 0.45, 1], { op: 'sub', k: 0.02 }), // linia włosów nad czołem
  ];
  // pasma: od czubka do przodu i boków
  const clumps = [
    [[0.0, 1.86, 0.0], [0.02, 1.88, -0.07], [0.05, 1.82, -0.115]],
    [[-0.02, 1.86, 0.01], [-0.04, 1.87, -0.07], [-0.07, 1.8, -0.1]],
    [[0.03, 1.85, 0.02], [0.08, 1.84, -0.04], [0.105, 1.76, -0.07]],
    [[-0.03, 1.85, 0.02], [-0.09, 1.83, -0.03], [-0.107, 1.74, -0.05]],
    [[0.0, 1.86, 0.03], [0.07, 1.82, 0.07], [0.09, 1.72, 0.08]],
    [[0.0, 1.86, 0.03], [-0.07, 1.82, 0.07], [-0.09, 1.72, 0.08]],
    [[0.0, 1.85, 0.04], [0.0, 1.8, 0.12], [0.0, 1.69, 0.1]],
    [[0.01, 1.865, -0.02], [0.0, 1.9, -0.09], [-0.02, 1.84, -0.125]],
  ];
  for (const c of clumps) p.push(...bezierTube(c, 0.03, 0.008, { segments: 3, k: 0.012, squash: { dir: [c[2][0], 0.3, c[2][2]], factor: 0.6 } }));
  return p;
}

export function benchFigure() {
  const torso = torsoPrims();
  const limbsL = bodyL();
  // dłoń lewa w ramce nadgarstka; kość ustawiona PRZED lustrem (mirror zamieni handL → handR)
  const hand = frame({ pos: armL(WRI), rot: [0, 0, -A] }, group(handL(), { bone: 'handL' }));
  const head = 'head';

  const body = [
    ...torso,
    capsule([0, 1.42, 0.005], [0, 1.64, 0.0], 0.054, { bone: 'neck', k: 0.05 }),
    ...both(limbsL),
  ];

  const headPrims = [
    ellipsoid([0, 1.74, 0.01], [0.095, 0.11, 0.105]),
    ellipsoid([0, 1.665, -0.035], [0.078, 0.074, 0.075], { k: 0.04 }),
    sphere([0, 1.62, -0.072], 0.03, { k: 0.03 }),
    ...both([ellipsoid([-0.052, 1.7, -0.066], [0.03, 0.022, 0.026], { k: 0.02 })]),
    capsule([-0.045, 1.747, -0.088], [0.045, 1.747, -0.088], 0.015, { k: 0.02 }),
    roundCone([0, 1.735, -0.096], [0, 1.69, -0.113], 0.009, 0.014, { k: 0.012 }),
    ...both([sphere([-0.012, 1.69, -0.105], 0.009, { k: 0.01 })]),
    ...both([sphere([-0.036, 1.715, -0.086], 0.023, { op: 'sub', k: 0.014 })]),
    ...both([ellipsoid([-0.036, 1.727, -0.083], [0.025, 0.012, 0.02], { k: 0.006 })]), // górne powieki
    ellipsoid([0, 1.645, -0.1], [0.026, 0.008, 0.013], { k: 0.006 }),
    ellipsoid([0, 1.632, -0.097], [0.022, 0.009, 0.013], { k: 0.006 }),
    capsule([-0.022, 1.639, -0.112], [0.022, 1.639, -0.112], 0.0025, { op: 'sub', k: 0.003 }),
    ...both([ellipsoid([-0.096, 1.71, 0.006], [0.013, 0.031, 0.022], { rot: [0, -0.35, 0], k: 0.01 })]),
    ...both([ellipsoid([-0.103, 1.712, 0.002], [0.006, 0.018, 0.012], { rot: [0, -0.35, 0], op: 'sub', k: 0.004 })]),
    ellipsoid([0, 1.639, -0.1], [0.028, 0.017, 0.016], { op: 'paint', color: 0xc46a5e, soft: 0.004, strength: 0.8 }),
    ...both([sphere([-0.055, 1.68, -0.08], 0.03, { op: 'paint', color: 0xf09a8a, soft: 0.02, strength: 0.35 })]),
  ];

  const eyes = both([
    sphere([-0.036, 1.715, -0.079], 0.0172),
    sphere([-0.036, 1.715, -0.093], 0.0075, { op: 'paint', color: 0x3c7fc4, soft: 0.0015 }),
    sphere([-0.036, 1.715, -0.0955], 0.0035, { op: 'paint', color: 0x101014, soft: 0.001 }),
  ]);

  const brows = both([bezierTube([[-0.062, 1.745, -0.085], [-0.04, 1.758, -0.1], [-0.014, 1.75, -0.103]], 0.0035, 0.0055, { segments: 3, k: 0.003 })]);

  const shirt = [
    shell([...torsoPrims(), ...both([sphere(SHL, 0.066, { bone: 'upperArmL' }), roundCone(armL(0.02), armL(0.2), 0.058, 0.05, { bone: 'upperArmL' })])], 0.018, { offset: 0.004, blend: 0.06 }),
    sphere([0, 1.555, -0.01], 0.07, { op: 'sub', k: 0.01, bone: 'chest' }),
    plane([0, 0.93, 0], [0, 1, 0], { op: 'sub', k: 0.012, bone: 'hips' }),
    ...both([plane(armL(0.17), [-DIRL[0], -DIRL[1], 0], { op: 'sub', k: 0.004, bone: 'upperArmL' })]),
  ];

  const vest = [
    shell(torsoPrims(0.022), 0.02, { offset: 0, blend: 0.07, bone: 'chest' }),
    roundBox([0, 1.25, -0.2], [0.035, 0.32, 0.1], 0.02, { op: 'sub', k: 0.012, bone: 'chest' }), // rozpięty przód
    plane([0, 0.95, 0], [0, 1, 0], { op: 'sub', k: 0.012, bone: 'hips' }),
    ...both([sphere([-0.2, 1.38, 0], 0.085, { op: 'sub', k: 0.012, bone: 'chest' })]), // otwory na ręce
    sphere([0, 1.55, -0.01], 0.085, { op: 'sub', k: 0.01, bone: 'chest' }),
    torus([0, 1.5, 0.0], 0.085, 0.024, { rot: [-0.25, 0, 0], k: 0.02, bone: 'neck', squash: { dir: [0, 0, 1], factor: 0.85 } }), // kołnierz
    ...both([roundBox([-0.11, 1.08, -0.13], [0.05, 0.045, 0.016], 0.01, { k: 0.008, bone: 'spine', rot: [0.15, 0.25, 0] })]), // kieszenie
  ];

  const pants = [
    ellipsoid([0, 0.95, 0], [0.178, 0.13, 0.13], { bone: 'hips' }),
    ...both([
      roundCone([-0.1, 0.93, 0], [-0.105, 0.5, 0.01], 0.1, 0.07, { bone: 'thighL', k: 0.06 }),
      roundCone([-0.105, 0.5, 0.01], [-0.11, 0.12, 0.02], 0.07, 0.056, { bone: 'shinL', k: 0.03 }),
      torus([-0.11, 0.13, 0.02], 0.055, 0.012, { bone: 'shinL', k: 0.01 }), // mankiet
      roundBox([-0.165, 0.68, -0.005], [0.03, 0.06, 0.05], 0.015, { bone: 'thighL', k: 0.012, rot: [0, 0, 0.06] }), // kieszeń cargo
      ellipsoid([-0.105, 0.5, -0.045], [0.055, 0.05, 0.03], { bone: 'shinL', k: 0.02 }), // nakolannik
    ]),
    plane([0, 1.04, 0], [0, -1, 0], { op: 'sub', k: 0.005, bone: 'hips' }),
  ];

  const belt = [
    torus([0, 1.0, 0.0], 0.168, 0.02, { squash: { dir: [0, 0, 1], factor: 0.74 }, bone: 'hips' }),
    roundBox([0, 1.0, -0.135], [0.03, 0.026, 0.012], 0.006, { k: 0.004, bone: 'hips' }),
    ...both([roundBox([-0.12, 0.99, -0.1], [0.012, 0.03, 0.01], 0.004, { k: 0.003, bone: 'hips', rot: [0, 0.6, 0] })]),
  ];

  const shoes = both(shoeL().map((p) => ({ ...p, bone: 'footL' })));

  const gloves = both(hand);

  const pack = [
    roundBox([0, 1.28, 0.2], [0.13, 0.17, 0.07], 0.05, { bone: 'chest' }),
    roundBox([0, 1.2, 0.27], [0.1, 0.07, 0.03], 0.025, { k: 0.015, bone: 'chest' }),
    capsule([-0.08, 1.4, 0.2], [0.08, 1.4, 0.2], 0.012, { k: 0.01, bone: 'chest' }),
    ...both([
      ...tube([[-0.09, 1.42, 0.15], [-0.11, 1.5, 0.02], [-0.11, 1.45, -0.12], [-0.12, 1.25, -0.13], [-0.12, 1.15, -0.09]], 0.014, { bone: 'chest', k: 0.006 }),
    ]),
  ];

  return {
    skeleton: benchSkeleton(),
    ao: { radius: 0.08, strength: 1.0, gradient: { y0: 0.0, y1: 1.2, bottom: 0.8 } },
    skin: { sigma: 0.025 },
    layers: [
      { name: 'body', voxel: 0.009, blend: 0.05, prims: body, material: skinMat(0xd99a74), hiddenBy: ['shirt', 'vest', 'pants', 'gloves', 'shoes'] },
      { name: 'head', voxel: 0.005, blend: 0.02, bone: head, prims: headPrims, material: skinMat(0xd99a74), rigidBone: 'head' },
      { name: 'eyes', voxel: 0.004, bone: head, prims: eyes, material: mat(0xffffff, 0.15), rigidBone: 'head' },
      { name: 'brows', voxel: 0.004, bone: head, prims: brows, material: mat(0x3a2418, 0.9), rigidBone: 'head' },
      { name: 'hair', voxel: 0.006, bone: head, prims: hairPrims(), material: mat(0x5a3220, 0.55), rigidBone: 'head' },
      { name: 'shirt', voxel: 0.008, prims: shirt, material: fabric(0xe8742c), skinFrom: 'body', hiddenBy: ['vest'] },
      { name: 'vest', voxel: 0.009, prims: vest, material: fabric(0x1f8a7a, 0.8, 0x99ffee), skinFrom: 'body' },
      { name: 'pants', voxel: 0.009, prims: pants, material: fabric(0x8b7d5a, 0.9), skinFrom: 'body' },
      { name: 'belt', voxel: 0.006, prims: belt, material: mat(0x4a3022, 0.5), rigidBone: 'hips' },
      { name: 'shoes', voxel: 0.007, prims: shoes, material: mat(0x5b4a3a, 0.6) },
      { name: 'gloves', voxel: 0.006, prims: gloves, material: mat(0x333a44, 0.65), skin: { sigma: 0.02 } },
      { name: 'pack', voxel: 0.009, prims: pack, material: fabric(0x9b4b2a, 0.75), rigidBone: 'chest' },
    ],
  };
}

/** Licznik prymitywów (rekurencyjnie, bez grup). */
export function countPrims(def) {
  let n = 0;
  const walk = (x) => {
    for (const p of x.flat(Infinity)) {
      if (p.kind === 'group') walk(p.children);
      else n++;
    }
  };
  def.layers.forEach((l) => walk(l.prims));
  return n;
}
