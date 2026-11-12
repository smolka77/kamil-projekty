/**
 * sculpt/index.js — wysokopoziomowy builder: lista warstw z prymitywami SDF → gładkie, oskórowane
 * (SkinnedMesh) i zacienione AO siatki Three.js. Re-eksportuje całe API z sdf/mesher/ao/skin.
 *
 * const char = sculptCharacter({
 *   skeleton: [{ name: 'hips', parent: null, pos: [0, 1.0, 0] }, ...],   // bind pose, metry
 *   ao: { radius: 0.08, strength: 1, gradient: { y0: 0, y1: 1.1, bottom: 0.82 } },
 *   aoLayers: ['body', 'shirt', ...],        // warstwy tworzące globalne SDF dla AO (domyślnie wszystkie)
 *   skin: { sigma: 0.025 },                  // domyślne opcje wag
 *   layers: [{
 *     name: 'body',                          // klucz w char.meshes
 *     voxel: 0.009,                          // rozmiar woksela (m): twarz ~0.004–0.005, ciało ~0.008–0.010
 *     material: new THREE.MeshStandardMaterial({ color, roughness, vertexColors: true }),
 *     prims: [...węzły z sdf.js...],
 *     bone: 'spine',                         // domyślna kość dla prymitywów bez `bone`
 *     rigidBone: 'head',                     // opcjonalnie: 100% wag do jednej kości
 *     blend: 0.02,                           // domyślne k (gładkie łączenie) dla prymitywów
 *     ao: true,                              // czy warstwa dostaje AO (atrybut color)
 *     hiddenBy: ['shirt'], hiddenDepth: 0.003, // usuń trójkąty schowane wewnątrz tych warstw
 *     skinFrom: 'body',                      // wagi z prymitywów innej warstwy (ubrania = jak ciało)
 *     skinPrims: [...],                      // albo z własnej listy prymitywów
 *     skin: { sigma },                       // nadpisanie opcji wag
 *     paintBase: 0xffffff,                   // kolor bazowy przed malowaniem (mnożony przez material.color)
 *     relax: 1, project: true, normalEps: 0.35, lipschitz: 1.25,  // opcje meshera
 *     castShadow: true, receiveShadow: true, bounds: [x0,y0,z0,x1,y1,z1],
 *   }],
 * });
 * → { root: THREE.Group (zawiera kość-korzeń i wszystkie siatki), bones: {name: Bone}, skeleton,
 *     skel (wynik buildSkeleton), meshes: {name: SkinnedMesh}, fields: {name: Field}, stats }
 *
 * def.simplify(indices, positions, normals, nVerts, targetIndexCount, layerOpts) → Uint32Array — wstrzykiwany
 * upraszczacz (np. meshoptimizer), wywoływany po ukrywaniu zasłoniętych trójkątów, przed AO i wagami.
 *
 * sculptModel({ layers, ao, aoLayers }) — to samo bez szkieletu: zwraca { root, meshes: {name: Mesh}, fields, stats }
 * (np. broń; przypnij później przez attachToBone lub bone.add).
 *
 * cloneCharacter(char, { warstwa: material }) — kolejna instancja (współdzielone geometrie, nowy szkielet).
 *
 * Atrybut `color` = AO (0..1) × kolor malowania (liniowy). Materiał MUSI mieć vertexColors: true
 * (builder włącza to automatycznie, gdy warstwa ma AO lub malowanie).
 */
import * as THREE from 'three';
import { compileField, packPrims, toLinearRGB, group, OP_PAINT } from './sdf.js';
import { meshField } from './mesher.js';
import { computeAO, cullHidden, computePaint } from './ao.js';
import { buildSkeleton, computeSkinWeights, rigidSkin, createSkinnedMesh } from './skin.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

export * from './sdf.js';
export { meshField } from './mesher.js';
export { computeAO, cullHidden, computePaint } from './ao.js';
export { buildSkeleton, computeSkinWeights, rigidSkin, createSkinnedMesh, attachToBone } from './skin.js';

const now = () => performance.now();

function collectPrims(nodes, out = [], ctx = { bone: null }) {
  for (const n of Array.isArray(nodes) ? nodes.flat(Infinity) : [nodes]) {
    if (!n) continue;
    if (n.kind === 'group') collectPrims(n.children, out, { bone: n.bone ?? ctx.bone });
    else if (n.op !== OP_PAINT) out.push({ node: n, bone: n.bone ?? ctx.bone });
  }
  return out;
}

