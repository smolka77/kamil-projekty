import * as THREE from 'three';

/**
 * Biblioteka materiałów "stylized PBR" (jakość nowoczesnych gier battle-royale, bez konturów i cel-shadingu).
 *
 * Wszystko stoi na MeshPhysicalMaterial / MeshStandardMaterial + onBeforeCompile:
 *  - detale (splot tkaniny, pory skóry, ziarno skóry, rysy metalu…) mapowane TRIPLANARNIE
 *    z pozycji/normalnej w pozie spoczynkowej (bind pose, PRZED skinningiem) — tekstury nie "pływają"
 *    po animowanej postaci i nie potrzebują UV,
 *  - okluzja w atrybucie "color" (vertexColors: true): część przyciemnia albedo (światło bezpośrednie),
 *    całość tłumi światło otoczenia (diffuse IBL/hemisfera) i odbicia nieba (specular occlusion),
 *  - delikatna globalna poświata krawędzi (rim/fresnel) dla czytelnej sylwetki na tle nieba,
 *  - skóra: miękkie "zawinięte" światło z czerwonawym rozproszeniem na granicy cienia + sheen,
 *  - włosy: anizotropowe pasmo połysku (Kajiya-Kay, 2 płaty) wzdłuż kierunku czesania,
 *  - oko: proceduralna tęczówka rzutowana wzdłuż osi -Z siatki, mokra warstwa clearcoat, blik.
 *
 * Każdy materiał ma działające .emissive (błysk trafienia) i przyjmuje {vertexColors:true}.
 * Tekstury proceduralne generują się leniwie raz i są współdzielone (cache).
 */

// =====================================================================================
//  Szum proceduralny (okresowy → tekstury bez szwów). Kraty gradientów liczone raz i cache'owane,
//  próbkowanie przez domknięcia (szybkie pętle po pikselach).
// =====================================================================================

function hashI(x, y, s) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul((s | 0) + 0x3c6ef372, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const mod = (a, n) => ((a % n) + n) % n;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const _lattices = new Map();
function lattice(px, py, s) {
  const key = `${px}|${py}|${s}`;
  let L = _lattices.get(key);
  if (L) return L;
  const gx = new Float32Array(px * py);
  const gy = new Float32Array(px * py);
  for (let y = 0; y < py; y++)
    for (let x = 0; x < px; x++) {
      const a = hashI(x, y, s) * 6.283185307;
      gx[y * px + x] = Math.cos(a);
      gy[y * px + x] = Math.sin(a);
    }
  L = { gx, gy };
  _lattices.set(key, L);
  return L;
}

/** Sampler okresowego szumu gradientowego (Perlin) o okresach px, py; wynik ~[-1, 1]. */
function gn(px, py, s) {
  const { gx, gy } = lattice(px, py, s);
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    let x0 = xi % px;
    if (x0 < 0) x0 += px;
    let y0 = yi % py;
    if (y0 < 0) y0 += py;
    const x1 = x0 + 1 === px ? 0 : x0 + 1;
    const y1 = y0 + 1 === py ? 0 : y0 + 1;
    const i00 = y0 * px + x0;
    const i10 = y0 * px + x1;
    const i01 = y1 * px + x0;
    const i11 = y1 * px + x1;
    const n00 = gx[i00] * xf + gy[i00] * yf;
    const n10 = gx[i10] * (xf - 1) + gy[i10] * yf;
    const n01 = gx[i01] * xf + gy[i01] * (yf - 1);
    const n11 = gx[i11] * (xf - 1) + gy[i11] * (yf - 1);
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    return (n00 + (n10 - n00) * u + (n01 - n00) * v + (n00 - n10 - n01 + n11) * u * v) * 1.414;
  };
}

/** Sampler fBm na współrzędnych kafla u,v ∈ [0,1); fu, fv — częstotliwości bazowe (całkowite). Wynik ~[-1,1]. */
function fbmF(fu, fv, oct, s, gain = 0.5) {
  const ns = [];
  const fx = [];
  const fy = [];
  const amps = [];
  let amp = 1;
  let norm = 0;
  for (let o = 0; o < oct; o++) {
    const a = fu << o;
    const b = fv << o;
    ns.push(gn(a, b, s + o * 101));
    fx.push(a);
    fy.push(b);
    amps.push(amp);
    norm += amp;
    amp *= gain;
  }
  for (let o = 0; o < oct; o++) amps[o] /= norm;
  return (u, v) => {
    let sum = 0;
    for (let o = 0; o < oct; o++) sum += amps[o] * ns[o](u * fx[o], v * fy[o]);
    return sum;
  };
}

/** Sampler okresowego szumu komórkowego (Worley): zwraca współdzieloną tablicę [F1, F2, hash komórki]. */
function worleyF(n, s, jitter = 0.9) {
  const px = new Float32Array(n * n);
  const py = new Float32Array(n * n);
  const id = new Float32Array(n * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      px[i] = 0.5 + (hashI(x, y, s) - 0.5) * jitter;
      py[i] = 0.5 + (hashI(x, y, s + 1) - 0.5) * jitter;
      id[i] = hashI(x, y, s + 2);
    }
  const out = [0, 0, 0];
  return (u, v) => {
    const x = u * n;
    const y = v * n;
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    let f1 = 9;
    let f2 = 9;
    let cid = 0;
    for (let j = -1; j <= 1; j++) {
      const cy = yi + j;
      let wy = cy % n;
      if (wy < 0) wy += n;
      for (let i = -1; i <= 1; i++) {
        const cx = xi + i;
        let wx = cx % n;
        if (wx < 0) wx += n;
        const k = wy * n + wx;
        const dx = cx + px[k] - x;
        const dy = cy + py[k] - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < f1) {
          f2 = f1;
          f1 = d;
          cid = id[k];
        } else if (d < f2) f2 = d;
      }
    }
    out[0] = f1;
    out[1] = f2;
    out[2] = cid;
    return out;
  };
}

// =====================================================================================
//  Tekstury detalu: RG = zaburzenie normalnej (styczne, 0.5 = płasko),
//                   B  = zmiana szorstkości (0.5 = bez zmian), A = zmiana albedo (0.5 = bez zmian)
// =====================================================================================

const DETAIL_SIZE = 256;

function packDetail(S, h, r, a, slope) {
  // skala nachylenia: 95. percentyl gradientu → `slope`
  const gx = new Float32Array(S * S);
  const gy = new Float32Array(S * S);
  const mags = [];
  for (let y = 0; y < S; y++) {
    const ym = ((y - 1 + S) % S) * S;
    const yp = ((y + 1) % S) * S;
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const dx = (h[y * S + ((x + 1) % S)] - h[y * S + ((x - 1 + S) % S)]) * 0.5;
      const dy = (h[yp + x] - h[ym + x]) * 0.5;
      gx[i] = dx;
      gy[i] = dy;
      if ((i & 7) === 0) mags.push(Math.hypot(dx, dy));
    }
  }
  mags.sort((p, q) => p - q);
  const p95 = mags[Math.floor(mags.length * 0.95)] || 1e-6;
  const k = slope / Math.max(p95, 1e-6);
  const data = new Uint8Array(S * S * 4);
  for (let i = 0; i < S * S; i++) {
    const nx = Math.max(-1, Math.min(1, -gx[i] * k));
    const ny = Math.max(-1, Math.min(1, -gy[i] * k));
    data[i * 4] = Math.round((nx * 0.5 + 0.5) * 255);
    data[i * 4 + 1] = Math.round((ny * 0.5 + 0.5) * 255);
    data[i * 4 + 2] = Math.round(clamp01(r[i]) * 255);
    data[i * 4 + 3] = Math.round(clamp01(a[i]) * 255);
  }
  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** Sampler splotu tkaniny. pattern: 'plain' | 'twill' (3/1, skośny jak dżins). */
function weaveF(n, pattern, s) {
  const nSlubA = gn(n / 4, n, s + 3);
  const nSlubB = gn(n / 4, n, s + 4);
  const nFibA = gn(n * 6, n * 3 / 2, s + 5);
  const nFibB = gn(n * 3 / 2, n * 6, s + 6);
  const w = 0.84;
  const prof = (x) => {
    const d = Math.abs(x - 0.5) / (0.5 * w);
    return d >= 1 ? 0 : Math.sqrt(1 - d * d);
  };
  const und = (t) => 0.38 + 0.62 * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.7);
  const out = { h: 0, top: 0, slub: 1, fib: 0, i: 0, j: 0 };
  return (u, v) => {
    const U = u * n;
    const V = v * n;
    const i = Math.floor(U);
    const j = Math.floor(V);
    const fu = U - i;
    const fv = V - j;
    let warpUp;
    let tWarp;
    const tWeft = fu;
    if (pattern === 'twill') {
      const k = mod(j - i, 4);
      warpUp = k !== 0;
      tWarp = warpUp ? (k - 1 + fv) / 3 : fv;
    } else {
      warpUp = ((i + j) & 1) === 0;
      tWarp = fv;
    }
    const slubWarp = 1 + 0.22 * nSlubA(V / 4, i);
    const slubWeft = 1 + 0.22 * nSlubB(U / 4, j);
    const fibWarp = nFibA(U * 6, V * 1.5);
    const fibWeft = nFibB(U * 1.5, V * 6);
    const pw = prof(fu);
    const pf = prof(fv);
    const warpH = pw * (warpUp ? und(tWarp) : 0.3) * slubWarp + fibWarp * 0.09 * pw;
    const weftH = pf * (!warpUp ? und(tWeft) : 0.3) * slubWeft + fibWeft * 0.09 * pf;
    out.top = warpH >= weftH ? 0 : 1;
    out.h = Math.max(warpH, weftH);
    out.slub = out.top === 0 ? slubWarp : slubWeft;
    out.fib = out.top === 0 ? fibWarp : fibWeft;
    out.i = i;
    out.j = j;
    return out;
  };
}

