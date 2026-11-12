/**
 * sculpt/mesher.js — Surface Nets nad skompilowanym polem SDF (z sdf.js).
 *
 * meshField(field, opts) → {
 *   positions: Float32Array(3V), normals: Float32Array(3V), indices: Uint32Array(3T),
 *   vertBlock: Int32Array(V)  — indeks bloku pola, w którym powstał wierzchołek (do dalszych wsadów),
 *   nVerts, nTris, stats: { ms, phases: {field, topology, relax, normals}, evals, activeSubBlocks, skippedSubBlocks, grid }
 * }
 *
 * Algorytm:
 *  1. Dla każdego niepustego bloku (blockCells³) liczymy SDF w środkach pod-bloków 4³; jeśli
 *     |d| > (półprzekątna + 1.8 woksela) * lipschitz, pod-blok nie zawiera powierzchni → wypełniamy znakiem.
 *     W przeciwnym razie liczymy wszystkie jego narożniki (wsadowo, programem bloku).
 *  2. Surface Nets: wierzchołek w każdej komórce ze zmianą znaku = średnia przecięć krawędzi;
 *     czworokąty dla krawędzi ze zmianą znaku, dzielone wzdłuż krótszej przekątnej.
 *     Nawinięcie CCW patrząc z zewnątrz (zgodne z THREE.FrontSide).
 *  3. Opcjonalna relaksacja Laplace'a (relax iteracji, współczynnik relaxFactor).
 *  4. Rzut wierzchołków na powierzchnię (krok Newtona, ≤ 1 woksel, pomijany gdy |∇f| ∉ [0.6, 1.6])
 *     i normalne z gradientu SDF (różnice centralne na czworościanie, 4 próbki, krok normalEps * voxel).
 *     Gdy normalna gradientu odbiega od normalnej ścian siatki (dot < minNormalDot), bierzemy normalną
 *     ścian i nie przesuwamy wierzchołka (odporność na grzbiety SDF w cienkich ściankach).
 *
 * UWAGA: ścianki cieńsze niż ~2 woksele (skorupy `shell`, płaskie elementy) dają artefakty topologii
 * Surface Nets (dziury, "piegi"). Trzymaj grubość ≥ 2–2.5 × voxel albo zmniejsz voxel tej warstwy.
 *
 * opts: { relax = 1, relaxFactor = 0.5, project = true, normalEps = 0.15 (w wokselach),
 *         lipschitz = 1.25 (zapas dla nie-dokładnych SDF, np. elipsoid / skali), refineNormals = false,
 *         minNormalDot = 0.3 }
 */
import { BIG, MAXB, evalBlock } from './sdf.js';

const S = 4; // krawędź pod-bloku w komórkach

// bufory wielokrotnego użytku (rosną w razie potrzeby)
const cache = {};
function buf(name, n, Type, init) {
  let b = cache[name];
  if (!b || b.length < n) {
    b = new Type(Math.max(n, Math.ceil((b ? b.length : 0) * 1.25)));
    if (init !== undefined) b.fill(init);
    cache[name] = b;
  }
  return b;
}

const PX = new Float32Array(MAXB);
const PY = new Float32Array(MAXB);
const PZ = new Float32Array(MAXB);
const PO = new Float32Array(MAXB);
const PI = new Int32Array(MAXB);
const DC = new Float32Array(MAXB);

// 12 krawędzi komórki (pary narożników, narożnik c = dx + 2dy + 4dz)
const EDGES = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 0, 2, 1, 3, 4, 6, 5, 7, 0, 4, 1, 5, 2, 6, 3, 7]);

