/**
 * sculpt/ao.js — okluzja otoczenia per wierzchołek z GLOBALNEGO SDF (wszystkie warstwy razem),
 * ukrywanie zasłoniętej geometrii i malowanie kolorem (op 'paint').
 *
 * computeAO(targets, fields, opts) → Float32Array[] (po jednej tablicy 0..1 na cel)
 *   targets: [{ positions: Float32Array(3V), normals: Float32Array(3V), nVerts }]
 *   fields:  pola z compileField() tworzące globalne SDF = min(pole_i); albo { near, far, nearMax } —
 *            próbki h ≤ nearMax liczone na polach `near` (ich margines odcinania musi być ≥ nearMax),
 *            pozostałe na `far` (margines ≥ radius). Pole z marginesem m daje dokładne min(d, m).
 *   opts: {
 *     radius   = 0.08   najdalsza próbka wzdłuż normalnej (m)
 *     start    = 0.006  najbliższa próbka (m) — powyżej szumu siatki
 *     samples  = 5      liczba próbek (rozkład gęstszy przy powierzchni, wykładnik 1.5)
 *     strength = 1.0    siła (ao = 1 - strength * occ)
 *     falloff  = 0.8    waga kolejnych próbek (w_i = falloff^i)
 *     min      = 0.15   dolne ograniczenie wyniku
 *     power    = 1.0    krzywa (ao^power)
 *     gradient = null | { y0, y1, bottom } — pionowy gradient: mnożnik `bottom` przy y ≤ y0, 1 przy y ≥ y1
 *   }
 *   Klasyczne SDF AO: occ = Σ w_i · clamp((h_i − d(p + n·h_i)) / h_i, 0, 1) / Σ w_i.
 *   Pola powinny mieć `pad` ≥ radius (compileField), żeby próbki obok warstwy były liczone dokładnie.
 *
 * cullHidden(mesh, fields, depth = 0.003) → nowa siatka bez trójkątów, których WSZYSTKIE
 *   wierzchołki leżą głębiej niż `depth` wewnątrz min(fields) (np. ciało pod koszulą).
 *
 * computePaint(positions, nVerts, paints, base = [1,1,1], cell = 0.05) → Float32Array(3V)
 *   paints: tablica z packPrims() (pole.paints); kolejne prymitywy nakładane po kolei:
 *   t = strength · (1 − smoothstep(−soft, soft, d)); kolor = mix(kolor, color_p, t).
 */
import { BIG, MAXB, evalPoints, bucketByCell, primDistToCells, primDistBatch } from './sdf.js';

