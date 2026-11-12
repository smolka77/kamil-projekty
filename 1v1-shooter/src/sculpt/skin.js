/**
 * sculpt/skin.js — szkielet (THREE.Bone) i wagi skinningu z przypisań kości do prymitywów.
 *
 * buildSkeleton(def) → { root, bones: Bone[], byName: {name: Bone}, index: {name: i}, skeleton: THREE.Skeleton, bind }
 *   def: [{ name, parent: string|null, pos: [x,y,z] (bind pose, świat postaci), rot?: rotacja świata w bind pose }]
 *   Dokładnie jedna kość bez rodzica (korzeń). Bez `rot` kości mają rotację jednostkową w bind pose
 *   (lokalne osie = osie świata; ramię opuszczone w dół → lokalne -Y wzdłuż kończyny).
 *   bind[name] = { pos: Vector3, quat: Quaternion } — pozycja/rotacja świata w bind pose.
 *   boneInverses liczone z definicji (niezależnie od aktualnego matrixWorld).
 *
 * computeSkinWeights(positions, nVerts, prims, boneIndex, opts) → { skinIndex: Uint16Array(4V), skinWeight: Float32Array(4V) }
 *   prims: tablica z packPrims() (np. field.prims). Brane są tylko prymitywy op 'add' z skin !== false
 *   (cięcia 'sub'/'int' i płaszczyzny pomijane, chyba że opts.cutters = true).
 *   Dla każdej kości: miękkie minimum odległości (|d| + skinBias) jej prymitywów:
 *     w_kość = Σ_p exp(−(|d_p| + bias_p − d_min) / sigma), potem 4 największe, normalizacja.
 *   opts: { sigma = 0.025 (m, szerokość przejścia przy stawach), range = 5·sigma, cell = 0.06,
 *           parents: Int32Array (indeks rodzica każdej kości, -1 = korzeń), hops = 1 }
 *   Z `parents` wagi dostają tylko kości odległe o ≤ hops w hierarchii od kości dominującej
 *   (najbliższy prymityw) — chroni przed przeciekaniem między kośćmi bliskimi przestrzennie,
 *   ale niepołączonymi (udo L ↔ udo R, przedramię ↔ biodro). hops = -1 wyłącza ograniczenie.
 *
 * rigidSkin(nVerts, boneIdx) → { skinIndex, skinWeight } (100% jedna kość)
 *
 * createSkinnedMesh(geometry, material, skel) → THREE.SkinnedMesh (bind z macierzą jednostkową,
 *   frustumCulled = false). Siatka i kość-korzeń MUSZĄ mieć wspólnego rodzica (np. char.root).
 *
 * attachToBone(object, bone, bindWorldMatrix?) — przypina zwykły obiekt (np. oko, broń) do kości;
 *   obiekt ma ustawioną transformację w bind pose (świat postaci), funkcja przelicza ją na lokalną kości.
 */
import * as THREE from 'three';
import { MAXB, vec3, toQuaternion, bucketByCell, primDistToCells, primDistBatch, OP_ADD, PLANE } from './sdf.js';

export function buildSkeleton(def) {
  const byDef = new Map(def.map((d) => [d.name, d]));
  const order = [];
  const seen = new Set();
  const visit = (d, stack = new Set()) => {
    if (seen.has(d.name)) return;
    if (stack.has(d.name)) throw new Error('sculpt: cykl w szkielecie przy ' + d.name);
    stack.add(d.name);
    if (d.parent != null) {
      const p = byDef.get(d.parent);
      if (!p) throw new Error(`sculpt: kość "${d.name}" ma nieznanego rodzica "${d.parent}"`);
      visit(p, stack);
    }
    seen.add(d.name);
    order.push(d);
  };
  def.forEach((d) => visit(d));
  const roots = order.filter((d) => d.parent == null);
  if (roots.length !== 1) throw new Error('sculpt: szkielet musi mieć dokładnie jeden korzeń');

  const bones = [];
  const byName = {};
  const index = {};
  const bind = {};
  const inverses = [];
  for (const d of order) {
    const b = new THREE.Bone();
    b.name = d.name;
    const p = vec3(d.pos);
    const wp = new THREE.Vector3(p[0], p[1], p[2]);
    const wq = toQuaternion(d.rot) || new THREE.Quaternion();
    bind[d.name] = { pos: wp, quat: wq };
    if (d.parent != null) {
      const pb = bind[d.parent];
      const iq = pb.quat.clone().invert();
      b.position.copy(wp).sub(pb.pos).applyQuaternion(iq);
      b.quaternion.copy(iq.multiply(wq));
      byName[d.parent].add(b);
    } else {
      b.position.copy(wp);
      b.quaternion.copy(wq);
    }
    index[d.name] = bones.length;
    bones.push(b);
    byName[d.name] = b;
    inverses.push(new THREE.Matrix4().compose(wp, wq, new THREE.Vector3(1, 1, 1)).invert());
  }
  const root = byName[roots[0].name];
  const skeleton = new THREE.Skeleton(bones, inverses);
  return { root, bones, byName, index, skeleton, bind };
}