/** Usuwa nieużywane wierzchołki po zmianie indeksów (upraszczanie). */
function compactMesh(m, idx) {
  const n = m.nVerts;
  const remap = new Int32Array(n).fill(-1);
  let nv = 0;
  for (let i = 0; i < idx.length; i++) {
    const v = idx[i];
    if (remap[v] < 0) remap[v] = nv++;
  }
  const pos = new Float32Array(nv * 3);
  const nor = new Float32Array(nv * 3);
  const vb = m.vertBlock ? new m.vertBlock.constructor(nv) : null;
  for (let v = 0; v < n; v++) {
    const r = remap[v];
    if (r < 0) continue;
    pos[r * 3] = m.positions[v * 3]; pos[r * 3 + 1] = m.positions[v * 3 + 1]; pos[r * 3 + 2] = m.positions[v * 3 + 2];
    nor[r * 3] = m.normals[v * 3]; nor[r * 3 + 1] = m.normals[v * 3 + 1]; nor[r * 3 + 2] = m.normals[v * 3 + 2];
    if (vb) vb[r] = m.vertBlock[v];
  }
  const out = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) out[i] = remap[idx[i]];
  return { ...m, positions: pos, normals: nor, indices: out, vertBlock: vb, nVerts: nv, nTris: idx.length / 3 };
}

