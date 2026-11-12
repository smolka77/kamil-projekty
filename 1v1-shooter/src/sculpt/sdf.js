/**
 * sculpt/sdf.js — prymitywy SDF (signed distance field), operacje CSG i ich kompilacja
 * do płaskich tablic typowanych z siatką bloków (szybka, wsadowa ewaluacja).
 *
 * KONWENCJE
 *  - Jednostki: metry. Wszystkie prymitywy podaje się w przestrzeni "bind pose" postaci
 *    (stopy na y = 0, postać patrzy w -Z, lewa strona postaci = x < 0 = sufiks kości 'L',
 *    prawa = x > 0 = sufiks 'R').
 *  - SDF < 0 wewnątrz, > 0 na zewnątrz.
 *  - Punkty: [x, y, z] albo THREE.Vector3. Rotacje (`rot`): [x, y, z] (Euler XYZ, radiany),
 *    [x, y, z, 'YXZ'] (Euler z kolejnością), [x, y, z, w] (kwaternion), THREE.Euler, THREE.Quaternion.
 *  - Kolory (`color`, tylko op 'paint'): liczba hex / string CSS / THREE.Color (sRGB → liniowy)
 *    albo tablica [r, g, b] (już liniowa, 0..1).
 *
 * PRYMITYWY (każdy zwraca obiekt-węzeł; ostatni argument to `opts`):
 *  sphere(c, r) · ellipsoid(c, [rx,ry,rz]) · capsule(a, b, r) · roundCone(a, b, ra, rb)
 *  roundBox(c, [hx,hy,hz], rounding) · torus(c, R, r)  (pierścień w lokalnej płaszczyźnie XZ)
 *  cylinder(a, b, r, rounding) · plane(point, normal)  (półprzestrzeń, tylko do 'sub'/'int')
 *  tube(points, radii) · bezierTube([p0,p1,p2(,p3)], r0, r1, {segments})  → tablice roundCone
 *
 * WSPÓLNE OPCJE `opts`:
 *  bone      nazwa kości (wagi skinningu); brak → dziedziczona z grupy / warstwy
 *  op        'add' (domyślnie) | 'sub' | 'int' | 'paint' (tylko kolor, nie zmienia kształtu)
 *  k         promień gładkiego łączenia z dotychczasowym kształtem (m); brak → `blend` grupy/warstwy
 *  rot       rotacja wokół środka prymitywu (dla capsule/roundCone/cylinder: wokół środka odcinka)
 *  squash    { dir:[x,y,z], factor } — spłaszczenie wzdłuż kierunku (wokół środka prymitywu)
 *  xform     THREE.Matrix4 doklejona na końcu (lokalny → świat)
 *  inflate   dodatkowe "napompowanie" (m), d -= inflate
 *  skin      false → prymityw nie wpływa na wagi skinningu
 *  skinBias  przesunięcie odległości dla wag (m; ujemne = silniejszy wpływ kości)
 *  color, soft, strength — dla op 'paint': kolor, szerokość miękkiej krawędzi (m), siła 0..1
 *
 * GRUPY: group(children, { op, k, blend, shell, bone }) — dzieci liczone we własnym akumulatorze,
 *  wynik łączony z rodzicem operacją `op` z promieniem `k`. `blend` = domyślne k dla dzieci.
 *  `shell`: liczba (grubość ścianki) albo { thickness, offset } → d = |d - offset| - thickness/2
 *  (offset = +thickness/2 kładzie ściankę NA ZEWNĄTRZ oryginalnej powierzchni).
 *  shell(children, thickness, opts) to skrót. Ewaluacja jest sekwencyjna: d = op(d, dziecko).
 *
 * POMOCNICZE: frame(matrix | {pos, rot, scale}, children) — przenosi dzieci z ramki lokalnej do świata
 *  (skala może być niejednorodna: powierzchnia zerowa jest dokładna, odległość ograniczona z dołu).
 *  mirror(children) — lustro względem x = 0 z zamianą sufiksów kości L<->R; both(children) = [...c, ...mirror(c)].
 *
 * KOMPILACJA: compileField(nodes, { voxel, blockCells=16, pad, blend, bone, bounds }) → Field.
 *  Field trzyma płaskie tablice prymitywów, instrukcje (PRIM/PUSH/POP) i dla każdego bloku
 *  (blockCells³ wokseli) skompaktowany program zawierający tylko prymitywy, których AABB
 *  (powiększone o promienie łączenia, grubości skorup i margines) przecina blok.
 *  evalPoints(field, xs, ys, zs, n, out, { min }) — ewaluacja wielu punktów (kubełkowanie po blokach).
 *  evalPoint(field, x, y, z) — pojedynczy punkt (debug / umieszczanie akcesoriów).
 */
import * as THREE from 'three';

export const BIG = 1e4;

// typy prymitywów
export const SPHERE = 0;
export const ELLIPSOID = 1;
export const CAPSULE = 2;
export const ROUNDCONE = 3;
export const ROUNDBOX = 4;
export const TORUS = 5;
export const CYLINDER = 6;
export const PLANE = 7;

const PS = 16; // rozmiar bloku parametrów prymitywu

export const OP_ADD = 0;
export const OP_SUB = 1;
export const OP_INT = 2;
export const OP_PAINT = 3;
const OP_CODES = { add: 0, union: 0, sub: 1, subtract: 1, int: 2, intersect: 2, paint: 3 };

const I_PRIM = 0;
const I_PUSH = 1;
const I_POP = 2;

const INF = Infinity;

// ---------------------------------------------------------------------------
// parsowanie wejścia
// ---------------------------------------------------------------------------

/** [x,y,z] | THREE.Vector3 → [x,y,z] */
export function vec3(a) {
  if (a == null) return [0, 0, 0];
  if (a.isVector3) return [a.x, a.y, a.z];
  return [+a[0], +a[1], +a[2]];
}

/** Rotacja w dowolnym obsługiwanym formacie → THREE.Quaternion (lub null). */
export function toQuaternion(rot) {
  if (rot == null) return null;
  if (rot.isQuaternion) return rot.clone();
  if (rot.isEuler) return new THREE.Quaternion().setFromEuler(rot);
  if (Array.isArray(rot) || ArrayBuffer.isView(rot)) {
    if (rot.length === 4 && typeof rot[3] === 'number') return new THREE.Quaternion(rot[0], rot[1], rot[2], rot[3]).normalize();
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0] || 0, rot[1] || 0, rot[2] || 0, rot[3] || 'XYZ'));
  }
  throw new Error('sculpt: nieznany format rotacji');
}