export function computeAO(targets, fields, opts = {}) {
  const radius = opts.radius ?? 0.08;
  const start = opts.start ?? 0.006;
  const NS = Math.max(1, opts.samples ?? 5);
  const strength = opts.strength ?? 1;
  const falloff = opts.falloff ?? 0.8;
  const minAO = opts.min ?? 0.15;
  const power = opts.power ?? 1;
  const grad = opts.gradient || null;

  let V = 0;
  for (const t of targets) V += t.nVerts;
  const n = V * NS;
  const X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n);
  const D = new Float32Array(n).fill(BIG);
  const hs = new Float32Array(NS);
  const ws = new Float32Array(NS);
  let wsum = 0;
  for (let s = 0; s < NS; s++) {
    hs[s] = NS === 1 ? radius : start + (radius - start) * Math.pow(s / (NS - 1), 1.5);
    ws[s] = Math.pow(falloff, s);
    wsum += ws[s];
  }
  let o = 0;
  for (const t of targets) {
    const P = t.positions, N = t.normals;
    for (let v = 0; v < t.nVerts; v++) {
      const px = P[v * 3], py = P[v * 3 + 1], pz = P[v * 3 + 2];
      const nx = N[v * 3], ny = N[v * 3 + 1], nz = N[v * 3 + 2];
      for (let s = 0; s < NS; s++) {
        const h = hs[s];
        X[o] = px + nx * h; Y[o] = py + ny * h; Z[o] = pz + nz * h;
        o++;
      }
    }
  }
  // pola: tablica (wszystkie próbki) albo { near: [...], far: [...], nearMax } — próbki h ≤ nearMax
  // liczone na polach `near` (mniejszy margines odcinania → krótsze programy bloków)
  if (Array.isArray(fields)) {
    for (const F of fields) evalPoints(F, X, Y, Z, n, D, { min: true });
  } else {
    let nNear = 0;
    while (nNear < NS && hs[nNear] <= fields.nearMax) nNear++;
    for (const tier of [0, 1]) {
      const s0 = tier === 0 ? 0 : nNear, s1 = tier === 0 ? nNear : NS;
      const ns = s1 - s0;
      if (ns <= 0) continue;
      const m = V * ns;
      const tx = new Float32Array(m), ty = new Float32Array(m), tz = new Float32Array(m), td = new Float32Array(m).fill(BIG);
      for (let v = 0, q = 0; v < V; v++) {
        for (let s = s0; s < s1; s++, q++) {
          const j = v * NS + s;
          tx[q] = X[j]; ty[q] = Y[j]; tz[q] = Z[j];
        }
      }
      for (const F of tier === 0 ? fields.near : fields.far) evalPoints(F, tx, ty, tz, m, td, { min: true });
      for (let v = 0, q = 0; v < V; v++) for (let s = s0; s < s1; s++, q++) D[v * NS + s] = td[q];
    }
  }

  const res = [];
  o = 0;
  for (const t of targets) {
    const ao = new Float32Array(t.nVerts);
    const P = t.positions;
    for (let v = 0; v < t.nVerts; v++) {
      let occ = 0;
      for (let s = 0; s < NS; s++) {
        const h = hs[s];
        let c = (h - D[o++]) / h;
        c = c < 0 ? 0 : c > 1 ? 1 : c;
        occ += ws[s] * c;
      }
      let a = 1 - (strength * occ) / wsum;
      if (power !== 1) a = Math.pow(Math.max(0, a), power);
      if (grad) {
        const y = P[v * 3 + 1];
        let u = (y - grad.y0) / (grad.y1 - grad.y0);
        u = u < 0 ? 0 : u > 1 ? 1 : u;
        u = u * u * (3 - 2 * u);
        a *= grad.bottom + (1 - grad.bottom) * u;
      }
      ao[v] = a < minAO ? minAO : a > 1 ? 1 : a;
    }
    res.push(ao);
  }
  return res;
}

