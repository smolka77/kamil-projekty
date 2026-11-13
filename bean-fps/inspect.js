// Bean FPS – oglądanie broni (klawisz F) w stylu CS: choreografia z klatek kluczowych + interpolacja Catmull-Rom.
//
// Klatka kluczowa (wszystkie kanały poza t są opcjonalne; brakujący kanał = wartość z poprzedniej klatki, na starcie 0):
//   t    czas [s]
//   p    [x,y,z]  przesunięcie broni w układzie kamery [m] (FPS); w 3. osobie to samo w układzie tułowia (×0.8)
//   r    [rx,ry,rz] obrót broni [rad]: rz = przechył wokół osi lufy (najpierw), potem rx = lufa w górę/dół
//        i ry = skręt lufy w lewo(+)/prawo(−) w układzie kamery
//   piv  0..1 punkt obrotu wzdłuż broni: 0 = nad chwytem, 1 = środek długości broni
//   pvy  0..1 wysokość punktu obrotu: 0 = dłoń na chwycie, 1 = linia lufy (przechył wokół lufy przy prawej dłoni)
//   L    kotwica lewej dłoni (nazwy w ANCHORS; 'grip' = zwykły chwyt, 'rest' = ręka poza kadrem)
//   lo   [x,y,z] przesunięcie celu lewej dłoni w układzie broni [m] (dla 'rest': w układzie kamery)
//   wk   0..1 ile przedramię prawej ręki podąża za skrętem/pochyleniem broni (przechył robi nadgarstek, nie przedramię)
//   rp   [x,y,z] kierunek łokcia prawej ręki (układ kamery); domyślnie z układu broni w FPS
//   lp   [x,y,z] kierunek łokcia lewej ręki (układ kamery); domyślnie z układu broni w FPS
//   lwk  0..1 jak mocno przedramię lewej ręki trzyma naturalny kierunek kotwicy (reszta: kierunek łokcia lp)
//   sl   0..1 zamek / rączka przeładowania (ułamek pełnego cofnięcia)
//   mg   wysunięcie magazynka wzdłuż jego osi [m]
//   sh   [x,y,z] przesunięcie barków (ruch tułowia) w układzie kamery [m]
// Zdarzenia dźwiękowe: events: [{t, s:'cloth'|'grab'|'tap'|'click'|'slide'|'ratchet'}]
// spring: {w, z} – sprężyna (częstość [rad/s], tłumienie) nałożona na p i r: bezwładność, lekkie przeregulowanie
// przy zatrzymaniach i dochodzenie do pozy (jak cięższa broń w dłoniach). Choreografia kończy się po dur + SETTLE.