const BX = new Float32Array(MAXB), BY = new Float32Array(MAXB), BZ = new Float32Array(MAXB), BD = new Float32Array(MAXB);

export function rigidSkin(nVerts, boneIdx) {
  const si = new Uint16Array(nVerts * 4);
  const sw = new Float32Array(nVerts * 4);
  for (let v = 0; v < nVerts; v++) {
    si[v * 4] = boneIdx;
    sw[v * 4] = 1;
  }
  return { skinIndex: si, skinWeight: sw };
}

export function computeSkinWeights(positions, nVerts, prims, boneIndex, opts = {}) {
  const sigma = opts.sigma ?? 0.025;
  const range = opts.range ?? sigma * 5;
  const cellSize = opts.cell ?? 0.06;
  const cutters = !!opts.cutters;
  const si = new Uint16Array(nVerts * 4);
  const sw = new Float32Array(nVerts * 4);
  if (!nVerts) return { skinIndex: si, skinWeight: sw };

  // wybór prymitywów i ich kości
  const np = prims.n;
  const sel = new Uint8Array(np);
  const pBone = new Int32Array(np).fill(-1);
  let nSel = 0;
  for (let p = 0; p < np; p++) {
    if (!prims.skin[p] || prims.type[p] === PLANE) continue;
    if (!cutters && prims.op[p] !== OP_ADD) continue;
    const name = prims.bone[p];
    if (name == null) continue;
    const bi = boneIndex[name];
    if (bi === undefined) throw new Error(`sculpt: nieznana kość "${name}"`);
    sel[p] = 1;
    pBone[p] = bi;
    nSel++;
  }
  if (!nSel) throw new Error('sculpt: brak prymitywów z kośćmi do policzenia wag');

  // ograniczenie do kości bliskich w hierarchii (bez "przeciekania" np. udo L ↔ udo R, dłoń ↔ biodro)
  const nB = Object.keys(boneIndex).length;
  const hops = opts.hops ?? 1;
  let hopOK = null;
  if (opts.parents && hops >= 0) {
    const par = opts.parents;
    const adj = Array.from({ length: nB }, () => []);
    for (let b = 0; b < nB; b++) if (par[b] >= 0) {
      adj[b].push(par[b]);
      adj[par[b]].push(b);
    }
    hopOK = new Uint8Array(nB * nB);
    const dist = new Int32Array(nB);
    for (let a = 0; a < nB; a++) {
      dist.fill(-1);
      dist[a] = 0;
      const q = [a];
      for (let qi = 0; qi < q.length; qi++) {
        const u = q[qi];
        if (dist[u] >= hops) continue;
        for (const w of adj[u]) if (dist[w] < 0) {
          dist[w] = dist[u] + 1;
          q.push(w);
        }
      }
      for (let b = 0; b < nB; b++) if (dist[b] >= 0) hopOK[a * nB + b] = 1;
    }
  }

  const cells = bucketByCell(positions, nVerts, cellSize);
  const nc = cells.nc;
  const Dc = primDistToCells(prims, cells, sel);
  const nBones = Object.keys(boneIndex).length;
  const wB = new Float64Array(nBones);
  const touched = new Int32Array(nBones);
  const cand = new Int32Array(np);
  let D = new Float32Array(1024);
  const half = cells.half * 1.2;
  const invS = 1 / sigma;

  for (let c = 0; c < nc; c++) {
    // minimum w środku komórki
    let dminC = Infinity;
    for (let p = 0; p < np; p++) {
      if (!sel[p]) continue;
      const d = Math.abs(Dc[p * nc + c]) + prims.skinBias[p];
      if (d < dminC) dminC = d;
    }
    let m = 0;
    const lim = dminC + 2 * half + range;
    for (let p = 0; p < np; p++) {
      if (!sel[p]) continue;
      if (Math.abs(Dc[p * nc + c]) + prims.skinBias[p] <= lim) cand[m++] = p;
    }
    const s0 = cells.start[c], s1 = cells.start[c + 1];
    for (let a = s0; a < s1; a += MAXB) {
      const cnt = Math.min(MAXB, s1 - a);
      for (let t = 0; t < cnt; t++) {
        const v = cells.order[a + t];
        BX[t] = positions[v * 3]; BY[t] = positions[v * 3 + 1]; BZ[t] = positions[v * 3 + 2];
      }
      if (D.length < m * cnt) D = new Float32Array(m * cnt);
      for (let q = 0; q < m; q++) {
        const p = cand[q];
        primDistBatch(prims, p, BX, BY, BZ, cnt, BD);
        const bias = prims.skinBias[p];
        const o = q * cnt;
        for (let t = 0; t < cnt; t++) D[o + t] = Math.abs(BD[t]) + bias;
      }
      for (let t = 0; t < cnt; t++) {
        let dmin = Infinity;
        let qBest = 0;
        for (let q = 0; q < m; q++) {
          const d = D[q * cnt + t];
          if (d < dmin) {
            dmin = d;
            qBest = q;
          }
        }
        const rowOK = hopOK ? pBone[cand[qBest]] * nB : -1;
        let nt = 0;
        for (let q = 0; q < m; q++) {
          const x = (D[q * cnt + t] - dmin) * invS;
          if (x > 12) continue;
          const bi = pBone[cand[q]];
          if (rowOK >= 0 && !hopOK[rowOK + bi]) continue;
          if (wB[bi] === 0) touched[nt++] = bi;
          wB[bi] += Math.exp(-x);
        }
        // 4 największe
        const v = cells.order[a + t];
        let i0 = -1, i1 = -1, i2 = -1, i3 = -1;
        let w0 = 0, w1 = 0, w2 = 0, w3 = 0;
        for (let q = 0; q < nt; q++) {
          const bi = touched[q];
          const w = wB[bi];
          wB[bi] = 0;
          if (w > w0) {
            i3 = i2; w3 = w2; i2 = i1; w2 = w1; i1 = i0; w1 = w0; i0 = bi; w0 = w;
          } else if (w > w1) {
            i3 = i2; w3 = w2; i2 = i1; w2 = w1; i1 = bi; w1 = w;
          } else if (w > w2) {
            i3 = i2; w3 = w2; i2 = bi; w2 = w;
          } else if (w > w3) {
            i3 = bi; w3 = w;
          }
        }
        const sum = w0 + w1 + w2 + w3;
        const inv = sum > 0 ? 1 / sum : 0;
        const o = v * 4;
        si[o] = i0 < 0 ? 0 : i0; sw[o] = i0 < 0 ? 1 : w0 * inv;
        si[o + 1] = i1 < 0 ? 0 : i1; sw[o + 1] = w1 * inv;
        si[o + 2] = i2 < 0 ? 0 : i2; sw[o + 2] = w2 * inv;
        si[o + 3] = i3 < 0 ? 0 : i3; sw[o + 3] = w3 * inv;
      }
    }
  }
  return { skinIndex: si, skinWeight: sw };
}

const IDENTITY = new THREE.Matrix4();

/** SkinnedMesh związany z wspólnym szkieletem (bind z macierzą jednostkową). */
export function createSkinnedMesh(geometry, material, skel) {
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.bind(skel.skeleton || skel, IDENTITY);
  return mesh;
}

/**
 * Przypina obiekt do kości. Domyślnie bierze obecną (bind pose) transformację obiektu jako
 * pozycję w świecie postaci; `bindWorldMatrix` pozwala ją podać jawnie.
 * skelOrBind: wynik buildSkeleton() (do odczytu bind pose kości).
 */
export function attachToBone(object, boneName, skel, bindWorldMatrix = null) {
  const bone = skel.byName[boneName];
  if (!bone) throw new Error(`sculpt: nieznana kość "${boneName}"`);
  const b = skel.bind[boneName];
  const W = bindWorldMatrix ? bindWorldMatrix.clone() : new THREE.Matrix4().compose(object.position, object.quaternion, object.scale);
  const boneW = new THREE.Matrix4().compose(b.pos, b.quat, new THREE.Vector3(1, 1, 1));
  const L = boneW.invert().multiply(W);
  L.decompose(object.position, object.quaternion, object.scale);
  bone.add(object);
  return object;
}