const _col = new THREE.Color();
/** Kolor → liniowe [r,g,b]. Hex/CSS/THREE.Color traktowane jako sRGB, tablice jako liniowe. */
export function toLinearRGB(c) {
  if (Array.isArray(c) || ArrayBuffer.isView(c)) return [+c[0], +c[1], +c[2]];
  if (c && c.isColor) return [c.r, c.g, c.b];
  _col.set(c);
  return [_col.r, _col.g, _col.b];
}

// ---------------------------------------------------------------------------
// węzły
// ---------------------------------------------------------------------------

function opCode(op) {
  if (op == null) return OP_ADD;
  const c = OP_CODES[op];
  if (c === undefined) throw new Error(`sculpt: nieznana operacja "${op}"`);
  return c;
}

// środek prymitywu (w jego współrzędnych lokalnych) — punkt obrotu dla `rot` / `squash`
function primCenter(type, p) {
  switch (type) {
    case CAPSULE:
    case ROUNDCONE:
    case CYLINDER:
      return [(p[0] + p[3]) * 0.5, (p[1] + p[4]) * 0.5, (p[2] + p[5]) * 0.5];
    default:
      return [p[0], p[1], p[2]];
  }
}

const _mA = new THREE.Matrix4();
const _mB = new THREE.Matrix4();
const _vA = new THREE.Vector3();

function prim(type, params, o = {}) {
  const p = new Float64Array(PS);
  for (let i = 0; i < params.length; i++) p[i] = params[i];
  let xf = null;
  const c = primCenter(type, p);
  const q = toQuaternion(o.rot);
  if (q) {
    xf = new THREE.Matrix4().makeTranslation(c[0], c[1], c[2]);
    xf.multiply(_mA.makeRotationFromQuaternion(q));
    xf.multiply(_mA.makeTranslation(-c[0], -c[1], -c[2]));
  }
  if (o.squash) {
    const d = vec3(o.squash.dir);
    const l = Math.hypot(d[0], d[1], d[2]) || 1;
    const f = o.squash.factor ?? 0.5;
    const x = d[0] / l, y = d[1] / l, z = d[2] / l;
    const g = f - 1;
    // S = I + (f-1) d dᵀ wokół (obróconego) środka
    _vA.set(c[0], c[1], c[2]);
    if (xf) _vA.applyMatrix4(xf);
    const S = new THREE.Matrix4().set(
      1 + g * x * x, g * x * y, g * x * z, 0,
      g * y * x, 1 + g * y * y, g * y * z, 0,
      g * z * x, g * z * y, 1 + g * z * z, 0,
      0, 0, 0, 1,
    );
    const M = new THREE.Matrix4().makeTranslation(_vA.x, _vA.y, _vA.z).multiply(S).multiply(_mA.makeTranslation(-_vA.x, -_vA.y, -_vA.z));
    xf = xf ? M.multiply(xf) : M;
  }
  if (o.xform) xf = o.xform.clone().multiply(xf || _mB.identity());
  return {
    kind: 'prim',
    type,
    params: p,
    xf,
    bone: o.bone ?? null,
    op: opCode(o.op),
    k: o.k,
    inflate: o.inflate || 0,
    skin: o.skin !== false,
    skinBias: o.skinBias || 0,
    color: o.color != null ? toLinearRGB(o.color) : null,
    soft: o.soft ?? 0.006,
    strength: o.strength ?? 1,
    name: o.name ?? null,
  };
}

/** Kula: środek c, promień r. */
export function sphere(c, r, o) {
  const a = vec3(c);
  return prim(SPHERE, [a[0], a[1], a[2], r], o);
}

/** Elipsoida: środek c, półosie [rx, ry, rz] (osie lokalne, obracane przez `rot`). SDF przybliżony (iq). */
export function ellipsoid(c, radii, o) {
  const a = vec3(c), r = vec3(radii);
  return prim(ELLIPSOID, [a[0], a[1], a[2], r[0], r[1], r[2]], o);
}

/** Kapsuła: odcinek a→b, promień r. */
export function capsule(a, b, r, o) {
  const A = vec3(a), B = vec3(b);
  return prim(CAPSULE, [A[0], A[1], A[2], B[0], B[1], B[2], r], o);
}

/** Zaokrąglony stożek: kula (a, ra) połączona styczną z kulą (b, rb). */
export function roundCone(a, b, ra, rb, o) {
  const A = vec3(a), B = vec3(b);
  const dx = B[0] - A[0], dy = B[1] - A[1], dz = B[2] - A[2];
  const l2 = dx * dx + dy * dy + dz * dz;
  const rr = ra - rb;
  if (l2 - rr * rr <= 1e-10) {
    // jedna kula zawiera drugą
    return ra >= rb ? sphere(A, ra, o) : sphere(B, rb, o);
  }
  if (Math.abs(rr) < 1e-7) return capsule(A, B, ra, o);
  const a2 = l2 - rr * rr;
  return prim(ROUNDCONE, [A[0], A[1], A[2], B[0], B[1], B[2], ra, rb, dx, dy, dz, l2, rr, a2, 1 / l2], o);
}

/** Zaokrąglony prostopadłościan: środek c, połowy wymiarów [hx,hy,hz] (zawierają zaokrąglenie), promień zaokrąglenia. */
export function roundBox(c, half, rounding = 0, o) {
  const a = vec3(c), h = vec3(half);
  const r = Math.max(0, Math.min(rounding, h[0], h[1], h[2]));
  return prim(ROUNDBOX, [a[0], a[1], a[2], h[0], h[1], h[2], r], o);
}

/** Torus: środek c, promień główny R, promień rurki r; pierścień leży w lokalnej płaszczyźnie XZ (oś Y). */
export function torus(c, R, r, o) {
  const a = vec3(c);
  return prim(TORUS, [a[0], a[1], a[2], R, r], o);
}

