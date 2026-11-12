import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as M from '../style/materials.js';

export const RARITY = {
  common: { label: 'Zwykły', color: 0x9aa3ad },
  uncommon: { label: 'Niepospolity', color: 0x4fcf3a },
  rare: { label: 'Rzadki', color: 0x3d8bff },
  epic: { label: 'Epicki', color: 0xb25cff },
  legendary: { label: 'Legendarny', color: 0xffa630 },
};

// =====================================================================================
//  Tekstury błysku (generowane raz, współdzielone)
// =====================================================================================

let flashTex = null;
function getFlashTextures() {
  if (flashTex) return flashTex;
  // gwiazda — widok od czoła lufy
  const c1 = document.createElement('canvas');
  c1.width = c1.height = 128;
  let g = c1.getContext('2d');
  g.translate(64, 64);
  for (let i = 0; i < 5; i++) {
    g.save();
    g.rotate((i / 5) * Math.PI * 2);
    const gr = g.createLinearGradient(0, 0, 0, -62);
    gr.addColorStop(0, 'rgba(255,240,200,1)');
    gr.addColorStop(0.5, 'rgba(255,170,60,0.75)');
    gr.addColorStop(1, 'rgba(255,90,10,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(-9, 0);
    g.quadraticCurveTo(-3, -30, 0, -62);
    g.quadraticCurveTo(3, -30, 9, 0);
    g.closePath();
    g.fill();
    g.restore();
  }
  let rg = g.createRadialGradient(0, 0, 0, 0, 0, 40);
  rg.addColorStop(0, 'rgba(255,255,245,1)');
  rg.addColorStop(0.3, 'rgba(255,225,140,0.9)');
  rg.addColorStop(0.7, 'rgba(255,140,40,0.35)');
  rg.addColorStop(1, 'rgba(255,80,0,0)');
  g.fillStyle = rg;
  g.beginPath();
  g.arc(0, 0, 40, 0, Math.PI * 2);
  g.fill();

  // płomień boczny — wydłużony język ognia (oś V = wzdłuż lufy, początek na dole)
  const c2 = document.createElement('canvas');
  c2.width = 64;
  c2.height = 128;
  g = c2.getContext('2d');
  const lobes = [
    [0, 1, 1],
    [-10, 0.62, 0.7],
    [10, 0.55, 0.7],
  ];
  for (const [ox, len, a] of lobes) {
    const gr = g.createLinearGradient(0, 128, 0, 128 - 124 * len);
    gr.addColorStop(0, `rgba(255,250,220,${a})`);
    gr.addColorStop(0.35, `rgba(255,190,80,${0.85 * a})`);
    gr.addColorStop(1, 'rgba(255,90,10,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(32 + ox - 14, 128);
    g.quadraticCurveTo(32 + ox - 12, 128 - 70 * len, 32 + ox * 1.6, 128 - 124 * len);
    g.quadraticCurveTo(32 + ox + 12, 128 - 70 * len, 32 + ox + 14, 128);
    g.closePath();
    g.fill();
  }
  rg = g.createRadialGradient(32, 122, 0, 32, 122, 26);
  rg.addColorStop(0, 'rgba(255,255,240,1)');
  rg.addColorStop(1, 'rgba(255,200,100,0)');
  g.fillStyle = rg;
  g.fillRect(0, 90, 64, 38);

  flashTex = [new THREE.CanvasTexture(c1), new THREE.CanvasTexture(c2)];
  for (const t of flashTex) t.colorSpace = THREE.SRGBColorSpace;
  return flashTex;
}

// =====================================================================================
//  Narzędzia geometrii: kształty z zaokrąglonymi narożnikami, wyciągnięcia z fazą,
//  wygładzone normalne z zachowaniem ostrych krawędzi, przetarcia lakieru na krawędziach
// =====================================================================================

/** Ścieżka z punktów [x, y, r?] — każdy narożnik zaokrąglony promieniem r (domyślnie defR). */
function roundedPath(pts, defR, PathClass) {
  const p = new PathClass();
  const n = pts.length;
  const V = (q) => new THREE.Vector2(q[0], q[1]);
  for (let i = 0; i < n; i++) {
    const p0 = V(pts[(i - 1 + n) % n]);
    const p1 = V(pts[i]);
    const p2 = V(pts[(i + 1) % n]);
    const d0 = p0.clone().sub(p1);
    const d2 = p2.clone().sub(p1);
    const r = Math.min(pts[i][2] ?? defR, d0.length() * 0.49, d2.length() * 0.49);
    if (r <= 1e-5) {
      if (i === 0) p.moveTo(p1.x, p1.y);
      else p.lineTo(p1.x, p1.y);
      continue;
    }
    const a = p1.clone().add(d0.normalize().multiplyScalar(r));
    const b = p1.clone().add(d2.normalize().multiplyScalar(r));
    if (i === 0) p.moveTo(a.x, a.y);
    else p.lineTo(a.x, a.y);
    p.quadraticCurveTo(p1.x, p1.y, b.x, b.y);
  }
  p.closePath();
  return p;
}

function shapeOf(pts, r, holes = []) {
  const s = roundedPath(pts, r, THREE.Shape);
  for (const h of holes) s.holes.push(roundedPath(h, r * 0.8, THREE.Path));
  return s;
}

/**
 * Wyciągnięcie profilu bocznego: punkty [z, y, r?] (widok z boku), grubość wzdłuż X, wycentrowane.
 * Krawędzie sfazowane — skrajny obrys pokrywa się dokładnie z podanym profilem.
 */
function sideExtrude(pts, width, { r = 0.006, bevel = 0.004, holes = [], curve = 3, seg = 2 } = {}) {
  const depth = Math.max(0.0005, width - 2 * bevel);
  const geo = new THREE.ExtrudeGeometry(shapeOf(pts, r, holes), {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: seg,
    curveSegments: curve,
  });
  geo.translate(0, 0, -depth / 2);
  geo.rotateY(-Math.PI / 2); // x kształtu → z świata, głębokość → x świata
  geo.userData.wear = 'x';
  return geo;
}

/** Wyciągnięcie profilu czołowego: punkty [x, y, r?], długość wzdłuż Z, wycentrowane. */
function frontExtrude(pts, length, opts = {}) {
  const { r = 0.006, bevel = 0.003, holes = [], curve = 4, seg = 2 } = opts;
  const depth = Math.max(0.0005, length - 2 * bevel);
  const geo = new THREE.ExtrudeGeometry(shapeOf(pts, r, holes), {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: seg,
    curveSegments: curve,
  });
  geo.translate(0, 0, -depth / 2);
  geo.userData.wear = 'z';
  return geo;
}

function rbox(w, h, d, r, seg = 1) {
  const g = new RoundedBoxGeometry(w, h, d, seg, r);
  g.userData.wear = 'box';
  return g;
}

/** Profil obrotowy wokół osi Z (lufa): punkty [r, z], z rosnące w stronę kolby. */
function latheZ(profile, seg = 20) {
  const g = new THREE.LatheGeometry(
    profile.map(([r, z]) => new THREE.Vector2(r, z)),
    seg,
  );
  g.rotateX(Math.PI / 2); // oś Y profilu → +Z (czubek przy z = 0, w stronę kolby rośnie z)
  g.userData.wear = 'lathe';
  return g;
}

/**
 * Normalne wygładzane w obrębie kąta `angle` (ważone polem ścianek), ostre krawędzie zostają.
 * Duże płaskie ścianki dominują, więc fazy są gładkie, a płaszczyzny — płaskie.
 */
function creasedNormals(geo, angle = 50) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  // usuń zdegenerowane trójkąty (np. bieguny toczenia) — dałyby zerowe normalne → NaN w shaderze
  const src = g.attributes.position.array;
  const keep = [];
  for (let t = 0; t < src.length / 9; t++) {
    const o = t * 9;
    const ux = src[o + 3] - src[o], uy = src[o + 4] - src[o + 1], uz = src[o + 5] - src[o + 2];
    const vx = src[o + 6] - src[o], vy = src[o + 7] - src[o + 1], vz = src[o + 8] - src[o + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * cx + cy * cy + cz * cz > 1e-18) keep.push(t);
  }
  const pos = new Float32Array(keep.length * 9);
  keep.forEach((t, i) => pos.set(src.subarray(t * 9, t * 9 + 9), i * 9));
  const nTri = keep.length;
  const fn = new Float32Array(nTri * 3);
  const fu = new Float32Array(nTri * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let t = 0; t < nTri; t++) {
    a.fromArray(pos, t * 9);
    b.fromArray(pos, t * 9 + 3);
    c.fromArray(pos, t * 9 + 6);
    b.sub(a);
    c.sub(a);
    b.cross(c); // |b| = 2·pole
    fn[t * 3] = b.x;
    fn[t * 3 + 1] = b.y;
    fn[t * 3 + 2] = b.z;
    const l = b.length() || 1;
    fu[t * 3] = b.x / l;
    fu[t * 3 + 1] = b.y / l;
    fu[t * 3 + 2] = b.z / l;
  }
  const key = (i) => `${Math.round(pos[i] * 1e5)},${Math.round(pos[i + 1] * 1e5)},${Math.round(pos[i + 2] * 1e5)}`;
  const map = new Map();
  for (let v = 0; v < nTri * 3; v++) {
    const k = key(v * 3);
    let l = map.get(k);
    if (!l) map.set(k, (l = []));
    l.push(v / 3 | 0);
  }
  const cosA = Math.cos((angle * Math.PI) / 180);
  const nrm = new Float32Array(pos.length);
  for (let v = 0; v < nTri * 3; v++) {
    const t = (v / 3) | 0;
    const l = map.get(key(v * 3));
    let x = 0, y = 0, z = 0;
    for (const f of l) {
      const d = fu[t * 3] * fu[f * 3] + fu[t * 3 + 1] * fu[f * 3 + 1] + fu[t * 3 + 2] * fu[f * 3 + 2];
      if (d < cosA) continue;
      x += fn[f * 3];
      y += fn[f * 3 + 1];
      z += fn[f * 3 + 2];
    }
    const len = Math.hypot(x, y, z) || 1;
    nrm[v * 3] = x / len;
    nrm[v * 3 + 1] = y / len;
    nrm[v * 3 + 2] = z / len;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.userData = { ...geo.userData };
  return out;
}

// prosty szum wartości 3D (deterministyczny) — plamistość przetarć
function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  let r = 0;
  for (let k = 0; k < 8; k++) {
    const dx = k & 1, dy = (k >> 1) & 1, dz = (k >> 2) & 1;
    const w = (dx ? sx : 1 - sx) * (dy ? sy : 1 - sy) * (dz ? sz : 1 - sz);
    r += w * hash3(ix + dx, iy + dy, iz + dz);
  }
  return r;
}
const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Siła przetarcia krawędzi 0..1 z normalnej w lokalnym układzie części. */
function edgeWear(mode, nx, ny, nz) {
  const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
  if (mode === 'x') return smooth(0.12, 0.35, ax) * (1 - smooth(0.82, 0.97, ax));
  if (mode === 'z') return smooth(0.12, 0.35, az) * (1 - smooth(0.82, 0.97, az));
  if (mode === 'box') {
    const s = [ax, ay, az].sort((p, q) => q - p);
    return smooth(0.18, 0.45, s[1]);
  }
  if (mode === 'lathe') return smooth(0.2, 0.45, az) * (1 - smooth(0.8, 0.96, az));
  return 0;
}

const _m4 = new THREE.Matrix4();
const _q4 = new THREE.Quaternion();
const _e4 = new THREE.Euler();
const _s4 = new THREE.Vector3(1, 1, 1);
const _p4 = new THREE.Vector3();

// =====================================================================================
//  Karabin
// =====================================================================================

/**
 * Karabin szturmowy — jedyna broń na tym etapie.
 * Lufa skierowana w -Z, początek układu = chwyt pistoletowy (prawa dłoń).
 * Bryły: profile wyciągane z fazą + zaokrąglone prostopadłościany, scalone per materiał
 * (kilka draw calli). Lakier ma jaśniejsze przetarcia na krawędziach (kolor wierzchołków).
 */
export class AssaultRifle {
  constructor({ rarity = 'rare' } = {}) {
    this.name = 'Karabin szturmowy';
    this.rarity = rarity;
    this.stats = {
      damage: 30,
      headMultiplier: 1.5,
      fireRate: 5.5, // strzały / s
      magSize: 30,
      reloadTime: 2.1,
      range: 300,
    };
    this.mag = this.stats.magSize;
    this.reloading = false;
    this.reloadT = 0;
    this.cooldown = 0;
    this.bloom = 0;
    this.timeSinceShot = 10;
    this.flashTimer = 0;

    this.group = new THREE.Group();
    this.materials = [];
    this.triangles = 0;
    this.partStats = []; // [materiał, trójkąty, pozycja] — diagnostyka budżetu
    this.build();
  }

  get reloadProgress() {
    return this.reloading ? Math.min(1, this.reloadT / this.stats.reloadTime) : -1;
  }

  /** Rejestruje materiał broni; wear = kolor przetarcia (sRGB), amount = siła. */
  defMat(key, mat, wear = null, amount = 0) {
    this.materials.push(mat);
    this._mats[key] = { mat, wear, amount, base: mat.color.clone() };
    return mat;
  }

  /** Dodaje część do kubełka materiału (scalane w build()). */
  add(target, key, geo, pos = [0, 0, 0], rot = [0, 0, 0], { crease = 50, wear = 1 } = {}) {
    const info = this._mats[key];
    const g = creasedNormals(geo, crease);
    geo.dispose();
    const n = g.attributes.normal.array;
    const p = g.attributes.position.array;
    const cnt = p.length / 3;
    const col = new Float32Array(cnt * 3);
    // współczynnik koloru: 1 = baza, krawędź → kolor przetarcia (mnożnik względem bazy)
    const ratio = [1, 1, 1];
    if (info.wear !== null) {
      const w = new THREE.Color(info.wear);
      ratio[0] = w.r / Math.max(0.004, info.base.r);
      ratio[1] = w.g / Math.max(0.004, info.base.g);
      ratio[2] = w.b / Math.max(0.004, info.base.b);
    }
    const mode = g.userData.wear;
    for (let i = 0; i < cnt; i++) {
      let t = 0;
      if (info.wear !== null && wear > 0) {
        const e = edgeWear(mode, n[i * 3], n[i * 3 + 1], n[i * 3 + 2]);
        if (e > 0) {
          const nz = noise3(p[i * 3] * 70 + pos[0] * 9, p[i * 3 + 1] * 70 + pos[1] * 9, p[i * 3 + 2] * 70 + pos[2] * 9);
          t = e * smooth(0.28, 0.62, nz) * info.amount * wear;
        }
      }
      col[i * 3] = 1 + (ratio[0] - 1) * t;
      col[i * 3 + 1] = 1 + (ratio[1] - 1) * t;
      col[i * 3 + 2] = 1 + (ratio[2] - 1) * t;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    _q4.setFromEuler(_e4.set(rot[0], rot[1], rot[2]));
    _m4.compose(_p4.set(pos[0], pos[1], pos[2]), _q4, _s4);
    g.applyMatrix4(_m4);
    const bucket = target === 'mag' ? this._magBuckets : this._buckets;
    (bucket[key] ||= []).push(g);
    this.partStats.push([key, g.attributes.position.count / 3, pos.join(',')]);
    return g;
  }

  flush(parent, buckets) {
    for (const key of Object.keys(buckets)) {
      const geo = mergeGeometries(buckets[key], false);
      for (const g of buckets[key]) g.dispose();
      const mesh = new THREE.Mesh(geo, this._mats[key].mat);
      mesh.name = 'karabin-' + key;
      mesh.castShadow = this._mats[key].mat.transparent !== true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      this.triangles += geo.attributes.position.count / 3;
    }
  }

  build() {
    const g = this.group;
    this._mats = {};
    this._buckets = {};
    this._magBuckets = {};
    const VC = { vertexColors: true, vertexColorMode: 'color' };
    const rar = RARITY[this.rarity]?.color ?? RARITY.rare.color;
    const rarLight = new THREE.Color(rar).lerp(new THREE.Color(0xe8eef6), 0.55).getHex();

    // ---- materiały ----
    this.defMat('gun', M.metal(0x434b5a, { painted: true, ...VC, roughness: 0.46, detail: 0.45, scale: 4 }), 0xa9b1bd, 0.9);
    this.defMat('accent', M.metal(rar, { painted: true, ...VC, roughness: 0.38, detail: 0.4, scale: 4 }), rarLight, 0.8);
    this.defMat('poly', M.plastic(0x24272e, { ...VC, roughness: 0.62, scale: 9 }), 0x5a606b, 0.55);
    this.defMat('rubber', M.rubber(0x1b1c20, { ...VC, scale: 30, detail: 1.6 }), null);
    this.defMat('steel', M.metal(0x5b6069, { ...VC, roughness: 0.36 }), 0xb7bcc4, 0.6);
    this.defMat('black', M.plastic(0x0d0e11, { ...VC, roughness: 0.75 }), null);
    // szkiełko kolimatora (lekko bursztynowo-niebieskie, przezroczyste)
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x7fd8ff,
      roughness: 0.04,
      metalness: 0,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      emissive: 0x0a2a3a,
      emissiveIntensity: 0.4,
    });
    this.materials.push(glass);
    const dotMat = M.emissive(0xff1030, 14);
    this.materials.push(dotMat);

    const A = (k, geo, pos, rot, o) => this.add('main', k, geo, pos, rot, o);

    // ---- komora górna ----
    A('gun', sideExtrude([[0.075, 0.035], [0.075, 0.108], [-0.255, 0.108], [-0.275, 0.09], [-0.275, 0.035]], 0.062, { r: 0.012, bevel: 0.006, seg: 2 }));
    // płyty boczne w kolorze rzadkości (wystają po 3 mm)
    A('accent', sideExtrude([[0.05, 0.048, 0.008], [0.05, 0.098], [-0.12, 0.098], [-0.15, 0.076], [-0.235, 0.076], [-0.235, 0.048]], 0.068, { r: 0.008, bevel: 0.0025 }));
    // okno wyrzutnika (prawa strona, +X) + osłona
    A('black', rbox(0.006, 0.026, 0.07, 0.0025), [0.0345, 0.062, -0.035], [0, 0, 0], { wear: 0 });
    A('steel', rbox(0.007, 0.007, 0.05, 0.003), [0.036, 0.081, -0.035]);
    // rączka przeładowania (z tyłu, na górze)
    A('poly', sideExtrude([[0.085, 0.112], [0.085, 0.095], [0.06, 0.095], [0.055, 0.112]], 0.05, { r: 0.004, bevel: 0.003 }));
    A('poly', rbox(0.072, 0.012, 0.016, 0.005), [0, 0.104, 0.078]);
    // szyna górna (komora + łoże)
    A('gun', rbox(0.034, 0.014, 0.6, 0.004), [0, 0.112, -0.245]);
    // ząbki szyny — jeden profil grzebieniowy zamiast 26 osobnych brył
    const teeth = [];
    for (let i = 0; i < 26; i++) {
      const z = 0.05 - i * 0.022;
      teeth.push([z, 0.118, 0], [z, 0.125, 0.002], [z - 0.011, 0.125, 0.002], [z - 0.011, 0.118, 0]);
    }
    teeth.push([teeth[teeth.length - 1][0], 0.114, 0], [0.05, 0.114, 0]);
    A('steel', sideExtrude(teeth, 0.04, { r: 0, bevel: 0.002, seg: 1, curve: 1 }), [0, 0, 0], [0, 0, 0], { wear: 0.6 });

    // ---- komora dolna + gniazdo magazynka ----
    A('gun', sideExtrude([[0.07, 0.045], [0.07, 0.008], [0.0, -0.012], [-0.105, -0.012], [-0.122, -0.045, 0.008], [-0.228, -0.045, 0.008], [-0.236, 0.0], [-0.236, 0.045]], 0.058, { r: 0.01, bevel: 0.005, seg: 2 }));
    // obramowanie gniazda (kolor rzadkości)
    A('accent', sideExtrude([[-0.118, -0.03], [-0.122, -0.052], [-0.232, -0.052], [-0.236, -0.03]], 0.064, { r: 0.006, bevel: 0.003 }));
    // przycisk zwalniania magazynka + bezpiecznik
    A('steel', new THREE.CylinderGeometry(0.007, 0.007, 0.066, 12).rotateZ(Math.PI / 2), [0, 0.012, -0.11], [0, 0, 0], { crease: 40 });
    A('steel', rbox(0.066, 0.01, 0.022, 0.004), [0, 0.03, 0.03]);

    // ---- chwyt pistoletowy (żłobienia na palce) + okładzina gumowa ----
    A('poly', sideExtrude([[-0.024, 0.004], [-0.012, -0.03, 0.01], [-0.004, -0.05, 0.008], [-0.008, -0.068, 0.008], [0.004, -0.09, 0.008], [0.0, -0.11, 0.008], [0.016, -0.145, 0.01], [0.082, -0.15, 0.012], [0.07, -0.08, 0.02], [0.056, 0.004]], 0.046, { r: 0.006, bevel: 0.007, seg: 2 }));
    A('rubber', sideExtrude([[0.014, -0.03], [0.05, -0.03], [0.064, -0.11], [0.064, -0.135], [0.03, -0.135], [0.018, -0.1]], 0.05, { r: 0.008, bevel: 0.003 }));
    // kabłąk spustu (z otworem) + spust
    A('poly', sideExtrude([[-0.012, -0.008], [-0.012, -0.052], [-0.075, -0.052, 0.014], [-0.098, -0.008]], 0.012, {
      r: 0.012, bevel: 0.003,
      holes: [[[-0.02, -0.012], [-0.02, -0.042], [-0.07, -0.042, 0.01], [-0.085, -0.012]]],
    }));
    A('steel', sideExtrude([[-0.03, -0.006], [-0.04, -0.02, 0.006], [-0.034, -0.038, 0.004], [-0.04, -0.038], [-0.05, -0.02, 0.008], [-0.04, -0.006]], 0.008, { r: 0.002, bevel: 0.0015 }), [0, 0, 0], [0, 0, 0], { wear: 0 });

    // ---- łoże (polimer) z płytami wentylowanymi w kolorze rzadkości ----
    A('poly', sideExtrude([[-0.255, 0.104], [-0.535, 0.1], [-0.555, 0.078], [-0.555, 0.02], [-0.535, -0.006], [-0.255, -0.006]], 0.078, { r: 0.014, bevel: 0.01, seg: 2 }));
    const slots = [];
    for (let i = 0; i < 4; i++) {
      const z0 = -0.312 - i * 0.052;
      slots.push([[z0, 0.06], [z0 - 0.034, 0.06], [z0 - 0.034, 0.042], [z0, 0.042]]);
    }
    A('accent', sideExtrude([[-0.285, 0.084, 0.012], [-0.52, 0.084, 0.012], [-0.528, 0.02, 0.01], [-0.285, 0.02, 0.012]], 0.086, { r: 0.012, bevel: 0.003, holes: slots }));
    // podkładka pod lewą dłoń (gumowane prążki pod spodem)
    for (let i = 0; i < 5; i++) A('rubber', rbox(0.06, 0.008, 0.014, 0.0035, 1), [0, -0.008, -0.29 - i * 0.026]);
    // gniazdo pod łożem — zaczep paska
    A('steel', new THREE.TorusGeometry(0.01, 0.003, 6, 12), [-0.041, 0.04, -0.52], [0, Math.PI / 2, 0], { crease: 60 });

    // ---- lufa, blok gazowy, urządzenie wylotowe ----
    A('steel', new THREE.CylinderGeometry(0.0145, 0.0145, 0.14, 14).rotateX(Math.PI / 2), [0, 0.05, -0.6], [0, 0, 0], { crease: 40 });
    A('gun', rbox(0.04, 0.042, 0.03, 0.009), [0, 0.06, -0.572]);
    A('steel', latheZ([
      [0.0, 0.035], [0.0075, 0.035], [0.0075, 0.0], [0.016, 0.0], [0.024, 0.006], [0.025, 0.018], [0.021, 0.022], [0.021, 0.028], [0.025, 0.032],
      [0.025, 0.05], [0.021, 0.054], [0.021, 0.06], [0.025, 0.064], [0.025, 0.08], [0.019, 0.086], [0.016, 0.09], [0.0, 0.09],
    ], 20), [0, 0.05, -0.72], [0, 0, 0], { crease: 35 });
    // pierścień w kolorze rzadkości + szczeliny kompensatora
    A('accent', new THREE.TorusGeometry(0.0225, 0.0035, 6, 16), [0, 0.05, -0.663], [0, 0, 0], { crease: 70 });
    for (const [ang, z] of [[0, -0.7], [0, -0.682], [0.9, -0.692], [-0.9, -0.692]]) {
      const d = new THREE.Vector3(Math.sin(ang), Math.cos(ang), 0);
      A('black', rbox(0.011, 0.01, 0.01, 0.0035, 1), [d.x * 0.0205, 0.05 + d.y * 0.0205, z], [0, 0, -ang], { wear: 0 });
    }

    // ---- kolba szkieletowa ----
    A('gun', sideExtrude([[0.065, 0.108], [0.27, 0.094], [0.296, 0.09, 0.01], [0.296, -0.06, 0.012], [0.255, -0.066, 0.02], [0.13, -0.006, 0.03], [0.065, 0.006]], 0.052, {
      r: 0.012, bevel: 0.008, seg: 2, curve: 4,
      holes: [[[0.125, 0.07, 0.02], [0.245, 0.064, 0.016], [0.25, -0.032, 0.012], [0.205, -0.036, 0.03]]],
    }));
    // grzebień policzka w kolorze rzadkości
    A('accent', sideExtrude([[0.11, 0.1], [0.26, 0.093], [0.276, 0.08], [0.11, 0.08]], 0.058, { r: 0.008, bevel: 0.004 }));
    // stopka gumowa
    A('rubber', sideExtrude([[0.288, 0.098], [0.312, 0.098], [0.314, -0.07], [0.288, -0.072]], 0.058, { r: 0.008, bevel: 0.005 }));
    for (let i = 0; i < 6; i++) A('black', rbox(0.05, 0.004, 0.006, 0.002, 1), [0, 0.07 - i * 0.026, 0.3125], [0, 0, 0], { wear: 0 });

    // ---- kolimator ----
    const sy = 0.158; // wysokość osi celownika
    A('gun', rbox(0.04, 0.018, 0.085, 0.005), [0, 0.135, -0.07]);
    A('steel', new THREE.CylinderGeometry(0.006, 0.006, 0.06, 10).rotateZ(Math.PI / 2), [0, 0.13, -0.05], [0, 0, 0], { crease: 40 });
    // tubus z otworem na wylot
    const hood = [[-0.028, -0.025, 0.014], [0.028, -0.025, 0.014], [0.028, 0.026, 0.016], [-0.028, 0.026, 0.016]];
    const hole = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      hole.push([Math.cos(a) * 0.0195, Math.sin(a) * 0.0185 + 0.001, 0]);
    }
    A('poly', frontExtrude(hood, 0.072, { r: 0.014, bevel: 0.004, holes: [hole], curve: 4, seg: 2 }), [0, sy, -0.072]);
    A('accent', frontExtrude([[-0.02, -0.004], [0.02, -0.004], [0.02, 0.004], [-0.02, 0.004]], 0.05, { r: 0.004, bevel: 0.002 }), [0, sy + 0.028, -0.068]);
    // pokrętło jasności (prawa strona)
    A('steel', new THREE.CylinderGeometry(0.009, 0.009, 0.012, 14).rotateZ(Math.PI / 2), [0.033, sy - 0.004, -0.06], [0, 0, 0], { crease: 40 });
    A('accent', new THREE.CylinderGeometry(0.0045, 0.0045, 0.004, 10).rotateZ(Math.PI / 2), [0.04, sy - 0.004, -0.06], [0, 0, 0], { crease: 40 });

    // ---- magazynek (osobna grupa — animowany przy przeładowaniu) ----
    this.magRest = new THREE.Vector3(0, -0.01, -0.17);
    this.magGroup = new THREE.Group();
    this.magGroup.position.copy(this.magRest);
    g.add(this.magGroup);
    const MG = (k, geo, pos, rot, o) => this.add('mag', k, geo, pos, rot, o);
    // łukowaty korpus: tył (z+) i przód (z-) wygięte do przodu ku dołowi
    MG('gun', sideExtrude([
      [0.038, 0.0, 0.004], [0.036, -0.06, 0.03], [0.02, -0.12, 0.04], [-0.006, -0.172, 0.01],
      [-0.075, -0.158, 0.01], [-0.06, -0.1, 0.04], [-0.048, -0.04, 0.03], [-0.046, 0.0, 0.004],
    ], 0.042, { r: 0.01, bevel: 0.005, seg: 2, curve: 4 }));
    // prążki usztywniające (polimer)
    MG('poly', sideExtrude([[0.0, -0.02], [0.005, -0.075, 0.02], [-0.02, -0.13, 0.02], [-0.04, -0.125, 0.02], [-0.022, -0.075, 0.02], [-0.02, -0.02]], 0.046, { r: 0.008, bevel: 0.003 }));
    // stopka w kolorze rzadkości
    MG('accent', sideExtrude([[0.0, -0.162, 0.006], [-0.084, -0.146, 0.006], [-0.09, -0.17, 0.008], [-0.004, -0.19, 0.008]], 0.05, { r: 0.008, bevel: 0.004 }));

    this.flush(g, this._buckets);
    this.flush(this.magGroup, this._magBuckets);

    // szkiełko + czerwona kropka (bez cieni, poza AO)
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.0196, 24), glass);
    lens.position.set(0, sy + 0.001, -0.095);
    lens.renderOrder = 2;
    g.add(lens);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0021, 8, 6), dotMat);
    dot.position.set(0, sy + 0.001, -0.094);
    g.add(dot);
    // delikatna poświata kropki widoczna z bliska
    this.triangles += 24 + 8 * 6 * 2;

    delete this._buckets;
    delete this._magBuckets;

    // punkty zaczepienia
    const pt = (x, y, z) => {
      const o = new THREE.Object3D();
      o.position.set(x, y, z);
      g.add(o);
      return o;
    };
    this.muzzle = pt(0, 0.05, -0.722);
    this.gripR = pt(0, -0.045, 0.03);
    this.gripL = pt(0, -0.03, -0.34);
    this.magGrab = new THREE.Vector3(0, -0.2, -0.2);

    // ---- błysk z lufy: warstwowe karty addytywne (gwiazda czołowa, 2 języki boczne, rdzeń) ----
    const [starTex, flameTex] = getFlashTextures();
    const fmat = (map, k) => {
      const m = new THREE.MeshBasicMaterial({
        map,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      });
      m.color.setRGB(3.2 * k, 2.6 * k, 1.9 * k); // HDR → łapie bloom
      m.userData.baseColor = m.color.clone();
      return m;
    };
    this._flashMats = [fmat(starTex, 1), fmat(flameTex, 1)];
    this.flash = new THREE.Group();
    this.flash.position.copy(this.muzzle.position);
    this.flash.userData.noAO = true;
    const star = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), this._flashMats[0]);
    star.position.z = -0.01;
    const flameGeo = new THREE.PlaneGeometry(0.13, 0.36).translate(0, 0.18, 0).rotateX(-Math.PI / 2);
    const f1 = new THREE.Mesh(flameGeo, this._flashMats[1]);
    const f2 = new THREE.Mesh(flameGeo, this._flashMats[1]);
    f2.rotation.z = Math.PI / 2;
    this._flashStar = star;
    this._flashFlames = [f1, f2];
    for (const m of [star, f1, f2]) {
      m.renderOrder = 5;
      m.frustumCulled = false;
      m.castShadow = false;
      m.userData.noAO = true;
    }
    this.flash.add(star, f1, f2);
    this.flash.visible = false;
    g.add(this.flash);

    this.flashLight = new THREE.PointLight(0xffa850, 0, 6, 2);
    this.flashLight.position.copy(this.muzzle.position).add(new THREE.Vector3(0, 0.02, -0.06));
    g.add(this.flashLight);
  }

  showFlash() {
    this.flashTimer = 0.055;
    this.flash.visible = true;
    this.flash.rotation.z = Math.random() * Math.PI * 2;
    const s = 0.8 + Math.random() * 0.4;
    this.flash.scale.setScalar(s);
    this._flashStar.rotation.z = Math.random() * Math.PI;
    for (const f of this._flashFlames) f.scale.set(0.8 + Math.random() * 0.4, 1, 0.75 + Math.random() * 0.6);
    for (const m of this._flashMats) m.color.copy(m.userData.baseColor);
    this.flashLight.intensity = 14;
  }

  update(dt) {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      const k = Math.min(1, Math.max(0, this.flashTimer / 0.055));
      for (const m of this._flashMats) m.color.copy(m.userData.baseColor).multiplyScalar(0.35 + 0.65 * k);
      this.flashLight.intensity = 14 * k * k;
      if (this.flashTimer <= 0) {
        this.flash.visible = false;
        this.flashLight.intensity = 0;
      }
    }
  }
}