// ---------------------------------------------------------------------------
// 1. pole na siatce narożników (tylko pod-bloki przy powierzchni)
// ---------------------------------------------------------------------------
function evalGrid(F, grid, act, lip, counters) {
  const h = F.h, B = F.B, nPad = F.nPad;
  const nx = F.nx, ny = F.ny, nz = F.nz, nxy = nx * ny;
  const mox = F.mox, moy = F.moy, moz = F.moz;
  const mbx = Math.ceil(nx / B), mby = Math.ceil(ny / B), mbz = Math.ceil(nz / B);
  const SB = B / S;
  const nbx = F.nbx, nby = F.nby;
  const subI = new Int32Array(SB * SB * SB * 6);
  let nAct = 0;
  let evals = 0;
  let skipped = 0;
  for (let bz = 0; bz < mbz; bz++) {
    for (let by = 0; by < mby; by++) {
      for (let bx = 0; bx < mbx; bx++) {
        const fb = bx + nPad + nbx * (by + nPad + nby * (bz + nPad));
        if (F.progLen[fb] === 0) continue;
        let m = 0;
        for (let sz = 0; sz < SB; sz++) {
          const k0 = bz * B + sz * S;
          if (k0 >= nz) break;
          const ck = Math.min(S, nz - k0);
          for (let sy = 0; sy < SB; sy++) {
            const j0 = by * B + sy * S;
            if (j0 >= ny) break;
            const cj = Math.min(S, ny - j0);
            for (let sx = 0; sx < SB; sx++) {
              const i0 = bx * B + sx * S;
              if (i0 >= nx) break;
              const ci = Math.min(S, nx - i0);
              const o = m * 6;
              subI[o] = i0; subI[o + 1] = j0; subI[o + 2] = k0;
              subI[o + 3] = ci; subI[o + 4] = cj; subI[o + 5] = ck;
              PX[m] = mox + (i0 + (ci - 1) * 0.5) * h;
              PY[m] = moy + (j0 + (cj - 1) * 0.5) * h;
              PZ[m] = moz + (k0 + (ck - 1) * 0.5) * h;
              m++;
            }
          }
        }
        evalBlock(F, fb, PX, PY, PZ, m, DC);
        evals += m;
        let cnt = 0;
        for (let q = 0; q < m; q++) {
          const o = q * 6;
          const i0 = subI[o], j0 = subI[o + 1], k0 = subI[o + 2];
          const ci = subI[o + 3], cj = subI[o + 4], ck = subI[o + 5];
          const hd = Math.sqrt((ci - 1) * (ci - 1) + (cj - 1) * (cj - 1) + (ck - 1) * (ck - 1)) * 0.5 * h;
          const R = (hd + 1.8 * h) * lip;
          const d = DC[q];
          if (d > R || d < -R) {
            skipped++;
            if (d < 0) fillSub(grid, nx, nxy, i0, j0, k0, ci, cj, ck, d);
            continue;
          }
          act[nAct * 4] = i0; act[nAct * 4 + 1] = j0; act[nAct * 4 + 2] = k0; act[nAct * 4 + 3] = fb;
          nAct++;
          if (cnt + ci * cj * ck > MAXB) {
            evals += flushCorners(F, fb, grid, cnt);
            cnt = 0;
          }
          cnt = pushCorners(cnt, mox, moy, moz, h, nx, nxy, i0, j0, k0, ci, cj, ck);
        }
        if (cnt) evals += flushCorners(F, fb, grid, cnt);
      }
    }
  }
  counters.evals += evals;
  counters.skipped += skipped;
  return nAct;
}

function fillSub(grid, nx, nxy, i0, j0, k0, ci, cj, ck, d) {
  for (let k = k0; k < k0 + ck; k++)
    for (let j = j0; j < j0 + cj; j++) {
      const row = j * nx + k * nxy;
      for (let i = i0; i < i0 + ci; i++) grid[row + i] = d;
    }
}