// Kotwice lewej dłoni w układzie broni: p = punkt na powierzchni, n = normalna na zewnątrz (dłoń leży o promień
// rurki dalej), w = naturalny kierunek przedramienia (od dłoni do łokcia).
export const ANCHORS = {
  ak47: {
    guard:   { p: [0, .041, -.38],    n: [0, -1, 0],   w: [-.45, -.75, .5] },
    guardR:  { p: [0, .0232, -.275],  n: [0, -1, 0],   w: [-.45, -.75, .5] },
    guardL:  { p: [-.021, .055, -.34], n: [-1, -.25, 0], w: [-.8, -.45, .35] },
    magL:    { p: [-.014, -.045, -.152], n: [-1, 0, 0], w: [-.75, -.5, .45] },
    magBase: { p: [0, -.165, -.205],  n: [0, -.8, -.6], w: [-.35, -.9, .25] },
    magF:    { p: [0, -.115, -.222],  n: [0, -.3, -1],  w: [-.4, -.7, .6] },       // przód dolnego łuku magazynka
    guardS:  { p: [-.012, .03, -.33], n: [-.6, -.8, 0], w: [-.6, -.7, .4] },        // spód łoża od lewej
    chandle: { p: [.048, .092, -.075], n: [1, .2, 0],  w: [-.2, -.35, .9] },
  },
  m4a1s: {
    guard:   { p: [0, .054, -.31],    n: [0, -1, 0],   w: [-.45, -.75, .5] },
    guardF:  { p: [0, .054, -.36],    n: [0, -1, 0],   w: [-.45, -.75, .5] },
    guardFF: { p: [0, .054, -.395],   n: [0, -1, 0],   w: [-.45, -.75, .5] },
    guardR:  { p: [0, .054, -.2],     n: [0, -1, 0],   w: [-.45, -.75, .5] },
    guardL:  { p: [-.023, .08, -.3],  n: [-1, 0, 0],   w: [-.8, -.45, .35] },
    supp:    { p: [0, .0565, -.6],    n: [0, -1, 0],   w: [-.35, -.85, .4] },
    suppTop: { p: [0, .099, -.6],     n: [0, 1, 0],    w: [-.6, .35, .7] },
    suppL:   { p: [-.021, .0775, -.6], n: [-1, 0, 0],  w: [-.85, -.35, .4] },
    magL:    { p: [-.014, -.055, -.115], n: [-1, 0, 0], w: [-.75, -.5, .45] },
    magBase: { p: [0, -.158, -.122],  n: [0, -1, -.15], w: [-.35, -.9, .25] },
    chandle: { p: [0, .102, .118],    n: [0, 1, .3],   w: [-.4, .1, .9] },
  },
  glock: {
    slideTop: { p: [0, .057, -.075],  n: [0, 1, 0],    w: [-.75, .25, .6] },
    slideF:   { p: [0, .057, -.102],  n: [0, 1, 0],    w: [-.75, .25, .6] },
    slideL:   { p: [-.013, .042, -.08], n: [-1, 0, 0], w: [-.85, -.1, .5] },
    frameL:   { p: [-.012, .0, -.045], n: [-1, 0, 0],  w: [-.85, -.35, .4] },
    magBase:  { p: [0, -.087, .03],   n: [0, -1, .2],  w: [-.4, -.85, .3] },
  },
  usps: {
    slideTop: { p: [0, .0597, -.07],  n: [0, 1, 0],    w: [-.75, .25, .6] },
    slideF:   { p: [0, .0597, -.1],   n: [0, 1, 0],    w: [-.75, .25, .6] },
    slideL:   { p: [-.0138, .044, -.08], n: [-1, 0, 0], w: [-.85, -.1, .5] },
    frameL:   { p: [-.012, .0, -.045], n: [-1, 0, 0],  w: [-.85, -.35, .4] },
    supp:     { p: [0, .024, -.24],   n: [0, -1, 0],   w: [-.4, -.85, .35] },
    suppL:    { p: [-.0175, .0415, -.24], n: [-1, 0, 0], w: [-.85, -.35, .4] },
    suppTop:  { p: [0, .059, -.24],   n: [0, 1, 0],    w: [-.6, .35, .7] },
    magBase:  { p: [0, -.087, .03],   n: [0, -1, .2],  w: [-.4, -.85, .3] },
  },
};