function buildCore(def, withSkin) {
  const T0 = now();
  const stats = { layers: {}, compileMs: 0, meshMs: 0, cullMs: 0, aoMs: 0, skinMs: 0, paintMs: 0, buildMs: 0, totalMs: 0, verts: 0, tris: 0 };
  const aoOpts = { radius: 0.08, ...(def.ao || {}) };
  const layers = def.layers;
  const byName = {};
  layers.forEach((l) => {
    if (!l.name) throw new Error('sculpt: warstwa bez nazwy');
    if (byName[l.name]) throw new Error('sculpt: powtórzona nazwa warstwy ' + l.name);
    byName[l.name] = l;
  });

  // 1. kompilacja
  let t = now();
  const fields = {};
  for (const l of layers) {
    const t1 = now();
    fields[l.name] = compileField(l.prims, {
      voxel: l.voxel ?? def.voxel ?? 0.009,
      pad: aoOpts.radius + 0.01,
      blend: l.blend ?? def.blend ?? 0,
      bone: l.bone ?? l.rigidBone ?? null,
      bounds: l.bounds,
      blockCells: l.blockCells,
      minShell: l.minShell,
    });
    stats.layers[l.name] = { compileMs: now() - t1, prims: fields[l.name].stats.prims, voxel: fields[l.name].h };
    for (const w of fields[l.name].warnings) {
      const msg = `sculpt [${l.name}]: ${w}`;
      (stats.warnings ||= []).push(msg);
      if (def.warn !== false) console.warn(msg);
    }
  }
  stats.compileMs = now() - t;

  // 2. siatkowanie
  t = now();
  const raw = {};
  for (const l of layers) {
    const m = meshField(fields[l.name], { relax: l.relax, relaxFactor: l.relaxFactor, project: l.project, normalEps: l.normalEps, lipschitz: l.lipschitz, refineNormals: l.refineNormals });
    raw[l.name] = m;
    Object.assign(stats.layers[l.name], { meshMs: m.stats.ms, evals: m.stats.evals, grid: m.stats.grid });
  }
  stats.meshMs = now() - t;

  // 3. ukrywanie zasłoniętych trójkątów
  t = now();
  for (const l of layers) {
    if (!l.hiddenBy || !l.hiddenBy.length) continue;
    // wpis: nazwa warstwy albo { layer, depth } (własna głębokość; ujemna = usuń też tuż PRZED powierzchnią)
    const byDepth = new Map();
    for (const e of l.hiddenBy) {
      const n = typeof e === 'string' ? e : e.layer;
      const d = typeof e === 'string' ? l.hiddenDepth ?? 0.003 : e.depth ?? l.hiddenDepth ?? 0.003;
      if (!fields[n]) throw new Error(`sculpt: hiddenBy — nieznana warstwa "${n}"`);
      if (!byDepth.has(d)) byDepth.set(d, []);
      byDepth.get(d).push(fields[n]);
    }
    let culled = 0;
    for (const [d, fs] of byDepth) {
      raw[l.name] = cullHidden(raw[l.name], fs, d);
      culled += raw[l.name].culledTris || 0;
      raw[l.name].culledTris = 0;
    }
    raw[l.name].culledTris = culled;
    stats.layers[l.name].culledTris = culled;
  }
  stats.cullMs = now() - t;

  // 3b. upraszczanie siatek (opcjonalne): def.simplify = (indices, positions, normals, nVerts, targetIndexCount, layerOpts) → Uint32Array
  //     warstwa: simplify: { ratio | tris, error } — przed AO/wagami, więc te liczą się już na mniejszej siatce.
  //     Wierzchołki nie są przesuwane (zostaje podzbiór) → normalne z gradientu SDF pozostają dokładne.
  t = now();
  if (typeof def.simplify === 'function') {
    for (const l of layers) {
      if (!l.simplify) continue;
      const m = raw[l.name];
      if (!m.nTris) continue;
      const o = typeof l.simplify === 'number' ? { ratio: l.simplify } : l.simplify;
      const target = Math.max(3, Math.floor(o.tris != null ? Math.min(o.tris, m.nTris) : m.nTris * (o.ratio ?? 0.5)) * 3);
      if (target >= m.indices.length) continue;
      const idx = def.simplify(m.indices, m.positions, m.normals, m.nVerts, target, o);
      if (!idx) continue;
      raw[l.name] = compactMesh(m, idx);
      stats.layers[l.name].simplifiedFrom = m.nTris;
    }
  }
  stats.simplifyMs = now() - t;

  // 4. AO z globalnego SDF
  t = now();
  const aoNames = def.aoLayers || layers.filter((l) => l.aoCast !== false).map((l) => l.name);
  const aoTargets = layers.filter((l) => l.ao !== false);
  let aoRes = [];
  if (aoTargets.length && aoNames.length) {
    // jedno scalone pole: każda warstwa jako osobna grupa (twarda suma = min po warstwach),
    // margines odcinania = promień AO → próbki do `radius` od powierzchni są liczone dokładnie
    const nodes = aoNames.map((n) => {
      const l = byName[n];
      if (!l) throw new Error(`sculpt: aoLayers — nieznana warstwa "${n}"`);
      return group(l.prims, { blend: l.blend ?? def.blend ?? 0, bone: l.bone ?? l.rigidBone ?? null });
    });
    // dwa poziomy: bliskie próbki (≤ nearMax) na polu z małym marginesem, dalekie na polu z marginesem = radius
    const nearMax = aoOpts.nearMax ?? 0.025;
    const pad = aoOpts.radius + 0.01;
    const near = compileField(nodes, { voxel: (aoOpts.nearBlock ?? 0.048) / 16, blockCells: 16, margin: nearMax + 0.004, pad });
    const far = compileField(nodes, { voxel: (aoOpts.block ?? 0.064) / 16, blockCells: 16, margin: aoOpts.radius + 0.004, pad });
    stats.aoField = { near: near.stats, far: far.stats };
    aoRes = computeAO(aoTargets.map((l) => raw[l.name]), { near: [near], far: [far], nearMax }, aoOpts);
  }
  const ao = {};
  aoTargets.forEach((l, i) => (ao[l.name] = aoRes[i]));
  stats.aoMs = now() - t;

  // 5. wagi skinningu
  t = now();
  let skel = null;
  const skins = {};
  if (withSkin) {
    skel = buildSkeleton(def.skeleton);
    const parents = new Int32Array(skel.bones.length).fill(-1);
    skel.bones.forEach((b, i) => {
      if (b.parent && b.parent.isBone) parents[i] = skel.index[b.parent.name];
    });
    const tables = {};
    const tableFor = (l) => {
      if (l.skinPrims) return packPrims(collectPrims(l.skinPrims, [], { bone: l.bone ?? null }));
      if (l.skinFrom) {
        const f = fields[l.skinFrom];
        if (!f) throw new Error(`sculpt: skinFrom — nieznana warstwa "${l.skinFrom}"`);
        return f.prims;
      }
      return fields[l.name].prims;
    };
    for (const l of layers) {
      const m = raw[l.name];
      const t1 = now();
      if (l.rigidBone) {
        const bi = skel.index[l.rigidBone];
        if (bi === undefined) throw new Error(`sculpt: nieznana kość "${l.rigidBone}"`);
        skins[l.name] = rigidSkin(m.nVerts, bi);
      } else {
        const key = l.skinPrims ? '#' + l.name : l.skinFrom || l.name;
        tables[key] = tables[key] || tableFor(l);
        skins[l.name] = computeSkinWeights(m.positions, m.nVerts, tables[key], skel.index, { parents, ...(def.skin || {}), ...(l.skin || {}) });
      }
      stats.layers[l.name].skinMs = now() - t1;
    }
  }
  stats.skinMs = now() - t;

  // 6. kolory: malowanie × AO
  t = now();
  const colors = {};
  for (const l of layers) {
    const m = raw[l.name];
    const F = fields[l.name];
    const base = l.paintBase != null ? toLinearRGB(l.paintBase) : [1, 1, 1];
    const hasPaint = F.paints.n > 0;
    const a = ao[l.name];
    // warstwa: aoMin (dolny próg AO) i aoAdjust(positions, ao, nVerts) — lokalne korekty (np. oczy, uszy)
    if (a && typeof l.aoAdjust === 'function') l.aoAdjust(m.positions, a, m.nVerts);
    if (a && l.aoMin != null) for (let v = 0; v < m.nVerts; v++) a[v] = Math.max(l.aoMin, a[v]);
    if (!hasPaint && !a) continue;
    const col = hasPaint ? computePaint(m.positions, m.nVerts, F.paints, base) : null;
    const out = col || new Float32Array(m.nVerts * 3);
    for (let v = 0; v < m.nVerts; v++) {
      const s = a ? a[v] : 1;
      if (col) {
        out[v * 3] *= s; out[v * 3 + 1] *= s; out[v * 3 + 2] *= s;
      } else {
        out[v * 3] = base[0] * s; out[v * 3 + 1] = base[1] * s; out[v * 3 + 2] = base[2] * s;
      }
    }
    colors[l.name] = out;
  }
  stats.paintMs = now() - t;

  // 7. obiekty Three.js
  t = now();
  const root = new THREE.Group();
  root.name = def.name || 'sculpt';
  if (skel) root.add(skel.root);
  const meshes = {};
  for (const l of layers) {
    const m = raw[l.name];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
    if (colors[l.name]) g.setAttribute('color', new THREE.BufferAttribute(colors[l.name], 3));
    if (skel) {
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skins[l.name].skinIndex, 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skins[l.name].skinWeight, 4));
    }
    g.setIndex(new THREE.BufferAttribute(m.indices, 1));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    let mat = l.material;
    if (!mat) mat = new THREE.MeshStandardMaterial({ color: l.color ?? 0xcccccc, roughness: 0.6, metalness: 0 });
    if (colors[l.name] && !mat.vertexColors) {
      mat.vertexColors = true;
      mat.needsUpdate = true;
    }
    const mesh = skel ? createSkinnedMesh(g, mat, skel) : new THREE.Mesh(g, mat);
    mesh.name = l.name;
    mesh.castShadow = l.castShadow ?? true;
    mesh.receiveShadow = l.receiveShadow ?? true;
    if (l.renderOrder != null) mesh.renderOrder = l.renderOrder;
    root.add(mesh);
    meshes[l.name] = mesh;
    stats.layers[l.name].verts = m.nVerts;
    stats.layers[l.name].tris = m.nTris;
    stats.verts += m.nVerts;
    stats.tris += m.nTris;
  }
  stats.buildMs = now() - t;
  stats.totalMs = now() - T0;
  return { root, meshes, fields, skel, stats };
}