function forPixels(S, fn) {
  for (let y = 0; y < S; y++) {
    const v = y / S;
    for (let x = 0; x < S; x++) fn(x / S, v, y * S + x);
  }
}

const DETAIL_GEN = {
  cotton(S, h, r, a) {
    const W = weaveF(32, 'plain', 11);
    const n1 = fbmF(4, 4, 3, 19);
    forPixels(S, (u, v, i) => {
      const w = W(u, v);
      h[i] = w.h;
      r[i] = 0.5 + (0.55 - w.h) * 0.35 + w.fib * 0.08;
      a[i] = 0.5 + (w.h - 0.55) * 0.3 + (w.slub - 1) * 0.25 + n1(u, v) * 0.05;
    });
    return 0.55;
  },
  denim(S, h, r, a) {
    const W = weaveF(32, 'twill', 23);
    const nStreak = gn(32, 2, 29);
    forPixels(S, (u, v, i) => {
      const w = W(u, v);
      h[i] = w.h;
      r[i] = 0.5 + (0.55 - w.h) * 0.3 + w.fib * 0.06;
      // osnowa indygo (pionowe smugi), wątek biały
      const streak = nStreak(u * 32, v * 2) * 0.12 + (hashI(w.i, 0, 31) - 0.5) * 0.12;
      a[i] = w.top === 1 ? 0.86 + w.fib * 0.05 : 0.46 + streak + (w.h - 0.55) * 0.2;
    });
    return 0.6;
  },
  canvas(S, h, r, a) {
    const W = weaveF(24, 'plain', 37);
    const n1 = fbmF(16, 16, 2, 41);
    const n2 = fbmF(3, 3, 3, 43);
    forPixels(S, (u, v, i) => {
      const w = W(u, v);
      h[i] = w.h * 1.1 + n1(u, v) * 0.05;
      r[i] = 0.55 + (0.5 - w.h) * 0.3 + w.fib * 0.1;
      a[i] = 0.5 + (w.h - 0.55) * 0.35 + (w.slub - 1) * 0.35 + n2(u, v) * 0.06;
    });
    return 0.7;
  },
  knit(S, h, r, a) {
    const cols = 8;
    const rows = 12;
    const nFib = fbmF(64, 64, 2, 47);
    const nCol = fbmF(4, 4, 3, 53);
    forPixels(S, (u, v, i) => {
      const U = u * cols;
      const fu = U - Math.floor(U);
      const yy = v * rows + Math.abs(fu - 0.5) * 1.35;
      const s = yy - Math.floor(yy);
      let hh = Math.pow(Math.max(0, Math.sin(Math.PI * s)), 0.75);
      hh *= 0.55 + 0.45 * smooth(0.0, 0.14, Math.abs(fu - 0.5)); // rowek między "nóżkami" V
      hh *= 0.5 + 0.5 * smooth(0.0, 0.08, Math.min(fu, 1 - fu)); // rowek między kolumnami
      const twist = Math.sin((s * 3 + fu * 2.0) * Math.PI * 2) * 0.08;
      const fib = nFib(u, v) * 0.1;
      h[i] = hh + twist * hh + fib;
      r[i] = 0.55 + (0.5 - hh) * 0.25 + fib;
      a[i] = 0.5 + (hh - 0.5) * 0.35 + nCol(u, v) * 0.06;
    });
    return 0.75;
  },
  leather(S, h, r, a) {
    const Wo = worleyF(22, 61);
    const nWr = fbmF(4, 4, 3, 67);
    const nFine = fbmF(64, 64, 2, 71);
    const nCol = fbmF(8, 8, 3, 73);
    forPixels(S, (u, v, i) => {
      const [f1, f2, id] = Wo(u, v);
      const cell = smooth(0.02, 0.24, f2 - f1);
      const dome = 1 - Math.min(1, f1 * f1 * 1.6);
      const fine = nFine(u, v);
      h[i] = cell * 0.7 + dome * 0.22 * cell + fine * 0.06 + nWr(u, v) * 0.25;
      r[i] = 0.5 + (1 - cell) * 0.32 + (id - 0.5) * 0.12 + fine * 0.05;
      a[i] = 0.5 - (1 - cell) * 0.2 + nCol(u, v) * 0.1 + (id - 0.5) * 0.05;
    });
    return 0.55;
  },
  skin(S, h, r, a) {
    const Wo = worleyF(52, 79, 0.85);
    const nFine = fbmF(24, 24, 3, 83);
    const nLines = fbmF(4, 40, 2, 89);
    const nMot = fbmF(5, 5, 4, 97);
    const nMot2 = fbmF(20, 20, 2, 101);
    forPixels(S, (u, v, i) => {
      const f1 = Wo(u, v)[0];
      const pore = 1 - smooth(0.04, 0.2, f1);
      const fine = nFine(u, v);
      h[i] = -pore * 0.55 + fine * 0.3 + nLines(u, v) * 0.06;
      r[i] = 0.5 + pore * 0.22 + fine * 0.1;
      a[i] = 0.5 + nMot(u, v) * 0.16 + nMot2(u, v) * 0.06 - pore * 0.05;
    });
    return 0.35;
  },
  rubber(S, h, r, a) {
    const Wo = worleyF(36, 107);
    const nFine = fbmF(64, 64, 2, 109);
    const nCol = fbmF(6, 6, 3, 113);
    forPixels(S, (u, v, i) => {
      const bump = 1 - smooth(0.0, 0.55, Wo(u, v)[0]);
      const fine = nFine(u, v);
      h[i] = bump * 0.6 + fine * 0.2;
      r[i] = 0.5 + fine * 0.15 + (bump - 0.5) * 0.08;
      a[i] = 0.5 + nCol(u, v) * 0.07;
    });
    return 0.45;
  },
  plastic(S, h, r, a) {
    const n1 = fbmF(12, 12, 3, 127);
    const n2 = fbmF(5, 5, 3, 131);
    const n3 = fbmF(3, 3, 3, 137);
    forPixels(S, (u, v, i) => {
      h[i] = n1(u, v) * 0.5;
      r[i] = 0.5 + n2(u, v) * 0.14;
      a[i] = 0.5 + n3(u, v) * 0.05;
    });
    return 0.25;
  },
  brushed(S, h, r, a) {
    const scr = new Float32Array(S * S);
    // rysy: krótkie odcinki w losowych kierunkach (z zawijaniem)
    for (let n = 0; n < 140; n++) {
      const x0 = hashI(n, 1, 151) * S;
      const y0 = hashI(n, 2, 151) * S;
      const ang = hashI(n, 3, 151) * Math.PI;
      const len = 6 + hashI(n, 4, 151) * 40;
      const st = 0.35 + hashI(n, 5, 151) * 0.65;
      for (let t = 0; t < len; t += 0.5) {
        const px = mod(Math.round(x0 + Math.cos(ang) * t), S);
        const py = mod(Math.round(y0 + Math.sin(ang) * t), S);
        const k = py * S + px;
        scr[k] = Math.max(scr[k], st * (1 - Math.abs(t / len - 0.5) * 1.2));
      }
    }
    const nStreak = fbmF(2, 128, 3, 157);
    const nR = fbmF(4, 4, 3, 163);
    forPixels(S, (u, v, i) => {
      const streak = nStreak(u, v);
      h[i] = streak * 0.35 - scr[i] * 0.5;
      r[i] = 0.5 + streak * 0.16 - scr[i] * 0.22 + nR(u, v) * 0.1;
      a[i] = 0.5 + streak * 0.07 + scr[i] * 0.14;
    });
    return 0.4;
  },
  paint(S, h, r, a) {
    const Wo = worleyF(10, 171);
    const n1 = fbmF(10, 10, 3, 173);
    const n2 = fbmF(4, 4, 3, 179);
    const n3 = fbmF(3, 3, 3, 181);
    forPixels(S, (u, v, i) => {
      const [f1, , id] = Wo(u, v);
      const chip = id > 0.9 ? 1 - smooth(0.12, 0.3, f1) : 0;
      h[i] = n1(u, v) * 0.35 - chip * 0.5;
      r[i] = 0.5 + n2(u, v) * 0.12 + chip * 0.25;
      a[i] = 0.5 + n3(u, v) * 0.05 - chip * 0.12;
    });
    return 0.3;
  },
  hair(S, h, r, a) {
    const nWob = gn(3, 1, 191);
    const nStrand = fbmF(96, 3, 3, 193);
    const nClump = fbmF(10, 1, 3, 197);
    forPixels(S, (u, v, i) => {
      const xx = u + 0.025 * nWob(v * 3, 0.5);
      const strand = nStrand(xx, v);
      const clump = nClump(xx, v);
      h[i] = clump * 0.6 + strand * 0.45;
      r[i] = 0.5 + strand * 0.22 + clump * 0.1;
      a[i] = 0.5 + clump * 0.3 + strand * 0.16;
    });
    return 0.6;
  },
};