// ---------------- choreografie ----------------
// Rytm jak w CS: wyprzedzenie → pokazanie jednego boku (ruchome przytrzymanie, nigdy martwa pauza) → jeden szybki
// obrót na drugi bok → przytrzymanie → powrót z lekkim przeregulowaniem. Prawa dłoń nigdy nie puszcza chwytu,
// obrót idzie z nadgarstka (punkt obrotu blisko chwytu). Konwencja r: rx + = lufa w górę, ry + = lufa w lewo,
// rz + = przechył przeciwnie do wskazówek zegara (góra broni w lewo).
export const TIMELINES = {
  // AK-47: lewy bok położony płasko do kamery, lewa dłoń trzyma zakrzywiony magazynek; przewrót na prawy bok
  // (okno wyrzutowe, rączka zamka), lewa dłoń wraca pod łoże; powrót.
  ak47: {
    dur: 5.3,
    keys: [
      { t: 0,    p: [0, 0, 0],             r: [0, 0, 0],            piv: .15, L: 'grip' },
      { t: .3,   p: [.004, -.014, .02],    r: [-.05, -.02, .08],    L: 'grip' },                  // wyprzedzenie: lekki dołek i kontra-przechył
      { t: 1.0,  p: [-.085, .045, .05],    r: [.17, .36, -1.12],    L: 'magF' },                  // lewy bok płasko, dłoń na magazynku
      { t: 1.85, p: [-.09, .052, .056],    r: [.21, .43, -1.24],    L: 'magF' },                  // ruchome przytrzymanie
      { t: 2.18, p: [-.088, .068, .06],    r: [.27, .38, -.05],     L: 'guard', lo: [0, -.004, .03] },   // szybkie przejście przez pion
      { t: 2.7,  p: [-.08, .062, .055],    r: [.26, .3, 1.22],      L: 'guardS' },                // prawy bok do góry
      { t: 3.6,  p: [-.083, .066, .058],   r: [.2, .38, 1.32],      L: 'guardS' },
      { t: 4.4,  p: [-.01, .004, .01],     r: [.02, .04, .05],      L: 'grip' },                  // powrót
      { t: 4.75, p: [.002, -.008, -.004],  r: [-.03, -.01, -.05],   L: 'grip' },                  // przeregulowanie
      { t: 5.3,  p: [0, 0, 0],             r: [0, 0, 0],            L: 'grip' },
    ],
    events: [{ t: .25, s: 'cloth' }, { t: .95, s: 'grab' }, { t: 1.95, s: 'cloth' }, { t: 2.65, s: 'grab' }, { t: 3.9, s: 'cloth' }, { t: 4.4, s: 'grab' }],
  },
  // M4A1-S: przechył w lewo (prawy bok z oknem wyrzutowym do góry, tłumik w lewy górny róg), szybkie przerzucenie
  // w poprzek ekranu (lewy profil, tłumik w lewo), uniesienie, by spojrzeć wzdłuż góry i tłumika; powrót.
  m4a1s: {
    dur: 5.6,
    keys: [
      { t: 0,    p: [0, 0, 0],             r: [0, 0, 0],            piv: .15, L: 'grip' },
      { t: .3,   p: [.004, -.012, .01],    r: [-.05, .08, .16],     L: 'grip' },
      { t: .95,  p: [-.065, .05, .05],     r: [.33, .5, 1.5],       L: 'guard' },                 // prawy bok do góry
      { t: 1.38, p: [-.07, .055, .053],    r: [.36, .54, 1.62],     L: 'guardF' },
      { t: 2.0,  p: [-.12, .012, .07],     r: [.12, 1.36, .12],     L: 'guardF', piv: .3 },       // szybkie przerzucenie: lewy profil
      { t: 2.75, p: [-.122, .016, .074],   r: [.11, 1.4, .17],      L: 'guardF' },
      { t: 3.45, p: [-.125, .02, .078],    r: [.13, 1.43, .21],     L: 'guardF' },
      { t: 4.3,  p: [-.1, .035, .07],      r: [.48, 1.02, .5],      L: 'guardFF' },               // lufa w górę: wzdłuż góry i tłumika
      { t: 4.55, p: [-.098, .036, .07],    r: [.5, 1.0, .52],       L: 'guardFF' },
      { t: 5.12, p: [.003, -.008, -.003],  r: [-.04, -.01, -.03],   L: 'grip', piv: .15 },
      { t: 5.6,  p: [0, 0, 0],             r: [0, 0, 0],            L: 'grip' },
    ],
    events: [{ t: .25, s: 'cloth' }, { t: .95, s: 'grab' }, { t: 1.5, s: 'cloth' }, { t: 2.0, s: 'grab' }, { t: 3.6, s: 'cloth' }, { t: 5.0, s: 'grab' }],
  },
  // Glock-18: lewa dłoń puszcza i wychodzi z kadru; zamach do środka przez celownik (lewy bok), przewrót
  // przedramieniem dłonią w dół (prawy bok z oknem wyrzutowym do góry), powrót i ponowne objęcie chwytu.
  glock: {
    dur: 4.5,
    keys: [
      { t: 0,    p: [0, 0, 0],             r: [0, 0, 0],            piv: .1, L: 'grip' },
      { t: .32,  p: [.004, -.02, .01],     r: [-.09, -.03, .03],    L: 'rest', lo: [.04, .1, .0] },
      { t: .95,  p: [-.075, .035, .045],   r: [.17, 1.2, .3],       L: 'rest' },                  // lewy bok, przez celownik
      { t: 1.75, p: [-.08, .04, .05],      r: [.24, 1.3, .34],      L: 'rest' },
      { t: 2.35, p: [-.04, .05, .05],      r: [.48, .38, 1.95],     L: 'rest' },                  // przewrót: prawy bok do góry
      { t: 3.15, p: [-.042, .054, .052],   r: [.52, .42, 2.12],     L: 'rest', lo: [.03, .08, 0] },
      { t: 3.8,  p: [.002, -.006, .0],     r: [.01, .02, .03],      L: 'grip' },                  // powrót, lewa dłoń obejmuje
      { t: 4.08, p: [.003, -.012, -.003],  r: [-.03, -.01, -.07],   L: 'grip' },
      { t: 4.5,  p: [0, 0, 0],             r: [0, 0, 0],            L: 'grip' },
    ],
    events: [{ t: .2, s: 'cloth' }, { t: 1.8, s: 'cloth' }, { t: 3.7, s: 'grab' }],
  },
  // USP-S: lewa dłoń wychodzi z kadru; lewy profil (pistolet i długi tłumik poziomo w poprzek ekranu), przewrót
  // dłonią w dół (prawy bok, tłumik w lewy górny róg), powrót i ponowne objęcie chwytu.
  usps: {
    dur: 5.3,
    keys: [
      { t: 0,    p: [0, 0, 0],             r: [0, 0, 0],            piv: .1, L: 'grip' },
      { t: .1,   p: [0, -.01, 0],          r: [-.035, 0, 0],        L: 'grip' },
      { t: .45,  p: [-.03, .025, .03],     r: [.02, .26, -.05],     L: 'rest', lo: [.04, .1, 0] },
      { t: 1.05, p: [-.05, .02, .04],      r: [-.09, 1.31, -.26],   L: 'rest' },                  // lewy profil z tłumikiem
      { t: 1.75, p: [-.052, .022, .05],    r: [-.07, 1.4, -.24],    L: 'rest' },
      { t: 1.83, p: [-.051, .02, .05],     r: [-.1, 1.39, -.33],    L: 'rest' },                  // mikro-wyprzedzenie przewrotu
      { t: 2.5,  p: [-.04, .04, .055],     r: [.52, .61, 2.09],     L: 'rest' },                  // przewrót: prawy bok
      { t: 2.62, p: [-.04, .041, .056],    r: [.53, .6, 1.99],      L: 'rest' },
      { t: 3.5,  p: [-.042, .044, .058],   r: [.6, .64, 2.17],      L: 'rest', lo: [.03, .08, 0] },
      { t: 4.3,  p: [.006, -.012, -.004],  r: [-.05, .01, .02],     L: 'grip' },
      { t: 4.65, p: [-.002, .004, .002],   r: [.02, 0, -.01],       L: 'grip' },
      { t: 5.3,  p: [0, 0, 0],             r: [0, 0, 0],            L: 'grip' },
    ],
    events: [{ t: .25, s: 'cloth' }, { t: 1.9, s: 'cloth' }, { t: 4.25, s: 'grab' }],
  },
};