/** Walec z zaokrąglonymi krawędziami: oś a→b (całkowita długość), promień r, zaokrąglenie krawędzi. */
export function cylinder(a, b, r, rounding = 0, o) {
  const A = vec3(a), B = vec3(b);
  const dx = B[0] - A[0], dy = B[1] - A[1], dz = B[2] - A[2];
  const L = Math.hypot(dx, dy, dz) || 1e-6;
  const rd = Math.max(0, Math.min(rounding, r * 0.999, L * 0.499));
  const ux = dx / L, uy = dy / L, uz = dz / L;
  const a2 = [A[0] + ux * rd, A[1] + uy * rd, A[2] + uz * rd];
  const b2 = [B[0] - ux * rd, B[1] - uy * rd, B[2] - uz * rd];
  const bx = b2[0] - a2[0], by = b2[1] - a2[1], bz = b2[2] - a2[2];
  const baba = bx * bx + by * by + bz * bz;
  // [ax,ay,az,bx,by,bz (oryginalne końce, do AABB/środka), r, rd, a'x,a'y,a'z, ba x,y,z, baba, r']
  return prim(CYLINDER, [A[0], A[1], A[2], B[0], B[1], B[2], r, rd, a2[0], a2[1], a2[2], bx, by, bz, baba, r - rd], o);
}

/** Półprzestrzeń: punkt na płaszczyźnie + normalna (na zewnątrz). Tylko do op 'sub' i 'int' (np. cięcia skorup). */
export function plane(point, normal, o = {}) {
  const p = vec3(point), n = vec3(normal);
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  const node = prim(PLANE, [p[0], p[1], p[2], n[0] / l, n[1] / l, n[2] / l], o);
  if (node.op === OP_ADD) throw new Error('sculpt: plane() wymaga op "sub" lub "int"');
  return node;
}

/** Rurka z kolejnych roundCone przez punkty; radii: liczba albo tablica (na punkt). Zwraca tablicę węzłów. */
export function tube(points, radii, o) {
  const out = [];
  const P = points.map(vec3);
  for (let i = 0; i < P.length - 1; i++) {
    const ra = Array.isArray(radii) ? radii[i] : radii;
    const rb = Array.isArray(radii) ? radii[i + 1] : radii;
    out.push(roundCone(P[i], P[i + 1], ra, rb, o));
  }
  return out;
}

/**
 * Krzywa Béziera (3 lub 4 punkty kontrolne) jako łańcuch roundCone o promieniu od r0 do r1.
 * opts.segments (domyślnie 6), opts.taper (wykładnik profilu promienia, 1 = liniowo),
 * opts.squash { dir, factor } — spłaszczenie przekroju (np. pasmo włosów) bez zmiany osi krzywej.
 */
export function bezierTube(ctrl, r0, r1, o = {}) {
  const C = ctrl.map(vec3);
  const n = Math.max(1, o.segments ?? 6);
  const taper = o.taper ?? 1;
  const pts = [];
  const rad = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let p;
    if (C.length === 3) {
      const u = 1 - t;
      p = [0, 1, 2].map((k) => u * u * C[0][k] + 2 * u * t * C[1][k] + t * t * C[2][k]);
    } else {
      const u = 1 - t;
      p = [0, 1, 2].map((k) => u * u * u * C[0][k] + 3 * u * u * t * C[1][k] + 3 * u * t * t * C[2][k] + t * t * t * C[3][k]);
    }
    pts.push(p);
    rad.push(r0 + (r1 - r0) * Math.pow(t, taper));
  }
  if (!o.squash) {
    const { squash, segments, taper: _t, ...rest } = o;
    return tube(pts, rad, rest);
  }
  // spłaszczenie: S wokół środka krzywej, punkty osi wstępnie przekształcone przez S⁻¹
  const d = vec3(o.squash.dir);
  const l = Math.hypot(d[0], d[1], d[2]) || 1;
  const x = d[0] / l, y = d[1] / l, z = d[2] / l;
  const f = o.squash.factor ?? 0.5;
  const g = f - 1;
  const gi = 1 / f - 1;
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const cz = pts.reduce((s, p) => s + p[2], 0) / pts.length;
  const S = new THREE.Matrix4().set(
    1 + g * x * x, g * x * y, g * x * z, 0,
    g * y * x, 1 + g * y * y, g * y * z, 0,
    g * z * x, g * z * y, 1 + g * z * z, 0,
    0, 0, 0, 1,
  );
  const M = new THREE.Matrix4().makeTranslation(cx, cy, cz).multiply(S).multiply(new THREE.Matrix4().makeTranslation(-cx, -cy, -cz));
  const local = pts.map((p) => {
    const px = p[0] - cx, py = p[1] - cy, pz = p[2] - cz;
    const dd = px * x + py * y + pz * z;
    return [cx + px + gi * dd * x, cy + py + gi * dd * y, cz + pz + gi * dd * z];
  });
  const { squash, segments, taper: _t, ...rest } = o;
  return frame(M, tube(local, rad, rest));
}

/** Grupa CSG — patrz opis na górze pliku. */
export function group(children, o = {}) {
  let sh = null;
  if (o.shell != null) {
    if (typeof o.shell === 'number') sh = { thickness: o.shell, offset: 0 };
    else sh = { thickness: o.shell.thickness, offset: o.shell.offset || 0 };
  }
  return {
    kind: 'group',
    children: flatten(children),
    op: opCode(o.op),
    k: o.k,
    blend: o.blend,
    shell: sh,
    bone: o.bone ?? null,
    name: o.name ?? null,
  };
}

/** Skorupa (pusta w środku) o grubości ścianki `thickness`; opts.offset przesuwa ściankę (+ = na zewnątrz). */
export function shell(children, thickness, o = {}) {
  return group(children, { ...o, shell: { thickness, offset: o.offset ?? 0 } });
}

function flatten(list, out = []) {
  if (list == null) return out;
  if (!Array.isArray(list)) {
    out.push(list);
    return out;
  }
  for (const c of list) flatten(c, out);
  return out;
}

function cloneNode(node, M, boneFn) {
  if (node.kind === 'group') {
    return { ...node, children: node.children.map((c) => cloneNode(c, M, boneFn)), bone: node.bone ? boneFn(node.bone) : node.bone };
  }
  const xf = M ? M.clone().multiply(node.xf || _mB.identity()) : node.xf;
  return { ...node, xf, bone: node.bone ? boneFn(node.bone) : node.bone };
}

function toMatrix(f) {
  if (f.isMatrix4) return f.clone();
  const p = vec3(f.pos || f.position);
  const q = toQuaternion(f.rot || f.rotation) || new THREE.Quaternion();
  const s = f.scale == null ? [1, 1, 1] : typeof f.scale === 'number' ? [f.scale, f.scale, f.scale] : vec3(f.scale);
  return new THREE.Matrix4().compose(new THREE.Vector3(p[0], p[1], p[2]), q, new THREE.Vector3(s[0], s[1], s[2]));
}