function pushCorners(cnt, mox, moy, moz, h, nx, nxy, i0, j0, k0, ci, cj, ck) {
  for (let k = k0; k < k0 + ck; k++) {
    const z = moz + k * h;
    for (let j = j0; j < j0 + cj; j++) {
      const y = moy + j * h;
      const row = j * nx + k * nxy;
      for (let i = i0; i < i0 + ci; i++) {
        PX[cnt] = mox + i * h; PY[cnt] = y; PZ[cnt] = z; PI[cnt] = row + i;
        cnt++;
      }
    }
  }
  return cnt;
}

function flushCorners(F, fb, grid, cnt) {
  evalBlock(F, fb, PX, PY, PZ, cnt, PO);
  for (let t = 0; t < cnt; t++) grid[PI[t]] = PO[t];
  return cnt;
}

// ---------------------------------------------------------------------------
// 2. wierzchołki Surface Nets
// ---------------------------------------------------------------------------
function makeVertices(F, grid, cellVert, act, nSub, P, vcell, vmask, vblock) {
  const h = F.h, nx = F.nx, ny = F.ny, nz = F.nz, nxy = nx * ny;
  const mox = F.mox, moy = F.moy, moz = F.moz;
  const o1 = 1, o2 = nx, o3 = nx + 1, o4 = nxy, o5 = nxy + 1, o6 = nxy + nx, o7 = nxy + nx + 1;
  const v = new Float64Array(8);
  let nV = 0;
  for (let s = 0; s < nSub; s++) {
    const i0 = act[s * 4], j0 = act[s * 4 + 1], k0 = act[s * 4 + 2], fb = act[s * 4 + 3];
    const i1 = Math.min(i0 + S, nx - 1), j1 = Math.min(j0 + S, ny - 1), k1 = Math.min(k0 + S, nz - 1);
    for (let k = k0; k < k1; k++) {
      for (let j = j0; j < j1; j++) {
        let c = i0 + j * nx + k * nxy;
        for (let i = i0; i < i1; i++, c++) {
          const v0 = grid[c], v1 = grid[c + o1], v2 = grid[c + o2], v3 = grid[c + o3];
          const v4 = grid[c + o4], v5 = grid[c + o5], v6 = grid[c + o6], v7 = grid[c + o7];
          const mask = (v0 < 0 ? 1 : 0) | (v1 < 0 ? 2 : 0) | (v2 < 0 ? 4 : 0) | (v3 < 0 ? 8 : 0) |
            (v4 < 0 ? 16 : 0) | (v5 < 0 ? 32 : 0) | (v6 < 0 ? 64 : 0) | (v7 < 0 ? 128 : 0);
          if (mask === 0 || mask === 255) continue;
          v[0] = v0; v[1] = v1; v[2] = v2; v[3] = v3; v[4] = v4; v[5] = v5; v[6] = v6; v[7] = v7;
          let sx = 0, sy = 0, sz = 0, ne = 0;
          for (let e = 0; e < 24; e += 2) {
            const a = EDGES[e], b = EDGES[e + 1];
            if (((mask >> a) & 1) === ((mask >> b) & 1)) continue;
            const va = v[a];
            const t = va / (va - v[b]);
            const ax = a & 1, ay = (a >> 1) & 1, az = (a >> 2) & 1;
            sx += ax + ((b & 1) - ax) * t;
            sy += ay + (((b >> 1) & 1) - ay) * t;
            sz += az + (((b >> 2) & 1) - az) * t;
            ne++;
          }
          const inv = 1 / ne;
          P[nV * 3] = mox + (i + sx * inv) * h;
          P[nV * 3 + 1] = moy + (j + sy * inv) * h;
          P[nV * 3 + 2] = moz + (k + sz * inv) * h;
          vcell[nV] = c;
          vmask[nV] = mask;
          vblock[nV] = fb;
          cellVert[c] = nV;
          nV++;
        }
      }
    }
  }
  return nV;
}