/** Usuwa trójkąty całkowicie schowane wewnątrz innych warstw. Zwraca nowy obiekt siatki (jak z meshField). */
export function cullHidden(mesh, fields, depth = 0.003) {
  const n = mesh.nVerts;
  if (!fields.length || !n) return mesh;
  const P = mesh.positions;
  const X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    X[i] = P[i * 3]; Y[i] = P[i * 3 + 1]; Z[i] = P[i * 3 + 2];
  }
  const D = new Float32Array(n).fill(BIG);
  // pola: tablica (wszystkie próbki) albo { near: [...], far: [...], nearMax } — próbki h ≤ nearMax
  // liczone na polach `near` (mniejszy margines odcinania → krótsze programy bloków)
  if (Array.isArray(fields)) {
    for (const F of fields) evalPoints(F, X, Y, Z, n, D, { min: true });
  } else {
    let nNear = 0;
    while (nNear < NS && hs[nNear] <= fields.nearMax) nNear++;
    for (const tier of [0, 1]) {
      const s0 = tier === 0 ? 0 : nNear, s1 = tier === 0 ? nNear : NS;
      const ns = s1 - s0;
      if (ns <= 0) continue;
      const m = V * ns;
      const tx = new Float32Array(m), ty = new Float32Array(m), tz = new Float32Array(m), td = new Float32Array(m).fill(BIG);
      for (let v = 0, q = 0; v < V; v++) {
        for (let s = s0; s < s1; s++, q++) {
          const j = v * NS + s;
          tx[q] = X[j]; ty[q] = Y[j]; tz[q] = Z[j];
        }
      }
      for (const F of tier === 0 ? fields.near : fields.far) evalPoints(F, tx, ty, tz, m, td, { min: true });
      for (let v = 0, q = 0; v < V; v++) for (let s = s0; s < s1; s++, q++) D[v * NS + s] = td[q];
    }
  }
  const hidden = new Uint8Array(n);
  let any = 0;
  for (let i = 0; i < n; i++) if (D[i] < -depth) {
    hidden[i] = 1;
    any++;
  }
  if (!any) return mesh;
  const I = mesh.indices;
  const keepT = [];
  const used = new Uint8Array(n);
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2];
    if (hidden[a] && hidden[b] && hidden[c]) continue;
    keepT.push(t);
    used[a] = used[b] = used[c] = 1;
  }
  const remap = new Int32Array(n).fill(-1);
  let nv = 0;
  for (let i = 0; i < n; i++) if (used[i]) remap[i] = nv++;
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), vb = new Int32Array(nv);
  for (let i = 0; i < n; i++) {
    const r = remap[i];
    if (r < 0) continue;
    pos[r * 3] = P[i * 3]; pos[r * 3 + 1] = P[i * 3 + 1]; pos[r * 3 + 2] = P[i * 3 + 2];
    nor[r * 3] = mesh.normals[i * 3]; nor[r * 3 + 1] = mesh.normals[i * 3 + 1]; nor[r * 3 + 2] = mesh.normals[i * 3 + 2];
    vb[r] = mesh.vertBlock[i];
  }
  const idx = new Uint32Array(keepT.length * 3);
  keepT.forEach((t, j) => {
    idx[j * 3] = remap[I[t]];
    idx[j * 3 + 1] = remap[I[t + 1]];
    idx[j * 3 + 2] = remap[I[t + 2]];
  });
  return { ...mesh, positions: pos, normals: nor, indices: idx, vertBlock: vb, nVerts: nv, nTris: keepT.length, culledTris: I.length / 3 - keepT.length };
}

const BX = new Float32Array(MAXB), BY = new Float32Array(MAXB), BZ = new Float32Array(MAXB), BD = new Float32Array(MAXB);

/** Kolory z prymitywów 'paint' (liniowe RGB). */
export function computePaint(positions, nVerts, paints, base = [1, 1, 1], cell = 0.05) {
  const col = new Float32Array(nVerts * 3);
  for (let v = 0; v < nVerts; v++) {
    col[v * 3] = base[0]; col[v * 3 + 1] = base[1]; col[v * 3 + 2] = base[2];
  }
  if (!paints || paints.n === 0 || nVerts === 0) return col;
  const cells = bucketByCell(positions, nVerts, cell);
  const Dc = primDistToCells(paints, cells);
  const nc = cells.nc;
  const cand = new Int32Array(paints.n);
  for (let c = 0; c < nc; c++) {
    let m = 0;
    for (let p = 0; p < paints.n; p++) {
      if (Dc[p * nc + c] - cells.half * 1.2 < paints.soft[p]) cand[m++] = p;
    }
    if (!m) continue;
    const s0 = cells.start[c], s1 = cells.start[c + 1];
    for (let a = s0; a < s1; a += MAXB) {
      const cnt = Math.min(MAXB, s1 - a);
      for (let t = 0; t < cnt; t++) {
        const v = cells.order[a + t];
        BX[t] = positions[v * 3]; BY[t] = positions[v * 3 + 1]; BZ[t] = positions[v * 3 + 2];
      }
      for (let q = 0; q < m; q++) {
        const p = cand[q];
        primDistBatch(paints, p, BX, BY, BZ, cnt, BD);
        const soft = paints.soft[p], st = paints.strength[p];
        const r = paints.color[p * 3], g = paints.color[p * 3 + 1], b = paints.color[p * 3 + 2];
        for (let t = 0; t < cnt; t++) {
          let u = (BD[t] + soft) / (2 * soft);
          if (u >= 1) continue;
          u = u < 0 ? 0 : u;
          const w = st * (1 - u * u * (3 - 2 * u));
          const v = cells.order[a + t] * 3;
          col[v] += (r - col[v]) * w;
          col[v + 1] += (g - col[v + 1]) * w;
          col[v + 2] += (b - col[v + 2]) * w;
        }
      }
    }
  }
  return col;
}