// ---------------- interpolacja ----------------
const CH_VEC = ['p', 'r', 'sh'], CH_NUM = ['piv', 'pvy', 'sl', 'mg', 'wk', 'lwk'], CH_OPT = ['rp', 'lp'];
const DEF = { p: [0, 0, 0], r: [0, 0, 0], sh: [0, 0, 0], piv: .15, pvy: 1, sl: 0, mg: 0, wk: .45, lwk: .35 };
export const SETTLE = .35;                      // czas dojścia sprężyny po ostatniej klatce
const BAKE_HZ = 240;

// Uzupełnia brakujące kanały (wartość z poprzedniej klatki) – raz na choreografię.
export function prepareTimeline(tl) {
  if (tl._ready) return tl;
  let prev = { ...DEF, L: 'grip', lo: [0, 0, 0], rp: null, lp: null };
  for (const k of tl.keys) {
    for (const c of [...CH_VEC, ...CH_NUM, ...CH_OPT, 'L']) if (k[c] === undefined) k[c] = prev[c];
    if (k.lo === undefined) k.lo = (k.L === prev.L) ? prev.lo : [0, 0, 0];
    prev = k;
  }
  tl.events = (tl.events || []).slice().sort((a, b) => a.t - b.t);
  bake(tl);
  tl._ready = true;
  return tl;
}