const _detailCache = new Map();
/** Współdzielona tekstura detalu danego rodzaju (generowana raz). */
export function getDetailTexture(kind) {
  let t = _detailCache.get(kind);
  if (t) return t;
  const gen = DETAIL_GEN[kind];
  if (!gen) throw new Error(`materials: nieznany rodzaj detalu "${kind}"`);
  const S = DETAIL_SIZE;
  const h = new Float32Array(S * S);
  const r = new Float32Array(S * S).fill(0.5);
  const a = new Float32Array(S * S).fill(0.5);
  const slope = gen(S, h, r, a);
  t = packDetail(S, h, r, a, slope);
  t.name = `detail-${kind}`;
  _detailCache.set(kind, t);
  return t;
}

let _macroTex = null;
/** Niskoczęstotliwościowy szum (R,G,B — trzy niezależne fBm) do wariacji koloru w dużej skali. */
export function getMacroTexture() {
  if (_macroTex) return _macroTex;
  const S = 128;
  const data = new Uint8Array(S * S * 4);
  const nr = fbmF(3, 3, 4, 211);
  const ng = fbmF(5, 5, 3, 223);
  const nb = fbmF(2, 2, 3, 227);
  forPixels(S, (u, v, i) => {
    data[i * 4] = Math.round(clamp01(0.5 + 0.5 * nr(u, v)) * 255);
    data[i * 4 + 1] = Math.round(clamp01(0.5 + 0.5 * ng(u, v)) * 255);
    data[i * 4 + 2] = Math.round(clamp01(0.5 + 0.5 * nb(u, v)) * 255);
    data[i * 4 + 3] = 255;
  });
  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  tex.name = 'macro-noise';
  _macroTex = tex;
  return tex;
}

// =====================================================================================
//  Tęczówka oka (canvas) — tekstura rzutowana w shaderze wzdłuż osi patrzenia oka
// =====================================================================================

const _eyeCache = new Map();
/**
 * Canvas 512×512: środek (0.5, 0.5) = środek źrenicy. Brzeg kwadratu odpowiada równikowi gałki
 * (współrzędne = składowe x,y znormalizowanego kierunku od środka oka). irisSize = promień tęczówki
 * jako ułamek promienia gałki (0.5 ≈ duże, stylizowane oczy), pupilSize = ułamek promienia tęczówki.
 */