/**
 * Ramka lokalna: dzieci zdefiniowane we współrzędnych ramki są przenoszone do świata.
 * f: THREE.Matrix4 albo { pos, rot, scale } (scale: liczba lub [sx,sy,sz]). Zwraca tablicę węzłów.
 */
export function frame(f, children) {
  const M = toMatrix(f);
  return flatten(children).map((c) => cloneNode(c, M, (b) => b));
}

/** 'upperArmL' ↔ 'upperArmR' (także _L/_R, .L/.R, Left/Right). */
export function swapSide(name) {
  if (!name) return name;
  if (/Left$/.test(name)) return name.replace(/Left$/, 'Right');
  if (/Right$/.test(name)) return name.replace(/Right$/, 'Left');
  if (/L$/.test(name)) return name.slice(0, -1) + 'R';
  if (/R$/.test(name)) return name.slice(0, -1) + 'L';
  return name;
}

const MIRROR_X = new THREE.Matrix4().makeScale(-1, 1, 1);

/** Lustro względem płaszczyzny x = 0 z zamianą sufiksów kości L<->R. Zwraca tablicę nowych węzłów. */
export function mirror(children, o = {}) {
  const fn = o.swap === false ? (b) => b : swapSide;
  return flatten(children).map((c) => cloneNode(c, MIRROR_X, fn));
}

/** [...children, ...mirror(children)] — obie strony naraz. */
export function both(children, o) {
  const c = flatten(children);
  return [...c, ...mirror(c, o)];
}

// ---------------------------------------------------------------------------
// AABB
// ---------------------------------------------------------------------------

function localAABB(type, p) {
  switch (type) {
    case SPHERE:
      return [p[0] - p[3], p[1] - p[3], p[2] - p[3], p[0] + p[3], p[1] + p[3], p[2] + p[3]];
    case ELLIPSOID:
      return [p[0] - p[3], p[1] - p[4], p[2] - p[5], p[0] + p[3], p[1] + p[4], p[2] + p[5]];
    case CAPSULE:
    case CYLINDER: {
      const r = p[6];
      return [Math.min(p[0], p[3]) - r, Math.min(p[1], p[4]) - r, Math.min(p[2], p[5]) - r, Math.max(p[0], p[3]) + r, Math.max(p[1], p[4]) + r, Math.max(p[2], p[5]) + r];
    }
    case ROUNDCONE: {
      const ra = p[6], rb = p[7];
      return [
        Math.min(p[0] - ra, p[3] - rb), Math.min(p[1] - ra, p[4] - rb), Math.min(p[2] - ra, p[5] - rb),
        Math.max(p[0] + ra, p[3] + rb), Math.max(p[1] + ra, p[4] + rb), Math.max(p[2] + ra, p[5] + rb),
      ];
    }
    case ROUNDBOX:
      return [p[0] - p[3], p[1] - p[4], p[2] - p[5], p[0] + p[3], p[1] + p[4], p[2] + p[5]];
    case TORUS: {
      const a = p[3] + p[4];
      return [p[0] - a, p[1] - p[4], p[2] - a, p[0] + a, p[1] + p[4], p[2] + a];
    }
    case PLANE:
      return [-INF, -INF, -INF, INF, INF, INF];
  }
  throw new Error('sculpt: nieznany typ prymitywu ' + type);
}

function worldAABB(node) {
  const b = localAABB(node.type, node.params);
  if (node.type === PLANE) return b;
  let out = b;
  if (node.xf) {
    out = [INF, INF, INF, -INF, -INF, -INF];
    for (let i = 0; i < 8; i++) {
      _vA.set(i & 1 ? b[3] : b[0], i & 2 ? b[4] : b[1], i & 4 ? b[5] : b[2]).applyMatrix4(node.xf);
      out[0] = Math.min(out[0], _vA.x); out[1] = Math.min(out[1], _vA.y); out[2] = Math.min(out[2], _vA.z);
      out[3] = Math.max(out[3], _vA.x); out[4] = Math.max(out[4], _vA.y); out[5] = Math.max(out[5], _vA.z);
    }
  }
  const inf = Math.max(0, node.inflate);
  return [out[0] - inf, out[1] - inf, out[2] - inf, out[3] + inf, out[4] + inf, out[5] + inf];
}

// ---------------------------------------------------------------------------
// tablica prymitywów (płaskie tablice) — wspólna dla pola, wag i malowania
// ---------------------------------------------------------------------------

/**
 * Pakuje listę węzłów-prymitywów do płaskich tablic.
 * Zwraca { n, type, op, k, inf, ds, hasX, M, P, aabb, bone[], skin, skinBias, color, soft, strength, nodes }.
 */
export function packPrims(list) {
  const n = list.length;
  const T = {
    n,
    type: new Uint8Array(n),
    op: new Uint8Array(n),
    k: new Float64Array(n),
    inf: new Float64Array(n),
    ds: new Float64Array(n),
    hasX: new Uint8Array(n),
    M: new Float64Array(n * 12),
    P: new Float64Array(n * PS),
    aabb: new Float64Array(n * 6),
    bone: new Array(n),
    skin: new Uint8Array(n),
    skinBias: new Float64Array(n),
    color: new Float32Array(n * 3),
    soft: new Float64Array(n),
    strength: new Float64Array(n),
    nodes: list,
  };
  const inv = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const e = list[i];
    const node = e.node || e;
    T.type[i] = node.type;
    T.op[i] = node.op;
    T.k[i] = e.k ?? node.k ?? 0;
    T.inf[i] = node.inflate || 0;
    T.P.set(node.params, i * PS);
    T.ds[i] = 1;
    if (node.xf) {
      const me = node.xf.elements;
      const sx = Math.hypot(me[0], me[1], me[2]);
      const sy = Math.hypot(me[4], me[5], me[6]);
      const sz = Math.hypot(me[8], me[9], me[10]);
      T.ds[i] = Math.min(sx, sy, sz);
      inv.copy(node.xf).invert();
      const v = inv.elements; // column-major
      const o = i * 12;
      T.M[o + 0] = v[0]; T.M[o + 1] = v[4]; T.M[o + 2] = v[8]; T.M[o + 3] = v[12];
      T.M[o + 4] = v[1]; T.M[o + 5] = v[5]; T.M[o + 6] = v[9]; T.M[o + 7] = v[13];
      T.M[o + 8] = v[2]; T.M[o + 9] = v[6]; T.M[o + 10] = v[10]; T.M[o + 11] = v[14];
      T.hasX[i] = 1;
    }
    const bb = worldAABB(node);
    for (let j = 0; j < 6; j++) T.aabb[i * 6 + j] = bb[j];
    T.bone[i] = e.bone ?? node.bone;
    T.skin[i] = node.skin ? 1 : 0;
    T.skinBias[i] = node.skinBias || 0;
    const c = node.color || [1, 1, 1];
    T.color[i * 3] = c[0]; T.color[i * 3 + 1] = c[1]; T.color[i * 3 + 2] = c[2];
    T.soft[i] = Math.max(1e-5, node.soft ?? 0.006);
    T.strength[i] = node.strength ?? 1;
  }
  return T;
}