// ---------------------------------------------------------------------------
// 3. czworokąty → trójkąty
// ---------------------------------------------------------------------------
function emitQuad(I, n, P, a, b, c, d) {
  if (a < 0 || b < 0 || c < 0 || d < 0) return n;
  const acx = P[a * 3] - P[c * 3], acy = P[a * 3 + 1] - P[c * 3 + 1], acz = P[a * 3 + 2] - P[c * 3 + 2];
  const bdx = P[b * 3] - P[d * 3], bdy = P[b * 3 + 1] - P[d * 3 + 1], bdz = P[b * 3 + 2] - P[d * 3 + 2];
  if (acx * acx + acy * acy + acz * acz <= bdx * bdx + bdy * bdy + bdz * bdz) {
    I[n] = a; I[n + 1] = b; I[n + 2] = c;
    I[n + 3] = a; I[n + 4] = c; I[n + 5] = d;
  } else {
    I[n] = a; I[n + 1] = b; I[n + 2] = d;
    I[n + 3] = b; I[n + 4] = c; I[n + 5] = d;
  }
  return n + 6;
}

function makeQuads(F, cellVert, nV, P, vcell, vmask, I) {
  const nx = F.nx, nxy = nx * F.ny;
  let n = 0;
  for (let id = 0; id < nV; id++) {
    const c = vcell[id];
    const mask = vmask[id];
    const k = (c / nxy) | 0;
    const rem = c - k * nxy;
    const j = (rem / nx) | 0;
    const i = rem - j * nx;
    const in0 = mask & 1;
    // krawędź X (narożniki 0-1): komórki (j-1..j, k-1..k)
    if (in0 !== ((mask >> 1) & 1) && j > 0 && k > 0) {
      const a = cellVert[c - nx - nxy], b = cellVert[c - nxy], d = cellVert[c - nx];
      n = in0 ? emitQuad(I, n, P, a, b, id, d) : emitQuad(I, n, P, d, id, b, a);
    }
    // krawędź Y (narożniki 0-2): komórki (k-1..k, i-1..i)
    if (in0 !== ((mask >> 2) & 1) && i > 0 && k > 0) {
      const a = cellVert[c - 1 - nxy], b = cellVert[c - 1], d = cellVert[c - nxy];
      n = in0 ? emitQuad(I, n, P, a, b, id, d) : emitQuad(I, n, P, d, id, b, a);
    }
    // krawędź Z (narożniki 0-4): komórki (i-1..i, j-1..j)
    if (in0 !== ((mask >> 4) & 1) && i > 0 && j > 0) {
      const a = cellVert[c - 1 - nx], b = cellVert[c - nx], d = cellVert[c - 1];
      n = in0 ? emitQuad(I, n, P, a, b, id, d) : emitQuad(I, n, P, d, id, b, a);
    }
  }
  return n;
}

// ---------------------------------------------------------------------------
// 4. relaksacja Laplace'a
// ---------------------------------------------------------------------------
function relaxPass(P, nV, I, nIdx, sum, cnt, f) {
  sum.fill(0, 0, nV * 3);
  cnt.fill(0, 0, nV);
  for (let t = 0; t < nIdx; t += 3) {
    const ia = I[t], ib = I[t + 1], ic = I[t + 2];
    const a = ia * 3, b = ib * 3, c = ic * 3;
    const ax = P[a], ay = P[a + 1], az = P[a + 2];
    const bx = P[b], by = P[b + 1], bz = P[b + 2];
    const cx = P[c], cy = P[c + 1], cz = P[c + 2];
    sum[a] += bx + cx; sum[a + 1] += by + cy; sum[a + 2] += bz + cz;
    sum[b] += ax + cx; sum[b + 1] += ay + cy; sum[b + 2] += az + cz;
    sum[c] += ax + bx; sum[c + 1] += ay + by; sum[c + 2] += az + bz;
    cnt[ia] += 2; cnt[ib] += 2; cnt[ic] += 2;
  }
  for (let i = 0; i < nV; i++) {
    const n = cnt[i];
    if (!n) continue;
    const inv = 1 / n, o = i * 3;
    P[o] += (sum[o] * inv - P[o]) * f;
    P[o + 1] += (sum[o + 1] * inv - P[o + 1]) * f;
    P[o + 2] += (sum[o + 2] * inv - P[o + 2]) * f;
  }
}