// Mikro-dryf (oddech, drżenie rąk) – deterministyczny w czasie, z obwiednią: zero na początku i na końcu.
function drift(tl, t, out) {
  const e = Math.min(1, Math.max(0, t / .5)) * Math.min(1, Math.max(0, (tl.dur - t) / .6)), E = e * e * (3 - 2 * e), P2 = Math.PI * 2;
  out[0] = E * .0016 * Math.sin(P2 * .29 * t + .7);                        // p.y
  out[1] = E * (.006 * Math.sin(P2 * .43 * t + 1.1) + .003 * Math.sin(P2 * .71 * t + .2));   // rx
  out[2] = E * (.007 * Math.sin(P2 * .37 * t + 2.0) + .002 * Math.sin(P2 * .83 * t + 1.3));  // ry
  out[3] = E * (.009 * Math.sin(P2 * .53 * t + .5) + .003 * Math.sin(P2 * .97 * t + 2.4));   // rz
  return out;
}
// Wypiekanie p i r: krzywa z klatek + dryf → sprężyna 2. rzędu (semi-implicit Euler, 240 Hz).
function bake(tl) {
  const sp = tl.spring || { w: 15, z: .8 }, n = Math.ceil((tl.dur + SETTLE) * BAKE_HZ) + 2, dt = 1 / BAKE_HZ;
  const B = { n, p: [0, 1, 2].map(() => new Float32Array(n)), r: [0, 1, 2].map(() => new Float32Array(n)) };
  const x = new Float32Array(6), v = new Float32Array(6), tmp = newInspectState(), dr = [0, 0, 0, 0];
  const w2 = sp.w * sp.w, c = 2 * sp.z * sp.w;
  for (let k = 0; k < n; k++) {
    const t = k * dt; rawEval(tl, Math.min(t, tl.dur), tmp); drift(tl, Math.min(t, tl.dur), dr);
    const tg = [tmp.p[0], tmp.p[1] + dr[0], tmp.p[2], tmp.r[0] + dr[1], tmp.r[1] + dr[2], tmp.r[2] + dr[3]];
    for (let j = 0; j < 6; j++) { v[j] += (w2 * (tg[j] - x[j]) - c * v[j]) * dt; x[j] += v[j] * dt; }
    const f = t > tl.dur + SETTLE - .12 ? Math.max(0, (tl.dur + SETTLE - t) / .12) : 1;    // dokładnie zero na końcu
    for (let j = 0; j < 3; j++) { B.p[j][k] = x[j] * f; B.r[j][k] = x[3 + j] * f; }
  }
  tl._bake = B;
}

// Hermite z tangentami Catmulla-Roma dla nierównych odstępów czasu; końce choreografii z zerową prędkością.
function seg(tl, t) {
  const K = tl.keys, n = K.length;
  if (t <= K[0].t) return { i: 0, u: 0 };
  if (t >= K[n - 1].t) return { i: n - 2, u: 1 };
  let i = 0; while (i < n - 2 && t > K[i + 1].t) i++;
  return { i, u: (t - K[i].t) / Math.max(1e-6, K[i + 1].t - K[i].t) };
}
const TENSION = .85;
function tangent(K, i, get) {
  if (i <= 0 || i >= K.length - 1) return 0;
  const a = get(K[i - 1]), b = get(K[i + 1]), dt = K[i + 1].t - K[i - 1].t;
  return dt > 0 ? (b - a) / dt * TENSION : 0;
}
function herm(K, i, u, get) {
  const k0 = K[i], k1 = K[i + 1], h = k1.t - k0.t;
  const p0 = get(k0), p1 = get(k1), m0 = tangent(K, i, get) * h, m1 = tangent(K, i + 1, get) * h;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1;
}