/** Postać ze szkieletem (SkinnedMesh na warstwę, wspólny THREE.Skeleton). */
export function sculptCharacter(def) {
  if (!def.skeleton) throw new Error('sculptCharacter: brak definicji szkieletu');
  const r = buildCore(def, true);
  return {
    root: r.root,
    bones: r.skel.byName,
    boneList: r.skel.bones,
    skeleton: r.skel.skeleton,
    skel: r.skel,
    meshes: r.meshes,
    fields: r.fields,
    stats: r.stats,
  };
}

/**
 * Druga instancja tej samej postaci bez ponownego rzeźbienia (~0 ms): geometrie są WSPÓŁDZIELONE,
 * szkielet i kości — nowe. materials: opcjonalnie { nazwaWarstwy: THREE.Material } (np. inny skin
 * kolorystyczny). Zwraca { root, bones, boneList, skeleton, meshes }.
 */
export function cloneCharacter(char, materials = {}) {
  const root = cloneSkinned(char.root);
  const bones = {};
  const meshes = {};
  let skeleton = null;
  root.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
    if (o.isSkinnedMesh) {
      meshes[o.name] = o;
      o.frustumCulled = false;
      skeleton = o.skeleton;
      if (materials[o.name]) o.material = materials[o.name];
    }
  });
  return { root, bones, boneList: skeleton ? skeleton.bones : [], skeleton, meshes };
}

/** Model statyczny (bez szkieletu) — THREE.Mesh na warstwę. */
export function sculptModel(def) {
  const r = buildCore(def, false);
  return { root: r.root, meshes: r.meshes, fields: r.fields, stats: r.stats };
}