// ---------------------------------------------------------------------------
// 5. normalne ścian (ważone polem) — odniesienie zgodne z topologią
// ---------------------------------------------------------------------------
function faceNormals(P, nV, I, nIdx, FN) {
  FN.fill(0, 0, nV * 3);
  for (let t = 0; t < nIdx; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    FN[a] += nx; FN[a + 1] += ny; FN[a + 2] += nz;
    FN[b] += nx; FN[b + 1] += ny; FN[b + 2] += nz;
    FN[c] += nx; FN[c + 1] += ny; FN[c + 2] += nz;
  }
}

// ---------------------------------------------------------------------------
// 6. normalne z gradientu (+ rzut na powierzchnię)
// ---------------------------------------------------------------------------
function normalsPass(F, P, N, nV, vblock, eps, doProject, FN, minDot, counters) {
  const h = F.h;
  const i4e = 1 / (4 * eps);
  let evals = 0;
  let fixed = 0;
  let s = 0;
  while (s < nV) {
    const fb = vblock[s];
    let e = s + 1;
    while (e < nV && vblock[e] === fb && e - s < MAXB / 4) e++;
    const m = e - s;
    for (let q = 0; q < m; q++) {
      const p = (s + q) * 3;
      const x = P[p], y = P[p + 1], z = P[p + 2];
      const o = q * 4;
      PX[o] = x + eps; PY[o] = y - eps; PZ[o] = z - eps;
      PX[o + 1] = x - eps; PY[o + 1] = y - eps; PZ[o + 1] = z + eps;
      PX[o + 2] = x - eps; PY[o + 2] = y + eps; PZ[o + 2] = z - eps;
      PX[o + 3] = x + eps; PY[o + 3] = y + eps; PZ[o + 3] = z + eps;
    }
    evalBlock(F, fb, PX, PY, PZ, m * 4, PO);
    evals += m * 4;
    for (let q = 0; q < m; q++) {
      const o = q * 4;
      const f0 = PO[o], f1 = PO[o + 1], f2 = PO[o + 2], f3 = PO[o + 3];
      let gx = (f0 - f1 - f2 + f3) * i4e;
      let gy = (-f0 - f1 + f2 + f3) * i4e;
      let gz = (-f0 + f1 - f2 + f3) * i4e;
      const gl2 = gx * gx + gy * gy + gz * gz;
      const p = (s + q) * 3;
      // normalna ścian (topologia) jako odniesienie
      let fx = FN[p], fy = FN[p + 1], fz = FN[p + 2];
      const fl = Math.sqrt(fx * fx + fy * fy + fz * fz);
      if (fl > 0) { fx /= fl; fy /= fl; fz /= fl; }
      if (gl2 > 1e-14) {
        const gl = Math.sqrt(gl2);
        gx /= gl; gy /= gl; gz /= gl;
        if (fl > 0 && gx * fx + gy * fy + gz * fz < minDot) {
          // gradient niezgodny z siatką (grzbiet SDF w cienkiej ściance, ostra krawędź) → normalna ścian, bez rzutu
          N[p] = fx; N[p + 1] = fy; N[p + 2] = fz;
          fixed++;
          continue;
        }
        // |∇f| daleko od 1 → próbki przecięły grzbiet SDF (np. środek cienkiej skorupy) — nie przesuwaj
        if (doProject && gl > 0.6 && gl < 1.6) {
          let st = ((f0 + f1 + f2 + f3) * 0.25) / gl;
          if (st > h) st = h;
          else if (st < -h) st = -h;
          P[p] -= gx * st;
          P[p + 1] -= gy * st;
          P[p + 2] -= gz * st;
        }
      } else if (fl > 0) {
        gx = fx; gy = fy; gz = fz;
      } else {
        gx = 0; gy = 1; gz = 0;
      }
      N[p] = gx; N[p + 1] = gy; N[p + 2] = gz;
    }
    s = e;
  }
  counters.evals += evals;
  counters.fixed += fixed;
}