// ---------------------------------------------------------------------------
// wsadowa ewaluacja
// ---------------------------------------------------------------------------

/** Maksymalna liczba punktów w jednym wsadzie (większe zbiory są dzielone automatycznie). */
export const MAXB = 4096;
const MAXDEPTH = 24;
const LX = new Float32Array(MAXB);
const LY = new Float32Array(MAXB);
const LZ = new Float32Array(MAXB);
const TMP = new Float32Array(MAXB);
const STK = [];
for (let i = 0; i < MAXDEPTH; i++) STK.push(new Float32Array(MAXB));

/**
 * Surowa odległość jednego prymitywu (bez operacji CSG) dla n punktów (n ≤ MAXB).
 * T: tablica z packPrims(); wynik w `out` (Float32Array).
 */
export function primDistBatch(T, i, X, Y, Z, n, out) {
  let x = X, y = Y, z = Z;
  if (T.hasX[i]) {
    const m = T.M, b = i * 12;
    const m0 = m[b], m1 = m[b + 1], m2 = m[b + 2], m3 = m[b + 3];
    const m4 = m[b + 4], m5 = m[b + 5], m6 = m[b + 6], m7 = m[b + 7];
    const m8 = m[b + 8], m9 = m[b + 9], m10 = m[b + 10], m11 = m[b + 11];
    for (let j = 0; j < n; j++) {
      const px = X[j], py = Y[j], pz = Z[j];
      LX[j] = m0 * px + m1 * py + m2 * pz + m3;
      LY[j] = m4 * px + m5 * py + m6 * pz + m7;
      LZ[j] = m8 * px + m9 * py + m10 * pz + m11;
    }
    x = LX; y = LY; z = LZ;
  }
  const P = T.P, o = i * PS;
  switch (T.type[i]) {
    case SPHERE: {
      const cx = P[o], cy = P[o + 1], cz = P[o + 2], r = P[o + 3];
      for (let j = 0; j < n; j++) {
        const dx = x[j] - cx, dy = y[j] - cy, dz = z[j] - cz;
        out[j] = Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
      }
      break;
    }
    case ELLIPSOID: {
      const cx = P[o], cy = P[o + 1], cz = P[o + 2];
      const ix = 1 / P[o + 3], iy = 1 / P[o + 4], iz = 1 / P[o + 5];
      const ix2 = ix * ix, iy2 = iy * iy, iz2 = iz * iz;
      const rmin = Math.min(P[o + 3], P[o + 4], P[o + 5]);
      for (let j = 0; j < n; j++) {
        const dx = x[j] - cx, dy = y[j] - cy, dz = z[j] - cz;
        const ax = dx * ix, ay = dy * iy, az = dz * iz;
        const bx = dx * ix2, by = dy * iy2, bz = dz * iz2;
        const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
        const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
        out[j] = k1 > 1e-12 ? (k0 * (k0 - 1)) / k1 : -rmin;
      }
      break;
    }
    case CAPSULE: {
      const ax = P[o], ay = P[o + 1], az = P[o + 2];
      const bx = P[o + 3] - ax, by = P[o + 4] - ay, bz = P[o + 5] - az, r = P[o + 6];
      const ibb = 1 / Math.max(1e-12, bx * bx + by * by + bz * bz);
      for (let j = 0; j < n; j++) {
        const px = x[j] - ax, py = y[j] - ay, pz = z[j] - az;
        let h = (px * bx + py * by + pz * bz) * ibb;
        h = h < 0 ? 0 : h > 1 ? 1 : h;
        const dx = px - bx * h, dy = py - by * h, dz = pz - bz * h;
        out[j] = Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
      }
      break;
    }
    case ROUNDCONE: {
      const ax = P[o], ay = P[o + 1], az = P[o + 2];
      const r1 = P[o + 6], r2 = P[o + 7];
      const bx = P[o + 8], by = P[o + 9], bz = P[o + 10];
      const l2 = P[o + 11], rr = P[o + 12], a2 = P[o + 13], il2 = P[o + 14];
      const srr = rr > 0 ? rr * rr : -rr * rr;
      for (let j = 0; j < n; j++) {
        const px = x[j] - ax, py = y[j] - ay, pz = z[j] - az;
        const yy = px * bx + py * by + pz * bz;
        const zz = yy - l2;
        const qx = px * l2 - bx * yy, qy = py * l2 - by * yy, qz = pz * l2 - bz * yy;
        const x2 = qx * qx + qy * qy + qz * qz;
        const y2 = yy * yy * l2;
        const z2 = zz * zz * l2;
        const k = srr * x2;
        if ((zz > 0 ? a2 * z2 : zz < 0 ? -a2 * z2 : 0) > k) out[j] = Math.sqrt(x2 + z2) * il2 - r2;
        else if ((yy > 0 ? a2 * y2 : yy < 0 ? -a2 * y2 : 0) < k) out[j] = Math.sqrt(x2 + y2) * il2 - r1;
        else out[j] = (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
      }
      break;
    }
    case ROUNDBOX: {
      const cx = P[o], cy = P[o + 1], cz = P[o + 2], r = P[o + 6];
      const hx = P[o + 3] - r, hy = P[o + 4] - r, hz = P[o + 5] - r;
      for (let j = 0; j < n; j++) {
        const qx = Math.abs(x[j] - cx) - hx, qy = Math.abs(y[j] - cy) - hy, qz = Math.abs(z[j] - cz) - hz;
        const mx = qx > 0 ? qx : 0, my = qy > 0 ? qy : 0, mz = qz > 0 ? qz : 0;
        let mm = qx > qy ? qx : qy;
        if (qz > mm) mm = qz;
        out[j] = Math.sqrt(mx * mx + my * my + mz * mz) + (mm < 0 ? mm : 0) - r;
      }
      break;
    }
    case TORUS: {
      const cx = P[o], cy = P[o + 1], cz = P[o + 2], R = P[o + 3], r = P[o + 4];
      for (let j = 0; j < n; j++) {
        const dx = x[j] - cx, dy = y[j] - cy, dz = z[j] - cz;
        const qx = Math.sqrt(dx * dx + dz * dz) - R;
        out[j] = Math.sqrt(qx * qx + dy * dy) - r;
      }
      break;
    }
    case CYLINDER: {
      const rd = P[o + 7];
      const ax = P[o + 8], ay = P[o + 9], az = P[o + 10];
      const bx = P[o + 11], by = P[o + 12], bz = P[o + 13];
      const baba = Math.max(1e-12, P[o + 14]), r = P[o + 15];
      const ibaba = 1 / baba, hb = baba * 0.5;
      for (let j = 0; j < n; j++) {
        const px = x[j] - ax, py = y[j] - ay, pz = z[j] - az;
        const paba = px * bx + py * by + pz * bz;
        const ux = px * baba - bx * paba, uy = py * baba - by * paba, uz = pz * baba - bz * paba;
        const xx = Math.sqrt(ux * ux + uy * uy + uz * uz) - r * baba;
        const yy = Math.abs(paba - hb) - hb;
        const x2 = xx * xx, y2 = yy * yy * baba;
        let d;
        if (xx < 0 && yy < 0) d = -(x2 < y2 ? x2 : y2);
        else d = (xx > 0 ? x2 : 0) + (yy > 0 ? y2 : 0);
        out[j] = (d > 0 ? Math.sqrt(d) : -Math.sqrt(-d)) * ibaba - rd;
      }
      break;
    }
    case PLANE: {
      const cx = P[o], cy = P[o + 1], cz = P[o + 2], nx = P[o + 3], ny = P[o + 4], nz = P[o + 5];
      for (let j = 0; j < n; j++) out[j] = (x[j] - cx) * nx + (y[j] - cy) * ny + (z[j] - cz) * nz;
      break;
    }
  }
  const ds = T.ds[i], inf = T.inf[i];
  if (ds !== 1 || inf !== 0) for (let j = 0; j < n; j++) out[j] = out[j] * ds - inf;
}

function combine(acc, d, n, op, k) {
  if (op === OP_ADD) {
    if (k <= 0) {
      for (let j = 0; j < n; j++) if (d[j] < acc[j]) acc[j] = d[j];
    } else {
      const q = 0.25 / k;
      for (let j = 0; j < n; j++) {
        const a = acc[j], b = d[j];
        const h = k - Math.abs(a - b);
        const m = a < b ? a : b;
        acc[j] = h > 0 ? m - h * h * q : m;
      }
    }
  } else if (op === OP_SUB) {
    if (k <= 0) {
      for (let j = 0; j < n; j++) if (-d[j] > acc[j]) acc[j] = -d[j];
    } else {
      const q = 0.25 / k;
      for (let j = 0; j < n; j++) {
        const a = acc[j], b = -d[j];
        const h = k - Math.abs(a - b);
        const m = a > b ? a : b;
        acc[j] = h > 0 ? m + h * h * q : m;
      }
    }
  } else if (op === OP_INT) {
    if (k <= 0) {
      for (let j = 0; j < n; j++) if (d[j] > acc[j]) acc[j] = d[j];
    } else {
      const q = 0.25 / k;
      for (let j = 0; j < n; j++) {
        const a = acc[j], b = d[j];
        const h = k - Math.abs(a - b);
        const m = a > b ? a : b;
        acc[j] = h > 0 ? m + h * h * q : m;
      }
    }
  }
}

/** Wykonuje program bloku `b` dla n ≤ MAXB punktów. */
function runBlock(F, b, X, Y, Z, n, out) {
  const start = F.progStart[b], end = start + F.progLen[b];
  const prog = F.prog, K = F.iKind, A = F.iArg, T = F.prims;
  let lvl = 0;
  let acc = STK[0];
  acc.fill(BIG, 0, n);
  for (let s = start; s < end; s++) {
    const ins = prog[s];
    const kind = K[ins], a = A[ins];
    if (kind === I_PRIM) {
      primDistBatch(T, a, X, Y, Z, n, TMP);
      combine(acc, TMP, n, T.op[a], T.k[a]);
    } else if (kind === I_PUSH) {
      lvl++;
      acc = STK[lvl];
      acc.fill(BIG, 0, n);
    } else {
      const st = F.gShell[a];
      if (st > 0) {
        const t = st * 0.5, off = F.gOff[a];
        for (let j = 0; j < n; j++) {
          const v = acc[j] - off;
          acc[j] = (v < 0 ? -v : v) - t;
        }
      }
      const below = STK[lvl - 1];
      combine(below, acc, n, F.gOp[a], F.gK[a]);
      lvl--;
      acc = below;
    }
  }
  for (let j = 0; j < n; j++) out[j] = acc[j];
}

/** Ewaluacja n ≤ MAXB punktów leżących w bloku `b` (indeks bloku pola). */
export function evalBlock(F, b, X, Y, Z, n, out) {
  if (F.progLen[b] === 0) {
    out.fill(BIG, 0, n);
    return;
  }
  runBlock(F, b, X, Y, Z, n, out);
}

/** Indeks bloku pola dla punktu świata lub -1 poza domeną. */
export function blockOf(F, x, y, z) {
  const s = F.invBlock;
  const bx = Math.floor((x - F.ox) * s), by = Math.floor((y - F.oy) * s), bz = Math.floor((z - F.oz) * s);
  if (bx < 0 || by < 0 || bz < 0 || bx >= F.nbx || by >= F.nby || bz >= F.nbz) return -1;
  return bx + F.nbx * (by + F.nby * bz);
}

const CX = new Float32Array(MAXB);
const CY = new Float32Array(MAXB);
const CZ = new Float32Array(MAXB);
const CO = new Float32Array(MAXB);

/**
 * Ewaluacja dowolnych punktów (kubełkowanie po blokach).
 * opts.min = true → out[j] = min(out[j], d) (np. globalne SDF wielu warstw); punkty poza domeną są pomijane.
 * Inaczej out[j] = d, a punkty poza domeną dostają BIG.
 */
export function evalPoints(F, xs, ys, zs, n, out, opts = {}) {
  const useMin = !!opts.min;
  const nb = F.nBlocks;
  const bid = new Int32Array(n);
  const cnt = new Int32Array(nb + 1);
  const s = F.invBlock, ox = F.ox, oy = F.oy, oz = F.oz, nbx = F.nbx, nby = F.nby, nbz = F.nbz;
  const plen = F.progLen;
  for (let j = 0; j < n; j++) {
    const bx = Math.floor((xs[j] - ox) * s), by = Math.floor((ys[j] - oy) * s), bz = Math.floor((zs[j] - oz) * s);
    let b = -1;
    if (bx >= 0 && by >= 0 && bz >= 0 && bx < nbx && by < nby && bz < nbz) {
      b = bx + nbx * (by + nby * bz);
      if (plen[b] === 0) b = -1;
    }
    bid[j] = b;
    if (b >= 0) cnt[b + 1]++;
    else if (!useMin) out[j] = BIG;
  }
  for (let b = 0; b < nb; b++) cnt[b + 1] += cnt[b];
  const order = new Int32Array(cnt[nb]);
  const fill = cnt.slice(0, nb);
  for (let j = 0; j < n; j++) {
    const b = bid[j];
    if (b >= 0) order[fill[b]++] = j;
  }
  for (let b = 0; b < nb; b++) {
    let a = cnt[b];
    const e = cnt[b + 1];
    while (a < e) {
      const m = Math.min(MAXB, e - a);
      for (let t = 0; t < m; t++) {
        const j = order[a + t];
        CX[t] = xs[j]; CY[t] = ys[j]; CZ[t] = zs[j];
      }
      runBlock(F, b, CX, CY, CZ, m, CO);
      if (useMin) {
        for (let t = 0; t < m; t++) {
          const j = order[a + t];
          if (CO[t] < out[j]) out[j] = CO[t];
        }
      } else {
        for (let t = 0; t < m; t++) out[order[a + t]] = CO[t];
      }
      a += m;
    }
  }
}

/** Pojedynczy punkt (wolne — tylko do debugowania / umieszczania akcesoriów). */
export function evalPoint(F, x, y, z) {
  const b = blockOf(F, x, y, z);
  if (b < 0 || F.progLen[b] === 0) return BIG;
  CX[0] = x; CY[0] = y; CZ[0] = z;
  runBlock(F, b, CX, CY, CZ, 1, CO);
  return CO[0];
}

// ---------------------------------------------------------------------------
// kompilacja pola
// ---------------------------------------------------------------------------

/**
 * Kompiluje drzewo węzłów do pola z siatką bloków.
 * opts.voxel      rozmiar woksela (m) — wyznacza też rozmiar bloku (blockCells * voxel)
 * opts.blockCells woksele na krawędź bloku (domyślnie 16, musi być wielokrotnością 4)
 * opts.pad        dodatkowy margines domeny (m), np. promień AO — punkty w tym pasie są liczone dokładnie
 * opts.blend      domyślne k dla prymitywów bez własnego k
 * opts.bone       domyślna kość
 * opts.bounds     [minX,minY,minZ,maxX,maxY,maxZ] — ręczne przycięcie obszaru siatkowania
 * opts.margin     margines odcinania prymitywów w blokach (m, domyślnie 4 woksele)
 */
export function compileField(nodes, opts = {}) {
  const h = opts.voxel ?? 0.008;
  const B = opts.blockCells ?? 16;
  if (B % 4 !== 0) throw new Error('sculpt: blockCells musi być wielokrotnością 4');
  const margin = opts.margin ?? 4 * h;

  const primList = []; // { node, k, bone, expand }
  const paintList = [];
  const instr = []; // { kind, arg, match, aabb, keep }
  const groups = []; // { op, k, t, off }
  let maxDepth = 0;
  // pudło powierzchni
  const sb = [INF, INF, INF, -INF, -INF, -INF];

  const grow = (dst, bb, e) => {
    dst[0] = Math.min(dst[0], bb[0] - e); dst[1] = Math.min(dst[1], bb[1] - e); dst[2] = Math.min(dst[2], bb[2] - e);
    dst[3] = Math.max(dst[3], bb[3] + e); dst[4] = Math.max(dst[4], bb[4] + e); dst[5] = Math.max(dst[5], bb[5] + e);
  };

  function walk(node, ctx) {
    if (node.kind === 'group') {
      const gi = groups.length;
      const t = node.shell ? node.shell.thickness : 0;
      const off = node.shell ? node.shell.offset : 0;
      const gk = node.k ?? ctx.blend;
      groups.push({ op: node.op, k: gk, t, off });
      const pushIdx = instr.length;
      const gbb = [INF, INF, INF, -INF, -INF, -INF];
      instr.push({ kind: I_PUSH, arg: gi, match: -1, aabb: gbb, keep: node.op === OP_INT });
      const sub = {
        bone: node.bone ?? ctx.bone,
        blend: node.blend ?? ctx.blend,
        expand: ctx.expand + gk + t * 0.5 + Math.abs(off),
        surfExpand: ctx.surfExpand + gk * 0.25 + t * 0.5 + Math.abs(off),
        surface: ctx.surface && node.op === OP_ADD,
        depth: ctx.depth + 1,
      };
      maxDepth = Math.max(maxDepth, sub.depth);
      const first = instr.length;
      for (const c of node.children) walk(c, sub);
      for (let i = first; i < instr.length; i++) {
        if (instr[i].kind !== I_POP) grow(gbb, instr[i].aabb, 0);
      }
      instr.push({ kind: I_POP, arg: gi, match: pushIdx, aabb: gbb, keep: true });
      instr[pushIdx].match = instr.length - 1;
      return;
    }
    if (node.kind !== 'prim') throw new Error('sculpt: nieznany węzeł');
    const bone = node.bone ?? ctx.bone;
    if (node.op === OP_PAINT) {
      paintList.push({ node, bone, k: 0 });
      return;
    }
    const k = node.k ?? ctx.blend;
    const bb = worldAABB(node);
    const e = k + ctx.expand;
    const ebb = [bb[0] - e, bb[1] - e, bb[2] - e, bb[3] + e, bb[4] + e, bb[5] + e];
    primList.push({ node, k, bone });
    instr.push({ kind: I_PRIM, arg: primList.length - 1, match: -1, aabb: ebb, keep: node.op === OP_INT });
    if (ctx.surface && node.op === OP_ADD) grow(sb, bb, k * 0.25 + ctx.surfExpand);
  }

  const roots = flatten(nodes);
  const ctx0 = { bone: opts.bone ?? null, blend: opts.blend ?? 0, expand: 0, surfExpand: 0, surface: true, depth: 0 };
  for (const n of roots) walk(n, ctx0);
  if (maxDepth >= MAXDEPTH) throw new Error('sculpt: za głębokie zagnieżdżenie grup');

  const prims = packPrims(primList);
  const paints = packPrims(paintList);

  const nI = instr.length;
  const iKind = new Uint8Array(nI);
  const iArg = new Int32Array(nI);
  for (let i = 0; i < nI; i++) {
    iKind[i] = instr[i].kind;
    iArg[i] = instr[i].arg;
  }
  const nG = groups.length;
  const gOp = new Uint8Array(nG), gK = new Float64Array(nG), gShell = new Float64Array(nG), gOff = new Float64Array(nG);
  groups.forEach((g, i) => {
    gOp[i] = g.op; gK[i] = g.k; gShell[i] = g.t; gOff[i] = g.off;
  });

  // siatka wokseli (narożniki) — pudło powierzchni + 2 woksele
  if (opts.bounds) {
    const b = opts.bounds;
    for (let i = 0; i < 3; i++) {
      sb[i] = Math.max(sb[i], b[i]);
      sb[i + 3] = Math.min(sb[i + 3], b[i + 3]);
    }
  }
  const empty = !(sb[0] < sb[3] && sb[1] < sb[4] && sb[2] < sb[5]);
  if (empty) {
    sb[0] = sb[1] = sb[2] = 0;
    sb[3] = sb[4] = sb[5] = h;
  }
  const mox = sb[0] - 2 * h, moy = sb[1] - 2 * h, moz = sb[2] - 2 * h;
  const nx = Math.ceil((sb[3] - sb[0]) / h) + 5;
  const ny = Math.ceil((sb[4] - sb[1]) / h) + 5;
  const nz = Math.ceil((sb[5] - sb[2]) / h) + 5;

  // domena bloków (z marginesem pad)
  const bs = B * h;
  const nPad = Math.ceil((opts.pad ?? 0) / bs);
  const ox = mox - nPad * bs, oy = moy - nPad * bs, oz = moz - nPad * bs;
  const nbx = Math.ceil(nx / B) + 2 * nPad;
  const nby = Math.ceil(ny / B) + 2 * nPad;
  const nbz = Math.ceil(nz / B) + 2 * nPad;
  const nBlocks = nbx * nby * nbz;

  // zakresy bloków dla każdej instrukcji
  const rng = new Int32Array(nI * 6);
  const ib = 1 / bs;
  for (let i = 0; i < nI; i++) {
    const a = instr[i].aabb;
    const lo = [a[0] - margin - ox, a[1] - margin - oy, a[2] - margin - oz];
    const hi = [a[3] + margin - ox, a[4] + margin - oy, a[5] + margin - oz];
    const nbs = [nbx, nby, nbz];
    for (let d = 0; d < 3; d++) {
      let l = Math.floor(lo[d] * ib), u = Math.floor(hi[d] * ib);
      if (!Number.isFinite(l)) l = lo[d] < 0 ? -1 : nbs[d];
      if (!Number.isFinite(u)) u = hi[d] < 0 ? -1 : nbs[d];
      if (l < 0) l = 0;
      if (u > nbs[d] - 1) u = nbs[d] - 1;
      rng[i * 6 + d] = l;
      rng[i * 6 + 3 + d] = u;
    }
    if (iKind[i] === I_POP) {
      rng[i * 6] = 0; rng[i * 6 + 1] = 0; rng[i * 6 + 2] = 0;
      rng[i * 6 + 3] = nbx; rng[i * 6 + 4] = nby; rng[i * 6 + 5] = nbz;
    }
  }
  const keep = new Uint8Array(nI);
  const match = new Int32Array(nI);
  for (let i = 0; i < nI; i++) {
    keep[i] = instr[i].keep ? 1 : 0;
    match[i] = instr[i].match;
  }

  // programy bloków
  const progStart = new Int32Array(nBlocks);
  const progLen = new Int32Array(nBlocks);
  let cap = Math.max(1024, nBlocks * 8);
  let prog = new Int32Array(cap);
  let top = 0;
  const tmp = new Int32Array(nI);
  let totalLen = 0;
  for (let bz = 0; bz < nbz; bz++) {
    for (let by = 0; by < nby; by++) {
      for (let bx = 0; bx < nbx; bx++) {
        const b = bx + nbx * (by + nby * bz);
        let m = 0;
        let nPrim = 0;
        let i = 0;
        while (i < nI) {
          const o = i * 6;
          const inside = bx >= rng[o] && by >= rng[o + 1] && bz >= rng[o + 2] && bx <= rng[o + 3] && by <= rng[o + 4] && bz <= rng[o + 5];
          const kind = iKind[i];
          if (kind === I_PRIM) {
            if (inside || keep[i]) {
              tmp[m++] = i;
              nPrim++;
            }
            i++;
          } else if (kind === I_PUSH) {
            if (inside || keep[i]) {
              tmp[m++] = i;
              i++;
            } else i = match[i] + 1;
          } else {
            // POP — usuń puste grupy (PUSH bezpośrednio przed POP)
            if (m > 0 && iKind[tmp[m - 1]] === I_PUSH && gOp[iArg[i]] !== OP_INT) m--;
            else tmp[m++] = i;
            i++;
          }
        }
        if (nPrim === 0) m = 0;
        if (top + m > cap) {
          cap = Math.max(cap * 2, top + m);
          const np = new Int32Array(cap);
          np.set(prog.subarray(0, top));
          prog = np;
        }
        progStart[b] = top;
        progLen[b] = m;
        prog.set(tmp.subarray(0, m), top);
        top += m;
        totalLen += m;
      }
    }
  }

  const bones = [];
  for (let i = 0; i < prims.n; i++) if (prims.bone[i] && !bones.includes(prims.bone[i])) bones.push(prims.bone[i]);
  for (let i = 0; i < paints.n; i++) if (paints.bone[i] && !bones.includes(paints.bone[i])) bones.push(paints.bone[i]);

  return {
    h,
    B,
    nPad,
    // siatka wokseli
    mox, moy, moz, nx, ny, nz,
    // domena bloków
    ox, oy, oz, nbx, nby, nbz, nBlocks, blockSize: bs, invBlock: ib,
    prims,
    paints,
    iKind, iArg,
    gOp, gK, gShell, gOff,
    prog: prog.subarray(0, top),
    progStart,
    progLen,
    bones,
    empty,
    surfaceBox: sb.slice(),
    stats: { prims: prims.n, paints: paints.n, instr: nI, blocks: nBlocks, avgProg: totalLen / Math.max(1, nBlocks) },
  };
}