export function getEyeTexture(irisColor, { irisSize = 0.5, pupilSize = 0.36, sclera = 0xf4f0ea } = {}) {
  const col = new THREE.Color(irisColor);
  const key = `${col.getHexString()}|${irisSize}|${pupilSize}|${new THREE.Color(sclera).getHexString()}`;
  let t = _eyeCache.get(key);
  if (t) return t;
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const C = S / 2;
  const R = irisSize * C;
  const P = pupilSize * R;
  const hsl = {};
  col.getHSL(hsl);
  const hslStr = (h, s, l, a = 1) => `hsla(${(h * 360).toFixed(1)},${(clamp01(s) * 100).toFixed(1)}%,${(clamp01(l) * 100).toFixed(1)}%,${a})`;
  const rnd = (n) => hashI(n, 7, 991);

  // twardówka: ciepła biel, delikatne przyciemnienie i żyłki przy brzegu
  const sc = new THREE.Color(sclera);
  const scH = {};
  sc.getHSL(scH);
  const sg = g.createRadialGradient(C, C, R, C, C, C);
  sg.addColorStop(0, hslStr(scH.h, scH.s, scH.l));
  sg.addColorStop(0.65, hslStr(scH.h, scH.s * 0.9, scH.l * 0.97));
  sg.addColorStop(1, hslStr(0.02, 0.25, scH.l * 0.86));
  g.fillStyle = sg;
  g.fillRect(0, 0, S, S);
  g.lineCap = 'round';
  for (let n = 0; n < 26; n++) {
    const a0 = rnd(n) * Math.PI * 2;
    let x = C + Math.cos(a0) * C * 0.98;
    let y = C + Math.sin(a0) * C * 0.98;
    let ang = a0 + Math.PI + (rnd(n + 50) - 0.5) * 0.6;
    g.strokeStyle = `rgba(200,70,70,${0.08 + rnd(n + 90) * 0.12})`;
    g.lineWidth = 0.8 + rnd(n + 130) * 1.2;
    g.beginPath();
    g.moveTo(x, y);
    const steps = 6 + Math.floor(rnd(n + 170) * 6);
    for (let k = 0; k < steps; k++) {
      ang += (rnd(n * 13 + k) - 0.5) * 0.9;
      x += Math.cos(ang) * 9;
      y += Math.sin(ang) * 9;
      if (Math.hypot(x - C, y - C) < R * 1.15) break;
      g.lineTo(x, y);
    }
    g.stroke();
  }

  // tęczówka: baza
  const ig = g.createRadialGradient(C, C, P * 0.8, C, C, R);
  ig.addColorStop(0, hslStr(hsl.h + 0.03, hsl.s * 0.8, Math.min(0.85, hsl.l * 1.45 + 0.12)));
  ig.addColorStop(0.35, hslStr(hsl.h, hsl.s, hsl.l * 1.1));
  ig.addColorStop(0.8, hslStr(hsl.h - 0.01, Math.min(1, hsl.s * 1.1), hsl.l * 0.8));
  ig.addColorStop(1, hslStr(hsl.h - 0.02, hsl.s, hsl.l * 0.55));
  g.fillStyle = ig;
  g.beginPath();
  g.arc(C, C, R, 0, Math.PI * 2);
  g.fill();

  // promieniste włókna
  g.save();
  g.beginPath();
  g.arc(C, C, R, 0, Math.PI * 2);
  g.clip();
  for (let n = 0; n < 420; n++) {
    const a0 = (n / 420) * Math.PI * 2 + rnd(n) * 0.05;
    const bright = rnd(n + 1000) > 0.5;
    const l = bright ? Math.min(0.92, hsl.l * (1.35 + rnd(n + 3000) * 0.5) + 0.08) : hsl.l * (0.45 + rnd(n + 3000) * 0.3);
    g.strokeStyle = hslStr(hsl.h + (rnd(n + 2000) - 0.5) * 0.06, hsl.s * (bright ? 0.75 : 1.1), l, 0.18 + rnd(n + 4000) * 0.3);
    g.lineWidth = 0.7 + rnd(n + 5000) * 1.6;
    const r0 = P * (0.95 + rnd(n + 6000) * 0.25);
    const r1 = R * (0.55 + rnd(n + 7000) * 0.45);
    const wob = (rnd(n + 8000) - 0.5) * 0.12;
    g.beginPath();
    g.moveTo(C + Math.cos(a0) * r0, C + Math.sin(a0) * r0);
    g.quadraticCurveTo(
      C + Math.cos(a0 + wob) * (r0 + r1) * 0.5,
      C + Math.sin(a0 + wob) * (r0 + r1) * 0.5,
      C + Math.cos(a0 + wob * 0.5) * r1,
      C + Math.sin(a0 + wob * 0.5) * r1,
    );
    g.stroke();
  }
  // krypty (ciemne plamki) i kołnierz (jaśniejszy, nieregularny pierścień)
  for (let n = 0; n < 40; n++) {
    const a0 = rnd(n + 9000) * Math.PI * 2;
    const rr = P + (R - P) * (0.35 + rnd(n + 9100) * 0.5);
    g.fillStyle = hslStr(hsl.h, hsl.s, hsl.l * 0.4, 0.25 + rnd(n + 9200) * 0.25);
    g.beginPath();
    g.ellipse(C + Math.cos(a0) * rr, C + Math.sin(a0) * rr, 2 + rnd(n + 9300) * 5, 1 + rnd(n + 9400) * 2, a0, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = hslStr(hsl.h + 0.04, hsl.s * 0.6, Math.min(0.9, hsl.l * 1.6 + 0.15), 0.28);
  g.lineWidth = R * 0.07;
  g.beginPath();
  for (let k = 0; k <= 64; k++) {
    const a0 = (k / 64) * Math.PI * 2;
    const rr = P * 1.55 + Math.sin(a0 * 7 + 1.3) * R * 0.03 + Math.sin(a0 * 13) * R * 0.015;
    const px = C + Math.cos(a0) * rr;
    const py = C + Math.sin(a0) * rr;
    if (k === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.stroke();
  g.restore();

  // pierścień rąbkowy (ciemny, miękki brzeg tęczówki)
  const lg = g.createRadialGradient(C, C, R * 0.8, C, C, R * 1.06);
  lg.addColorStop(0, 'rgba(10,8,12,0)');
  lg.addColorStop(0.72, `rgba(14,10,16,0.55)`);
  lg.addColorStop(0.86, 'rgba(14,10,16,0.75)');
  lg.addColorStop(1, 'rgba(14,10,16,0)');
  g.fillStyle = lg;
  g.beginPath();
  g.arc(C, C, R * 1.06, 0, Math.PI * 2);
  g.fill();

  // źrenica
  const pg = g.createRadialGradient(C, C, P * 0.85, C, C, P * 1.12);
  pg.addColorStop(0, 'rgba(5,4,6,1)');
  pg.addColorStop(1, 'rgba(5,4,6,0)');
  g.fillStyle = pg;
  g.beginPath();
  g.arc(C, C, P * 1.12, 0, Math.PI * 2);
  g.fill();

  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 8;
  t.name = 'eye-iris';
  _eyeCache.set(key, t);
  return t;
}

// =====================================================================================
//  Globalne ustawienia rim (wspólne uniformy dla wszystkich materiałów postaci)
// =====================================================================================

export const RIM = {
  color: { value: new THREE.Color(1.0, 0.97, 0.92) },
  strength: { value: 0.32 },
  power: { value: 3.2 },
};

/** Ustaw globalną poświatę krawędzi: { color, strength, power }. */
export function setRim({ color, strength, power } = {}) {
  if (color !== undefined) RIM.color.value.set(color);
  if (strength !== undefined) RIM.strength.value = strength;
  if (power !== undefined) RIM.power.value = power;
}

// =====================================================================================
//  Łatki shaderów
// =====================================================================================

const V_PARS = /* glsl */ `
varying vec3 vSmPos;
varying vec3 vSmNrm;
#ifdef SM_HAIR
	uniform vec3 uHairFlow;
	varying vec3 vSmHairT;
#endif
`;

const V_BEGINNORMAL = /* glsl */ `
#include <beginnormal_vertex>
vSmNrm = objectNormal;
#ifdef SM_HAIR
	vec3 smHairT = uHairFlow - objectNormal * dot( uHairFlow, objectNormal );
	if ( dot( smHairT, smHairT ) < 1e-6 ) smHairT = cross( objectNormal, vec3( 1.0, 0.0, 0.0 ) );
#endif
`;

const V_SKINNORMAL = /* glsl */ `
#include <skinnormal_vertex>
#ifdef SM_HAIR
	#ifdef USE_SKINNING
		smHairT = ( skinMatrix * vec4( smHairT, 0.0 ) ).xyz;
	#endif
	#ifdef USE_INSTANCING
		smHairT = mat3( instanceMatrix ) * smHairT;
	#endif
	vSmHairT = ( modelViewMatrix * vec4( smHairT, 0.0 ) ).xyz;
#endif
`;

const V_BEGIN = /* glsl */ `
#include <begin_vertex>
vSmPos = transformed;
`;

const F_PARS = /* glsl */ `
varying vec3 vSmPos;
varying vec3 vSmNrm;
uniform float uAOStrength;
uniform float uAODirect;
uniform float uEnvSpec;
uniform float uEnvDiffuse;
vec3 smAO = vec3( 1.0 );
vec3 smTriW = vec3( 0.0, 1.0, 0.0 );
#ifdef SM_RIM
	uniform vec3 uRimColor;
	uniform float uRimStrength;
	uniform float uRimPower;
	uniform float uRimMat;
#endif
#ifdef SM_DETAIL
	uniform sampler2D uDetailMap;
	uniform float uDetailScale;
	uniform float uDetailNormal;
	uniform float uDetailRough;
	uniform float uDetailAlbedo;
	uniform vec3 uDetailMixColor;
	uniform float uDetailMix;
	vec4 smDet = vec4( 0.5 );
	vec2 smUvX; vec2 smUvY; vec2 smUvZ;
	vec4 smSX; vec4 smSY; vec4 smSZ;
#endif
#ifdef SM_MACRO
	uniform sampler2D uMacroMap;
	uniform float uMacroScale;
	uniform float uMacroAmt;
#endif
uniform vec3 uScatter;
uniform float uWrap;
#ifdef SM_HAIR
	varying vec3 vSmHairT;
	uniform vec3 uHairSpec1;
	uniform vec3 uHairSpec2;
	uniform float uHairShift1;
	uniform float uHairShift2;
	uniform float uHairExp1;
	uniform float uHairExp2;
	vec3 smHairTv = vec3( 0.0, 1.0, 0.0 );
	float smHairNoise = 0.0;
#endif
#ifdef SM_EYE
	uniform sampler2D uIrisMap;
	uniform mat3 uEyeBasis;
	uniform vec3 uEyeCenter;
	uniform vec3 uCatchColor;
	uniform vec3 uCatchDir;
	uniform float uCatchSize;
#endif
#ifdef SM_LENS
	uniform float uLensGlow;
#endif
`;

// funkcje (po wszystkich *_pars_fragment)
const F_FUNCS = /* glsl */ `
// wygaszanie cienia przy terminatorze (tam Lambert i tak → 0): bez twardej "piłowanej" krawędzi samocienia
float smShadowFade( float nl, float s ) {
	return mix( 1.0, s, smoothstep( - 0.02, 0.12, nl ) );
}
#if defined( SM_DETAIL ) || defined( SM_MACRO )
	void smTriWeights() {
		vec3 n = vSmNrm / max( length( vSmNrm ), 1e-6 );
		vec3 w = pow( abs( n ), vec3( 4.0 ) );
		smTriW = w / max( w.x + w.y + w.z, 1e-5 );
	}
#endif
#ifdef SM_DETAIL
	void smTriSample() {
		vec3 p = vSmPos * uDetailScale;
		smUvX = p.zy;
		smUvY = p.xz + vec2( 0.31, 0.67 );
		smUvZ = p.xy + vec2( 0.59, 0.13 );
		smSX = texture2D( uDetailMap, smUvX );
		smSY = texture2D( uDetailMap, smUvY );
		smSZ = texture2D( uDetailMap, smUvZ );
		smDet = smSX * smTriW.x + smSY * smTriW.y + smSZ * smTriW.z;
	}
	vec3 smAxis( vec3 q0perp, vec3 q1perp, vec2 uv, vec2 s ) {
		vec2 st0 = dFdx( uv );
		vec2 st1 = dFdy( uv );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float sc = det == 0.0 ? 0.0 : inversesqrt( det );
		vec2 d = s * 2.0 - 1.0;
		return ( T * d.x + B * d.y ) * sc;
	}
	// zaburzenie normalnej (view space) — rama styczna z pochodnych ekranowych, jak getTangentFrame w three
	vec3 smTriNormal( vec3 N, float faceDir ) {
		vec3 q0 = dFdx( - vViewPosition );
		vec3 q1 = dFdy( - vViewPosition );
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 sum = smAxis( q0perp, q1perp, smUvX, smSX.xy ) * smTriW.x
			+ smAxis( q0perp, q1perp, smUvY, smSY.xy ) * smTriW.y
			+ smAxis( q0perp, q1perp, smUvZ, smSZ.xy ) * smTriW.z;
		#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
			sum *= faceDir;
		#endif
		return normalize( N + sum * uDetailNormal );
	}
#endif
#ifdef SM_MACRO
	float smMacro() {
		vec3 p = vSmPos * uMacroScale;
		return texture2D( uMacroMap, p.zy ).r * smTriW.x
			+ texture2D( uMacroMap, p.xz + 0.5 ).r * smTriW.y
			+ texture2D( uMacroMap, p.xy + 0.25 ).r * smTriW.z;
	}
#endif
`;

// własne równanie światła bezpośredniego (skóra / włosy) — opakowuje RE_Direct_Physical
const F_REDIRECT = /* glsl */ `
#include <lights_physical_pars_fragment>
#ifdef SM_HAIR
	float smStrand( vec3 T, vec3 H, float e ) {
		float th = dot( T, H );
		float s = sqrt( max( 0.0, 1.0 - th * th ) );
		return smoothstep( - 1.0, 0.0, th ) * pow( s, e );
	}
#endif
// zawsze: miękkie "zawinięte" rozpraszanie (bez twardego załamania na terminatorze), ew. włosy
	void RE_Direct_Sm( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
		float nlRaw = dot( geometryNormal, directLight.direction );
		// wrap znormalizowany (Green 2004): ((n·l + w) / (1 + w))^(1 + w); nadwyżkę ponad Lamberta barwi uScatter
		float wrapped = pow( saturate( ( nlRaw + uWrap ) / ( 1.0 + uWrap ) ), 1.0 + uWrap );
		float extra = max( wrapped - saturate( nlRaw ), 0.0 );
		reflectedLight.directDiffuse += directLight.color * extra * uScatter * BRDF_Lambert( material.diffuseColor );
		#ifdef SM_HAIR
			vec3 H = normalize( directLight.direction + geometryViewDir );
			vec3 t1 = normalize( smHairTv + geometryNormal * ( uHairShift1 + smHairNoise ) );
			vec3 t2 = normalize( smHairTv + geometryNormal * ( uHairShift2 + smHairNoise ) );
			float vis = smoothstep( - 0.1, 0.45, nlRaw );
			reflectedLight.directSpecular += directLight.color * vis * ( uHairSpec1 * smStrand( t1, H, uHairExp1 ) + uHairSpec2 * smStrand( t2, H, uHairExp2 ) );
		#endif
	}
	#undef RE_Direct
	#define RE_Direct RE_Direct_Sm
`;

const F_MAP = /* glsl */ `
#if defined( SM_DETAIL ) || defined( SM_MACRO )
	smTriWeights();
#endif
#ifdef SM_DETAIL
	smTriSample();
#endif
#include <map_fragment>
#ifdef SM_EYE
	{
		vec3 ed = uEyeBasis * normalize( vSmPos - uEyeCenter );
		vec2 euv = ed.xy;
		if ( ed.z < 0.0 ) euv = normalize( ed.xy + 1e-5 ); // tylna półkula → brzeg twardówki
		vec4 ec = texture2D( uIrisMap, euv * 0.497 + 0.5 );
		diffuseColor.rgb *= ec.rgb;
	}
#endif
`;

const F_COLOR_AO = /* glsl */ `
#if defined( USE_COLOR_ALPHA )
	diffuseColor.a *= vColor.a;
#endif
#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	smAO = mix( vec3( 1.0 ), vColor.rgb, uAOStrength );
	diffuseColor.rgb *= mix( vec3( 1.0 ), smAO, uAODirect );
#endif
`;

const F_COLOR_TAIL = /* glsl */ `
#ifdef SM_DETAIL
	diffuseColor.rgb *= 1.0 + ( smDet.a - 0.5 ) * 2.0 * uDetailAlbedo;
	diffuseColor.rgb = mix( diffuseColor.rgb, uDetailMixColor, saturate( smDet.a * 2.0 - 1.0 ) * uDetailMix );
#endif
#ifdef SM_MACRO
	float smM = smMacro();
	diffuseColor.rgb *= 1.0 + ( smM - 0.5 ) * 2.0 * uMacroAmt;
#endif
`;

const F_ROUGH = /* glsl */ `
#include <roughnessmap_fragment>
#ifdef SM_DETAIL
	roughnessFactor += ( smDet.b - 0.5 ) * 2.0 * uDetailRough;
#endif
#ifdef SM_MACRO
	roughnessFactor += ( smM - 0.5 ) * uMacroAmt * 0.6;
#endif
roughnessFactor = clamp( roughnessFactor, 0.03, 1.0 );
`;

const F_NORMAL = /* glsl */ `
#include <normal_fragment_maps>
#ifdef SM_DETAIL
	normal = smTriNormal( normal, faceDirection );
#endif
#ifdef SM_HAIR
	{
		vec3 ht = vSmHairT - normal * dot( vSmHairT, normal );
		smHairTv = normalize( ht + 1e-6 );
		#ifdef SM_DETAIL
			smHairNoise = ( smDet.b - 0.5 ) * 0.9;
		#endif
	}
#endif
`;

const F_LIGHTS_END = /* glsl */ `
#include <lights_fragment_end>
reflectedLight.indirectSpecular *= uEnvSpec;
reflectedLight.indirectDiffuse *= uEnvDiffuse;
#ifdef SM_HAIR
	{
		// miękkie pasmo połysku także w cieniu — "światło" z nieba (oś Y świata)
		vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
		vec3 Hs = normalize( upV + geometryViewDir );
		vec3 ts = normalize( smHairTv + normal * ( uHairShift1 + smHairNoise ) );
		reflectedLight.indirectSpecular += uHairSpec1 * smStrand( ts, Hs, uHairExp1 * 0.5 ) * ( irradiance + iblIrradiance ) * ( 0.12 * RECIPROCAL_PI );
	}
#endif
`;

const F_AO = /* glsl */ `
#include <aomap_fragment>
{
	float smAOs = dot( smAO, vec3( 0.3333 ) );
	reflectedLight.indirectDiffuse *= smAO;
	float smDotNV = saturate( dot( normal, geometryViewDir ) );
	reflectedLight.indirectSpecular *= computeSpecularOcclusion( smDotNV, smAOs, material.roughness );
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect *= smAOs;
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect *= smAOs;
	#endif
	#ifdef SM_RIM
		{
			float fres = pow( 1.0 - smDotNV, uRimPower );
			vec3 wN = inverseTransformDirection( normal, viewMatrix );
			float up = saturate( 0.55 + 0.45 * wN.y );
			float sunSide = 0.6;
			#if NUM_DIR_LIGHTS > 0
				sunSide = 0.35 + 0.65 * saturate( dot( normal, directionalLights[ 0 ].direction ) * 1.2 + 0.45 );
			#endif
			vec3 tint = 0.4 + 0.6 * sqrt( max( diffuseColor.rgb, vec3( 0.0 ) ) );
			totalEmissiveRadiance += uRimColor * tint * ( uRimStrength * uRimMat * fres * up * sunSide * smAOs );
		}
	#endif
	#ifdef SM_EYE
		{
			vec3 Rr = reflect( - geometryViewDir, nonPerturbedNormal );
			vec3 cd = normalize( uCatchDir );
			float c1 = smoothstep( cos( uCatchSize ), cos( uCatchSize * 0.72 ), dot( Rr, cd ) );
			vec3 cd2 = normalize( cd * vec3( - 0.6, - 0.5, 1.0 ) );
			float c2 = smoothstep( cos( uCatchSize * 0.45 ), cos( uCatchSize * 0.3 ), dot( Rr, cd2 ) );
			totalEmissiveRadiance += uCatchColor * ( c1 + 0.5 * c2 ) * smAOs;
		}
	#endif
	#ifdef SM_LENS
		{
			totalEmissiveRadiance *= mix( 0.35, 1.0 + uLensGlow, pow( smDotNV, 1.5 ) );
		}
	#endif
}
`;

let _lfb = null;
function LIGHTS_BEGIN_PATCHED() {
  if (_lfb) return _lfb;
  let c = THREE.ShaderChunk.lights_fragment_begin;
  const a = '? getShadow( directionalShadowMap[ i ]';
  const b = 'vDirectionalShadowCoord[ i ] ) : 1.0;';
  if (c.includes(a) && c.includes(b)) {
    c = c.replace(a, '? smShadowFade( dot( geometryNormal, directLight.direction ), getShadow( directionalShadowMap[ i ]');
    c = c.replace(b, 'vDirectionalShadowCoord[ i ] ) ) : 1.0;');
  } else console.warn('materials: nie znaleziono linii cienia kierunkowego — bez wygaszania terminatora');
  _lfb = c;
  return c;
}

function replaceOnce(src, token, rep, label) {
  if (!src.includes(token)) {
    console.warn(`materials: brak fragmentu ${token} w shaderze (${label}) — łatka pominięta`);
    return src;
  }
  return src.replace(token, rep);
}

function patchShader(shader, cfg, uniforms) {
  Object.assign(shader.uniforms, uniforms);
  const defs = cfg.defines.map((d) => `#define ${d}\n`).join('');
  let vs = shader.vertexShader;
  vs = replaceOnce(vs, '#include <common>', `#include <common>\n${V_PARS}`, 'vs common');
  vs = replaceOnce(vs, '#include <beginnormal_vertex>', V_BEGINNORMAL, 'vs beginnormal');
  vs = replaceOnce(vs, '#include <skinnormal_vertex>', V_SKINNORMAL, 'vs skinnormal');
  vs = replaceOnce(vs, '#include <begin_vertex>', V_BEGIN, 'vs begin');
  shader.vertexShader = defs + vs;

  let fs = shader.fragmentShader;
  fs = replaceOnce(fs, '#include <common>', `#include <common>\n${F_PARS}`, 'fs common');
  fs = replaceOnce(fs, '#include <lights_physical_pars_fragment>', F_REDIRECT, 'fs lights pars');
  fs = replaceOnce(fs, '#include <clipping_planes_pars_fragment>', `#include <clipping_planes_pars_fragment>\n${F_FUNCS}`, 'fs funcs');
  fs = replaceOnce(fs, '#include <map_fragment>', F_MAP, 'fs map');
  fs = replaceOnce(
    fs,
    '#include <color_fragment>',
    (cfg.vertexColorMode === 'color' ? '#include <color_fragment>\n' : F_COLOR_AO) + F_COLOR_TAIL,
    'fs color',
  );
  fs = replaceOnce(fs, '#include <roughnessmap_fragment>', F_ROUGH, 'fs rough');
  fs = replaceOnce(fs, '#include <normal_fragment_maps>', F_NORMAL, 'fs normal');
  fs = replaceOnce(fs, '#include <lights_fragment_begin>', LIGHTS_BEGIN_PATCHED(), 'fs lights begin');
  fs = replaceOnce(fs, '#include <lights_fragment_end>', F_LIGHTS_END, 'fs lights end');
  fs = replaceOnce(fs, '#include <aomap_fragment>', F_AO, 'fs ao');
  shader.fragmentShader = defs + fs;
}

// stan materiałów (poza userData, żeby material.clone()/toJSON nie próbowały kopiować tekstur)
const STATE = new WeakMap();

function cloneUniforms(u) {
  const out = {};
  for (const k in u) {
    if (u[k] === RIM.color || u[k] === RIM.strength || u[k] === RIM.power) {
      out[k] = u[k]; // globalne — współdzielone
      continue;
    }
    const v = u[k].value;
    out[k] = { value: v && typeof v.clone === 'function' && !v.isTexture ? v.clone() : v };
  }
  return out;
}

function attachPatch(mat, cfg, uniforms) {
  STATE.set(mat, { cfg, uniforms });
  const key = `sm2|${cfg.kind}|${cfg.defines.join(',')}|${cfg.vertexColorMode}`;
  mat.onBeforeCompile = (shader) => patchShader(shader, cfg, uniforms);
  mat.customProgramCacheKey = () => key;
  // brak atrybutu "color" przy vertexColors:true → biały (bez okluzji), a nie czarny
  mat.defaultAttributeValues = { color: [1, 1, 1] };
  const baseClone = Object.getPrototypeOf(mat).clone;
  mat.clone = function () {
    const c = baseClone.call(this);
    attachPatch(c, cfg, cloneUniforms(STATE.get(this).uniforms));
    return c;
  };
  mat.userData.smKind = cfg.kind;
  return mat;
}

/** Uniformy łatki danego materiału (do strojenia w locie), np. sm(mat).uDetailNormal.value = 0.5 */
export function sm(mat) {
  const s = STATE.get(mat);
  return s ? s.uniforms : null;
}

// =====================================================================================
//  Fabryka bazowa
// =====================================================================================

// klucze opcji obsługiwane przez bibliotekę (reszta trafia do konstruktora materiału, jeśli to jego właściwość)
const OWN_KEYS = new Set([
  'kind', 'scale', 'detail', 'detailRoughness', 'detailAlbedo', 'detailMixColor', 'detailMix',
  'macro', 'macroScale', 'ao', 'aoDirect', 'rim', 'envSpec', 'envDiffuse', 'vertexColorMode',
  'scatter', 'wrap', 'highlight', 'highlight2', 'shift', 'flow', 'painted', 'intensity',
  'irisSize', 'pupilSize', 'sclera', 'center', 'forward', 'up', 'catchlight', 'catchDir', 'catchSize',
  'glow', 'physical',
]);

function makeMaterial(base, params, opts, cfg, extra = {}) {
  const Ctor = opts.physical === false || base === 'standard' ? THREE.MeshStandardMaterial : THREE.MeshPhysicalMaterial;
  const mat = new Ctor();
  const assign = (k, val, warn) => {
    if (val === undefined) return;
    if (!(k in mat)) {
      if (warn) console.warn(`materials: nieznana opcja "${k}" (pominięta)`);
      return;
    }
    const cur = mat[k];
    if (cur && cur.isColor) cur.set(val);
    else mat[k] = val;
  };
  for (const k in params) if (!(k in opts)) assign(k, params[k], false);
  for (const k in opts) if (!OWN_KEYS.has(k)) assign(k, opts[k], true);

  const defines = [];
  const u = {
    uAOStrength: { value: opts.ao ?? 1.0 },
    uAODirect: { value: opts.aoDirect ?? 0.4 },
    uEnvSpec: { value: opts.envSpec ?? 1.0 },
    uEnvDiffuse: { value: opts.envDiffuse ?? 1.0 },
    uWrap: { value: opts.wrap ?? cfg.wrap ?? 0.15 },
    uScatter: { value: new THREE.Color(opts.scatter ?? cfg.scatter ?? 0xffffff) },
  };
  const rim = opts.rim ?? cfg.rim ?? 1;
  if (rim > 0) {
    defines.push('SM_RIM');
    Object.assign(u, { uRimColor: RIM.color, uRimStrength: RIM.strength, uRimPower: RIM.power, uRimMat: { value: rim } });
  }
  if (cfg.detail) {
    defines.push('SM_DETAIL');
    Object.assign(u, {
      uDetailMap: { value: getDetailTexture(cfg.detail) },
      uDetailScale: { value: opts.scale ?? cfg.scale ?? 8 },
      uDetailNormal: { value: (opts.detail ?? 1) * (cfg.detailNormal ?? 1) },
      uDetailRough: { value: opts.detailRoughness ?? cfg.detailRough ?? 0.15 },
      uDetailAlbedo: { value: opts.detailAlbedo ?? cfg.detailAlbedo ?? 0.15 },
      uDetailMixColor: { value: new THREE.Color(opts.detailMixColor ?? cfg.detailMixColor ?? 0xffffff) },
      uDetailMix: { value: opts.detailMix ?? cfg.detailMix ?? 0 },
    });
  }
  const macro = opts.macro ?? cfg.macro ?? 0;
  if (macro > 0) {
    defines.push('SM_MACRO');
    Object.assign(u, {
      uMacroMap: { value: getMacroTexture() },
      uMacroScale: { value: opts.macroScale ?? cfg.macroScale ?? 0.9 },
      uMacroAmt: { value: macro },
    });
  }
  for (const d of cfg.defines || []) defines.push(d);
  Object.assign(u, extra);

  return attachPatch(mat, { kind: cfg.kind, defines, vertexColorMode: opts.vertexColorMode ?? 'ao' }, u);
}

const lighten = (c, k) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), k);

// =====================================================================================
//  Publiczne fabryki
// =====================================================================================

/**
 * Skóra: ciepłe, miękkie światło (wrap) z czerwonawym rozproszeniem przy terminatorze, meszek (sheen),
 * pory w detalu triplanarnym.
 * opts: scatter (barwa nadwyżki "zawiniętego" światła, domyślnie 0xffb59a), wrap (0.5), roughness (0.52), sheen (0.35),
 *       scale (13 /m), detail (1) + opcje wspólne.
 */
export function skin(color = 0xe0a882, opts = {}) {
  const c = new THREE.Color(color);
  return makeMaterial(
    'physical',
    {
      color: c,
      roughness: 0.5,
      metalness: 0,
      specularIntensity: 0.4,
      sheen: 0.3,
      sheenRoughness: 0.65,
      sheenColor: lighten(c, 0.35).multiplyScalar(0.55),
    },
    opts,
    { kind: 'skin', detail: 'skin', scale: 40, detailNormal: 0.18, detailRough: 0.08, detailAlbedo: 0.06, macro: 0.05, macroScale: 2.2, wrap: 0.75, scatter: 0xff6a50, defines: ['SM_SKIN'] },
  );
}

const FABRIC = {
  cotton: { wrap: 0.3, detail: 'cotton', scale: 11, roughness: 0.9, sheen: 0.8, sheenRoughness: 0.55, detailNormal: 1.0, detailAlbedo: 0.16, detailRough: 0.1 },
  denim: { wrap: 0.22, detail: 'denim', scale: 9, roughness: 0.82, sheen: 0.45, sheenRoughness: 0.6, detailNormal: 1.0, detailAlbedo: 0.2, detailRough: 0.1, detailMix: 0.42 },
  canvas: { wrap: 0.2, detail: 'canvas', scale: 8, roughness: 0.92, sheen: 0.35, sheenRoughness: 0.7, detailNormal: 1.1, detailAlbedo: 0.18, detailRough: 0.12 },
  knit: { wrap: 0.4, detail: 'knit', scale: 6, roughness: 0.95, sheen: 1.0, sheenRoughness: 0.45, detailNormal: 1.25, detailAlbedo: 0.22, detailRough: 0.08 },
};

/**
 * Tkanina. opts.kind: 'cotton' | 'denim' | 'canvas' | 'knit' (domyślnie cotton), opts.scale — powtórzenia
 * wzoru na 1 jednostkę (metr) przestrzeni obiektu. Splot w normalnej + wariacja szorstkości, sheen tkaniny.
 */
export function fabric(color = 0x8a8f99, opts = {}) {
  const kind = opts.kind ?? 'cotton';
  const f = FABRIC[kind];
  if (!f) throw new Error(`materials.fabric: nieznany rodzaj "${kind}"`);
  const c = new THREE.Color(color);
  return makeMaterial(
    'physical',
    {
      color: c,
      roughness: f.roughness,
      metalness: 0,
      specularIntensity: 0.45,
      sheen: f.sheen,
      sheenRoughness: f.sheenRoughness,
      sheenColor: lighten(c, 0.45),
    },
    opts,
    {
      kind: `fabric-${kind}`,
      detail: f.detail,
      scale: f.scale,
      detailNormal: f.detailNormal,
      detailAlbedo: f.detailAlbedo,
      detailRough: f.detailRough,
      detailMix: f.detailMix ?? 0,
      detailMixColor: kind === 'denim' ? lighten(c, 0.75).getHex() : 0xffffff,
      macro: 0.07,
      macroScale: 1.1,
      wrap: f.wrap,
    },
  );
}

/** Skóra (materiał): ziarno komórkowe, półmatowa, lekki połysk na wypukłościach. */
export function leather(color = 0x5a3a26, opts = {}) {
  return makeMaterial(
    'physical',
    { color, roughness: 0.48, metalness: 0, specularIntensity: 0.6, clearcoat: 0.12, clearcoatRoughness: 0.45 },
    opts,
    { kind: 'leather', wrap: 0.15, detail: 'leather', scale: 7, detailNormal: 0.45, detailRough: 0.18, detailAlbedo: 0.16, macro: 0.08, macroScale: 1.4 },
  );
}

/** Guma: matowa, drobne nakrapianie. */
export function rubber(color = 0x2a2c31, opts = {}) {
  return makeMaterial(
    'physical',
    { color, roughness: 0.82, metalness: 0, specularIntensity: 0.4 },
    opts,
    { kind: 'rubber', wrap: 0.12, detail: 'rubber', scale: 12, detailNormal: 0.6, detailRough: 0.08, detailAlbedo: 0.06, macro: 0.05 },
  );
}

/** Tworzywo: gładkie, satynowe, subtelna "skórka pomarańczy". opts.roughness domyślnie 0.36. */
export function plastic(color = 0xd8dde4, opts = {}) {
  return makeMaterial(
    'physical',
    { color, roughness: 0.36, metalness: 0, specularIntensity: 0.9 },
    opts,
    { kind: 'plastic', wrap: 0.12, detail: 'plastic', scale: 5, detailNormal: 0.35, detailRough: 0.08, detailAlbedo: 0.04, macro: 0.04 },
  );
}

/**
 * Metal. opts.painted = true → lakierowany metal (dielektryk + clearcoat, drobne odpryski),
 * false → goły metal (metalness 1, szczotkowanie + rysy, odbicia nieba).
 */
export function metal(color = 0x8d939c, opts = {}) {
  if (opts.painted) {
    return makeMaterial(
      'physical',
      { color, roughness: 0.42, metalness: 0, specularIntensity: 0.8, clearcoat: 0.55, clearcoatRoughness: 0.22 },
      opts,
      { kind: 'metal-painted', wrap: 0.1, detail: 'paint', scale: 6, detailNormal: 0.45, detailRough: 0.12, detailAlbedo: 0.12, macro: 0.05 },
    );
  }
  return makeMaterial(
    'physical',
    { color, roughness: 0.3, metalness: 1 },
    opts,
    { kind: 'metal', wrap: 0, detail: 'brushed', scale: 6, detailNormal: 0.45, detailRough: 0.2, detailAlbedo: 0.12, macro: 0.06, rim: 0.6 },
  );
}

/**
 * Włosy (rzeźbione kosmyki): anizotropowy połysk Kajiya-Kay — 1. płat (jasny, opts.highlight),
 * 2. płat (barwiony kolorem włosów, przesunięty). opts.flow — kierunek czesania w przestrzeni obiektu
 * (bind pose), domyślnie w dół i lekko do tyłu [0, -1, 0.35] (postać patrzy w -Z).
 * opts.shift (0.12) — przesunięcie pasma wzdłuż normalnej.
 */
export function hair(color = 0x4a2f1f, opts = {}) {
  const c = new THREE.Color(color);
  const hl = opts.highlight !== undefined ? new THREE.Color(opts.highlight) : lighten(c, 0.55);
  const hl2 = opts.highlight2 !== undefined ? new THREE.Color(opts.highlight2) : c.clone().lerp(hl, 0.5);
  const flow = new THREE.Vector3().fromArray(opts.flow ?? [0, -1, 0.35]).normalize();
  const shift = opts.shift ?? 0.12;
  return makeMaterial(
    'physical',
    { color: c, roughness: 0.5, metalness: 0, specularIntensity: 0.35, sheen: 0.25, sheenRoughness: 0.5, sheenColor: hl.clone().multiplyScalar(0.4) },
    opts,
    { kind: 'hair', wrap: 0.35, detail: 'hair', scale: 4, detailNormal: 0.35, detailRough: 0.06, detailAlbedo: 0.05, macro: 0.05, defines: ['SM_HAIR'] },
    {
      uHairFlow: { value: flow },
      uHairSpec1: { value: hl.clone().multiplyScalar(1.1) }, // wąskie, wyraźne pasmo połysku (anizotropia Kajiya-Kay)
      uHairSpec2: { value: hl2.clone().multiplyScalar(0.4) },
      uHairShift1: { value: shift },
      uHairShift2: { value: -shift * 1.6 },
      uHairExp1: { value: 70 },
      uHairExp2: { value: 22 },
    },
  );
}

/**
 * Oko na sferze (UV niepotrzebne): tęczówka rzutowana z kierunku od opts.center (bind/object space,
 * domyślnie [0,0,0]) — środek źrenicy patrzy w opts.forward (domyślnie [0,0,-1], czyli -Z jak postać),
 * opts.up domyślnie [0,1,0]. Mokra warstwa clearcoat + stały blik (catchlight) w przestrzeni widoku.
 * opts: irisSize (0.5 promienia gałki), pupilSize (0.36 promienia tęczówki), sclera (0xf4f0ea),
 *       catchlight (intensywność 1.6), catchDir ([-0.35,0.45,1] w przestrzeni kamery), catchSize (0.16 rad).
 */
export function eye(irisColor = 0x3d7fc4, opts = {}) {
  const fwd = new THREE.Vector3().fromArray(opts.forward ?? [0, 0, -1]).normalize();
  const upv = new THREE.Vector3().fromArray(opts.up ?? [0, 1, 0]);
  const right = new THREE.Vector3().crossVectors(upv, fwd).normalize();
  const up = new THREE.Vector3().crossVectors(fwd, right).normalize();
  // wiersze bazy: x = right, y = up, z = forward → w shaderze ed.z > 0 to przednia półkula (tęczówka)
  const basis = new THREE.Matrix3().set(right.x, right.y, right.z, up.x, up.y, up.z, fwd.x, fwd.y, fwd.z);
  return makeMaterial(
    'physical',
    { color: 0xffffff, roughness: 0.3, metalness: 0, specularIntensity: 0.5, clearcoat: 1, clearcoatRoughness: 0.03 },
    { rim: 0, ...opts },
    { kind: 'eye', wrap: 0.6, defines: ['SM_EYE'] },
    {
      uIrisMap: { value: getEyeTexture(irisColor, opts) },
      uEyeBasis: { value: basis },
      uEyeCenter: { value: new THREE.Vector3().fromArray(opts.center ?? [0, 0, 0]) },
      uCatchColor: { value: new THREE.Color(1, 1, 1).multiplyScalar(opts.catchlight ?? 1.6) },
      uCatchDir: { value: new THREE.Vector3().fromArray(opts.catchDir ?? [-0.35, 0.45, 1]).normalize() },
      uCatchSize: { value: opts.catchSize ?? 0.16 },
    },
  );
}

/** Szkło świecące (gogle, wizjer, celownik): odbicia nieba na brzegach, poświata na wprost. opts.intensity (1.4), opts.glow (0.4). */
export function lens(color = 0x58e1ff, opts = {}) {
  const c = new THREE.Color(color);
  return makeMaterial(
    'physical',
    {
      color: c.clone().multiplyScalar(0.25),
      roughness: 0.05,
      metalness: 0,
      specularIntensity: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      emissive: c,
      emissiveIntensity: opts.intensity ?? 1.4,
    },
    { rim: 0, ...opts },
    { kind: 'lens', wrap: 0, defines: ['SM_LENS'] },
    { uLensGlow: { value: opts.glow ?? 0.4 }, uEnvSpec: { value: opts.envSpec ?? 1.6 } },
  );
}

/** Czysta emisja (diody, paski, pierścienie) — przy intensity > ~1.5 łapie bloom. */
export function emissive(color = 0xffffff, intensity = 4, opts = {}) {
  const c = new THREE.Color(color);
  return makeMaterial(
    'standard',
    { color: c.clone().multiplyScalar(0.3), roughness: 0.4, metalness: 0, emissive: c, emissiveIntensity: intensity },
    { rim: 0, ...opts },
    { kind: 'emissive', wrap: 0.1 },
  );
}

// =====================================================================================
//  Murawa (podłoże) — mapowanie w przestrzeni świata XZ, dwie skale + wariacja makro (bez widocznego kafla)
// =====================================================================================

function makeTurfTextures() {
  const S = 1024;
  const N = S * S;
  const alb = new Float32Array(N * 3);
  const hgt = new Float32Array(N);
  const rgh = new Float32Array(N);
  // podkład: ziemia/strzecha
  const n1f = fbmF(16, 16, 3, 301);
  const n2f = fbmF(64, 64, 2, 307);
  forPixels(S, (u, v, i) => {
    const n1 = n1f(u, v);
    const n2 = n2f(u, v);
    alb[i * 3] = 0.11 + n1 * 0.03 + n2 * 0.02;
    alb[i * 3 + 1] = 0.16 + n1 * 0.03 + n2 * 0.02;
    alb[i * 3 + 2] = 0.05 + n1 * 0.015;
    hgt[i] = 0.05 + n1 * 0.04 + n2 * 0.03;
    rgh[i] = 0.96;
  });
  // źdźbła: krótkie zwężające się kreski, kolejne "rosną" na wierzchu (z-buffer po wysokości)
  const blades = 52000;
  for (let b = 0; b < blades; b++) {
    const x0 = hashI(b, 1, 401) * S;
    const y0 = hashI(b, 2, 401) * S;
    const ang = -Math.PI / 2 + (hashI(b, 3, 401) - 0.5) * 2.6;
    const len = 7 + hashI(b, 4, 401) * 16;
    const wid = 1.1 + hashI(b, 5, 401) * 1.6;
    const hue = hashI(b, 6, 401);
    const lum = 0.75 + hashI(b, 7, 401) * 0.5;
    const top = 0.35 + hashI(b, 8, 401) * 0.65;
    // kolor źdźbła (linear): soczysta zieleń, część żółtawa, część głęboka
    let cr = 0.16;
    let cg = 0.42;
    let cb = 0.06;
    if (hue < 0.18) {
      cr = 0.3;
      cg = 0.5;
      cb = 0.07;
    } else if (hue > 0.85) {
      cr = 0.09;
      cg = 0.3;
      cb = 0.05;
    }
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    for (let t = 0; t <= len; t += 0.6) {
      const k = t / len;
      const w = wid * (1 - k * 0.8);
      const cx = x0 + ca * t;
      const cy = y0 + sa * t;
      const hh = top * (0.35 + 0.65 * k);
      const shade = lum * (0.55 + 0.6 * k);
      for (let o = -w; o <= w; o += 0.7) {
        let px = Math.round(cx - sa * o) % S;
        if (px < 0) px += S;
        let py = Math.round(cy + ca * o) % S;
        if (py < 0) py += S;
        const i = py * S + px;
        const edge = 1 - (Math.abs(o) / (w + 0.01)) * 0.35;
        const h2 = hh * (0.85 + 0.15 * edge);
        if (h2 > hgt[i]) {
          hgt[i] = h2;
          alb[i * 3] = cr * shade * edge;
          alb[i * 3 + 1] = cg * shade * edge;
          alb[i * 3 + 2] = cb * shade * edge;
          rgh[i] = 0.78 + (1 - k) * 0.12;
        }
      }
    }
  }
  // sRGB przez tablicę (szybko), wnęki ciemniejsze (zapieczona okluzja)
  const LUT = new Uint8Array(4096);
  for (let i = 0; i < 4096; i++) {
    const c = i / 4095;
    LUT[i] = Math.round((c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
  }
  const enc = (c) => LUT[c <= 0 ? 0 : c >= 1 ? 4095 : (c * 4095) | 0];
  const albData = new Uint8Array(N * 4);
  for (let i = 0; i < N; i++) {
    const ao = 0.55 + 0.45 * Math.min(1, hgt[i] * 1.4);
    albData[i * 4] = enc(alb[i * 3] * ao);
    albData[i * 4 + 1] = enc(alb[i * 3 + 1] * ao);
    albData[i * 4 + 2] = enc(alb[i * 3 + 2] * ao);
    albData[i * 4 + 3] = 255;
  }
  // normalna (RG) + szorstkość (B)
  const nrm = new Uint8Array(N * 4);
  const k = 3.2;
  for (let y = 0; y < S; y++) {
    const ym = ((y - 1 + S) % S) * S;
    const yp = ((y + 1) % S) * S;
    const row = y * S;
    for (let x = 0; x < S; x++) {
      const i = row + x;
      const dx = (hgt[row + (x + 1 === S ? 0 : x + 1)] - hgt[row + (x === 0 ? S - 1 : x - 1)]) * 0.5;
      const dy = (hgt[yp + x] - hgt[ym + x]) * 0.5;
      let nx = -dx * k;
      let ny = -dy * k;
      const l = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      nx *= l;
      ny *= l;
      nrm[i * 4] = ((nx * 0.5 + 0.5) * 255 + 0.5) | 0;
      nrm[i * 4 + 1] = ((ny * 0.5 + 0.5) * 255 + 0.5) | 0;
      nrm[i * 4 + 2] = (rgh[i] * 255 + 0.5) | 0;
      nrm[i * 4 + 3] = 255;
    }
  }
  const mk = (data, srgb) => {
    const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 16;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  return { albedo: mk(albData, true), normalRough: mk(nrm, false) };
}

let _turfTex = null;
export function getTurfTextures() {
  if (!_turfTex) _turfTex = makeTurfTextures();
  return _turfTex;
}

/**
 * Murawa na płaskie podłoże (normalna świata +Y). Mapowanie po XZ świata — UV niepotrzebne.
 * opts: tile (rozmiar kafla w metrach, 2.6), tint (0xffffff), dry (kolor suchych łat, 0xd8d070),
 *       lush (kolor bujnych łat, 0x5fae3c), patch (siła łat 0..1, 0.55), normal (siła normalnej, 1.0).
 */
export function turf(opts = {}) {
  const tex = getTurfTextures();
  const mat = new THREE.MeshStandardMaterial({ color: opts.tint ?? 0xffffff, roughness: 1, metalness: 0 });
  const u = {
    uTurfAlb: { value: tex.albedo },
    uTurfNR: { value: tex.normalRough },
    uTurfMacro: { value: getMacroTexture() },
    uTurfTile: { value: 1 / (opts.tile ?? 2.6) },
    uTurfDry: { value: new THREE.Color(opts.dry ?? 0xd8d070) },
    uTurfLush: { value: new THREE.Color(opts.lush ?? 0x5fae3c) },
    uTurfPatch: { value: opts.patch ?? 0.55 },
    uTurfNormal: { value: opts.normal ?? 1.0 },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vTurfXZ;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvTurfXZ = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;');
    let fs = shader.fragmentShader;
    fs = fs.replace(
      '#include <common>',
      /* glsl */ `#include <common>
varying vec2 vTurfXZ;
uniform sampler2D uTurfAlb;
uniform sampler2D uTurfNR;
uniform sampler2D uTurfMacro;
uniform float uTurfTile;
uniform vec3 uTurfDry;
uniform vec3 uTurfLush;
uniform float uTurfPatch;
uniform float uTurfNormal;
vec4 turfNR;
`,
    );
    fs = fs.replace(
      '#include <map_fragment>',
      /* glsl */ `
	vec2 tuv1 = vec2( vTurfXZ.x, - vTurfXZ.y ) * uTurfTile;
	const float TA = 0.6435; // ~36.9°
	mat2 TR = mat2( cos( TA ), sin( TA ), - sin( TA ), cos( TA ) );
	vec2 tuv2 = TR * tuv1 * 0.37 + vec2( 0.21, 0.63 );
	vec3 mac = texture2D( uTurfMacro, vTurfXZ * 0.021 ).rgb;
	vec3 mac2 = texture2D( uTurfMacro, vTurfXZ * 0.0047 + 0.3 ).rgb;
	float tw = clamp( 0.5 + ( mac.r - 0.5 ) * 2.2, 0.15, 0.85 );
	vec3 a1 = texture2D( uTurfAlb, tuv1 ).rgb;
	vec3 a2 = texture2D( uTurfAlb, tuv2 ).rgb;
	vec4 nr1 = texture2D( uTurfNR, tuv1 );
	vec4 nr2 = texture2D( uTurfNR, tuv2 );
	vec3 talb = mix( a1, a2, tw );
	// łaty: suchsze / bujniejsze, bardzo duża skala
	float dryM = smoothstep( 0.52, 0.8, mac.g * 0.6 + mac2.b * 0.6 - 0.1 ) * uTurfPatch;
	float lushM = smoothstep( 0.55, 0.85, 1.0 - mac.b * 0.7 - mac2.g * 0.4 + 0.25 ) * uTurfPatch;
	float lum = dot( talb, vec3( 0.2126, 0.7152, 0.0722 ) );
	talb = mix( talb, uTurfDry * lum * 2.6, dryM * 0.55 );
	talb = mix( talb, uTurfLush * lum * 2.4, lushM * 0.4 );
	talb *= 0.9 + 0.2 * mac2.r;
	diffuseColor.rgb *= talb;
	// normalna z dwóch próbek (druga obrócona z powrotem do osi pierwszej)
	vec2 n1 = nr1.xy * 2.0 - 1.0;
	vec2 n2 = transpose( TR ) * ( nr2.xy * 2.0 - 1.0 );
	turfNR = vec4( mix( n1, n2, tw ), mix( nr1.b, nr2.b, tw ), 1.0 );
`,
    );
    fs = fs.replace(
      '#include <roughnessmap_fragment>',
      `float roughnessFactor = roughness * turfNR.z;`,
    );
    fs = fs.replace(
      '#include <normal_fragment_maps>',
      /* glsl */ `
	{
		vec2 d = turfNR.xy * uTurfNormal;
		vec3 wN = normalize( vec3( d.x, 1.0, d.y ) ); // T = +X, B = -Z (v = -z), N = +Y
		normal = normalize( ( viewMatrix * vec4( wN, 0.0 ) ).xyz );
	}
`,
    );
    shader.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => 'sm-turf-1';
  mat.userData.smKind = 'turf';
  STATE.set(mat, { cfg: { kind: 'turf' }, uniforms: u });
  return mat;
}

/** Lista fabryk (do podglądu/testów). */
export const MATERIAL_KINDS = ['skin', 'fabric', 'leather', 'rubber', 'plastic', 'metal', 'hair', 'eye', 'lens', 'emissive', 'turf'];