// ---------------------------------------------------------------------------

export function meshField(F, opts = {}) {
  const t0 = performance.now();
  const h = F.h;
  const nx = F.nx, ny = F.ny, nz = F.nz, nAll = nx * ny * nz;
  const relaxIters = opts.relax ?? 1;
  const relaxF = opts.relaxFactor ?? 0.5;
  const project = opts.project ?? true;
  const eps = (opts.normalEps ?? 0.15) * h;
  const lip = opts.lipschitz ?? 1.25;

  const grid = buf('grid', nAll, Float32Array);
  grid.fill(BIG, 0, nAll);
  // mapa komórka → wierzchołek; zawsze -1 poza bieżącym wywołaniem (sprzątamy tylko użyte wpisy)
  const cellVert = buf('cellVert', nAll, Int32Array, -1);

  // górne ograniczenie liczby aktywnych pod-bloków: wszystkie pod-bloki siatki
  const maxSub = Math.ceil(nx / S) * Math.ceil(ny / S) * Math.ceil(nz / S);
  const act = buf('act', maxSub * 4, Int32Array);
  const counters = { evals: 0, skipped: 0, fixed: 0 };
  const nSub = F.empty ? 0 : evalGrid(F, grid, act, lip, counters);
  const tEval = performance.now();

  // każda komórka aktywnego pod-bloku daje najwyżej 1 wierzchołek, a wierzchołek najwyżej 3 czworokąty
  const maxV = nSub * S * S * S;
  const P = buf('P', maxV * 3, Float32Array);
  const vcell = buf('vcell', maxV, Int32Array);
  const vmask = buf('vmask', maxV, Uint8Array);
  const vblock = buf('vblock', maxV, Int32Array);
  const nV = makeVertices(F, grid, cellVert, act, nSub, P, vcell, vmask, vblock);
  const I = buf('I', nV * 18 + 6, Uint32Array);
  const nIdx = makeQuads(F, cellVert, nV, P, vcell, vmask, I);
  for (let i = 0; i < nV; i++) cellVert[vcell[i]] = -1;
  const tTopo = performance.now();

  if (relaxIters > 0 && nV > 0) {
    const sum = buf('rsum', nV * 3, Float32Array);
    const cnt = buf('rcnt', nV, Uint16Array);
    for (let it = 0; it < relaxIters; it++) relaxPass(P, nV, I, nIdx, sum, cnt, relaxF);
  }
  const tRelax = performance.now();

  const N = new Float32Array(nV * 3);
  const FN = buf('FN', nV * 3, Float32Array);
  const minDot = opts.minNormalDot ?? 0.3;
  faceNormals(P, nV, I, nIdx, FN);
  normalsPass(F, P, N, nV, vblock, eps, project, FN, minDot, counters);
  if (project && opts.refineNormals) {
    counters.fixed = 0;
    faceNormals(P, nV, I, nIdx, FN);
    normalsPass(F, P, N, nV, vblock, eps, false, FN, minDot, counters);
  }

  return {
    positions: P.slice(0, nV * 3),
    normals: N,
    indices: I.slice(0, nIdx),
    vertBlock: vblock.slice(0, nV),
    nVerts: nV,
    nTris: nIdx / 3,
    stats: {
      ms: performance.now() - t0,
      phases: { field: tEval - t0, topology: tTopo - tEval, relax: tRelax - tTopo, normals: performance.now() - tRelax },
      evals: counters.evals,
      activeSubBlocks: nSub,
      skippedSubBlocks: counters.skipped,
      fixedNormals: counters.fixed,
      grid: [nx, ny, nz],
    },
  };
}