export function newInspectState() {
  return { p: [0, 0, 0], r: [0, 0, 0], sh: [0, 0, 0], rp: [0, 0, 0], lp: [0, 0, 0], piv: .15, pvy: 1, sl: 0, mg: 0, wk: .45, lwk: .35, i: 0, u: 0 };
}
const _noDefs = { rp: [0, 0, 0], lp: [0, 0, 0] };
function rawEval(tl, t, out, defs = _noDefs) {
  const K = tl.keys, { i, u } = seg(tl, t);
  out.i = i; out.u = u;
  for (const c of CH_VEC) for (let j = 0; j < 3; j++) out[c][j] = herm(K, i, u, k => k[c][j]);
  for (const c of CH_NUM) out[c] = herm(K, i, u, k => k[c]);
  for (const c of CH_OPT) for (let j = 0; j < 3; j++) out[c][j] = herm(K, i, u, k => (k[c] || defs[c])[j]);
  return out;
}

// Kanały liczbowe w chwili t → out. defs = {rp:[..], lp:[..]}: kierunki łokci, gdy klatka ich nie podaje.
export function evalInspect(tl, t, out, defs) {
  rawEval(tl, Math.min(t, tl.dur), out, defs);
  const B = tl._bake;
  if (B) {                                         // p i r z wypieczonej sprężyny
    const f = Math.min(B.n - 1.001, Math.max(0, t * BAKE_HZ)), k = Math.floor(f), a = f - k;
    for (let j = 0; j < 3; j++) { out.p[j] = B.p[j][k] * (1 - a) + B.p[j][k + 1] * a; out.r[j] = B.r[j][k] * (1 - a) + B.r[j][k + 1] * a; }
  }
  out.sl = Math.min(1, Math.max(0, out.sl)); out.mg = Math.max(0, out.mg);
  out.wk = Math.min(1, Math.max(0, out.wk)); out.lwk = Math.min(1, Math.max(0, out.lwk));
  return out;
}

// Cel lewej dłoni i kierunek przedramienia (układ broni). resolve(key, i) zwraca {p:[...], n:[...], w:[...]}
// dla kotwicy klatki (już w układzie broni, z przesunięciem lo). Między różnymi kotwicami dłoń leci łukiem
// odsuniętym od broni (wzdłuż średniej normalnej), żeby nie przechodziła przez nią.
const _r = [null, null, null, null];
export function evalLeft(tl, t, resolve, outP, outW) {
  const K = tl.keys, { i, u } = seg(tl, t);
  const ia = Math.max(0, i - 1), ib = Math.min(K.length - 1, i + 2);
  const A = resolve(K[i], i), B = resolve(K[i + 1], i + 1);
  const Am = resolve(K[ia], ia), Bp = resolve(K[ib], ib);
  // Hermite po pozycjach rozwiązanych kotwic (tangenty z sąsiednich klatek)
  const h = K[i + 1].t - K[i].t;
  const tan = (P, N, tP, tN, cur) => (cur <= 0 || cur >= K.length - 1) ? 0 : (N - P) / Math.max(1e-6, tN - tP) * TENSION * h;
  const u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  for (let j = 0; j < 3; j++) {
    const m0 = tan(Am.p[j], B.p[j], K[ia].t, K[i + 1].t, i), m1 = tan(A.p[j], Bp.p[j], K[i].t, K[ib].t, i + 1);
    outP[j] = h00 * A.p[j] + h10 * m0 + h01 * B.p[j] + h11 * m1;
  }
  if (K[i].L !== K[i + 1].L) {                         // łuk przy zmianie chwytu
    const dx = B.p[0] - A.p[0], dy = B.p[1] - A.p[1], dz = B.p[2] - A.p[2], d = Math.hypot(dx, dy, dz);
    let nx = A.n[0] + B.n[0], ny = A.n[1] + B.n[1], nz = A.n[2] + B.n[2]; const nl = Math.hypot(nx, ny, nz) || 1;
    const bulge = Math.sin(Math.PI * u) * Math.min(.06, d * .45) / nl;
    outP[0] += nx * bulge; outP[1] += ny * bulge; outP[2] += nz * bulge;
  }
  const e = u * u * (3 - 2 * u);
  for (let j = 0; j < 3; j++) outW[j] = A.w[j] + (B.w[j] - A.w[j]) * e;
  const wl = Math.hypot(outW[0], outW[1], outW[2]) || 1; outW[0] /= wl; outW[1] /= wl; outW[2] /= wl;
  return { i, u, la: K[i].L, lb: K[i + 1].L };
}

export function inspectEvents(tl) { return tl.events || []; }
