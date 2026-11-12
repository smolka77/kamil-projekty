// Hangar w tle lobby: stalowe ściany, brama, neon, ściana z bronią, skrzynie, torby z pieniędzmi i 3 auta sportowe.
// buildHangar(scene, renderer) -> { update(t, dt) }   (fasolka stoi w (0,0,0), kamera patrzy w stronę -Z)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
function canvasTex(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function buildHangar(scene, renderer) {
  const rnd = rng(5), R = (a, b) => a + (b - a) * rnd();
  const W = 11, BACK = -16, H = 9;                  // pół-szerokość, tylna ściana, wysokość

  // odbicia (lakier, posadzka) z wirtualnego pomieszczenia
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .75;
  scene.background = new THREE.Color(0x0c0f14);
  scene.fog = new THREE.FogExp2(0x0c0f14, .016);

  const add = (geo, mat, x, y, z, o = {}) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz;
    m.castShadow = o.cast !== false; m.receiveShadow = true; (o.parent || scene).add(m); return m;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const std = (color, roughness = .7, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

  // ---------- posadzka: wypolerowany beton z fugami ----------
  const floorTex = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#6b7076'; x.fillRect(0, 0, w, h);
    const r = rng(11);
    for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${r() < .5 ? '40,44,50' : '150,155,160'},${.04 + r() * .07})`; x.beginPath(); x.arc(r() * w, r() * h, 2 + r() * 22, 0, 7); x.fill(); }
    x.strokeStyle = 'rgba(25,28,32,.55)'; x.lineWidth = 3; x.strokeRect(0, 0, w, h);
  }, { repeat: [11, 13] });
  add(new THREE.PlaneGeometry(2 * W, 28), std(0xffffff, .38, .08, { map: floorTex }), 0, 0, -2, { rx: -Math.PI / 2, cast: false });
  // żółte linie stanowisk pod autami i pas ostrzegawczy przy ścianie
  const yellow = std(0xf2c230, .6);
  const bay = (cx, cz, ry) => { const g = new THREE.Group(); g.position.set(cx, .004, cz); g.rotation.y = ry; scene.add(g);
    for (const [w, d, x, z] of [[6.2, .12, 0, -1.6], [6.2, .12, 0, 1.6], [.12, 3.3, -3.05, 0]]) add(box(w, .004, d), yellow, x, 0, z, { parent: g, cast: false }); };
  bay(-4.3, -6.6, -.68); bay(4.4, -7.0, .68);
  const hazTex = canvasTex(256, 64, (x, w, h) => { x.fillStyle = '#f2c230'; x.fillRect(0, 0, w, h); x.fillStyle = '#16181c';
    for (let i = -2; i < 10; i++) { x.beginPath(); x.moveTo(i * 32, h); x.lineTo(i * 32 + 16, h); x.lineTo(i * 32 + 48, 0); x.lineTo(i * 32 + 32, 0); x.fill(); } }, { repeat: [12, 1] });
  add(new THREE.PlaneGeometry(2 * W, .5), std(0xffffff, .7, 0, { map: hazTex }), 0, .005, BACK + .5, { rx: -Math.PI / 2, cast: false });

  // ---------- ściany z blachy falistej, słupy i belki ----------
  const corr = (rep) => canvasTex(256, 64, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 8; i++) { g.addColorStop(i / 8, i % 2 ? '#2b333d' : '#4a5562'); }
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }, { repeat: rep });
  add(new THREE.PlaneGeometry(2 * W, H), std(0xffffff, .55, .55, { map: corr([10, 1]) }), 0, H / 2, BACK, { cast: false });
  for (const s of [-1, 1]) add(new THREE.PlaneGeometry(28, H), std(0xffffff, .55, .55, { map: corr([12, 1]) }), s * W, H / 2, -2, { ry: -s * Math.PI / 2, cast: false });
  add(new THREE.PlaneGeometry(2 * W, 28), std(0x15181d, .9), 0, H, -2, { rx: Math.PI / 2, cast: false });
  const steel = std(0x2a2e35, .45, .8);
  for (const x of [-W + .3, -3.6, 3.6, W - .3]) add(box(.5, H, .5), steel, x, H / 2, BACK + .3);       // słupy przy tylnej ścianie
  for (const z of [-11, -6, -1]) for (const s of [-1, 1]) add(box(.5, H, .5), steel, s * (W - .3), H / 2, z);
  add(box(2 * W, .6, .5), steel, 0, 7.3, BACK + .35);                                                     // belka nad bramą
  for (const z of [-13, -8, -3]) { add(box(2 * W, .45, .35), steel, 0, 8.2, z); }                          // kratownica dachu
  for (let i = 0; i < 11; i++) add(box(.12, .12, 2.9), steel, -W + 1 + i * 2, 7.95, -9.5, { rx: .25 });

  // ---------- brama hangaru (lewa część tylnej ściany) ----------
  const gate = new THREE.Group(); gate.position.set(-6.6, 0, BACK + .05); scene.add(gate);
  const hz = std(0xffffff, .6, 0, { map: canvasTex(64, 256, (x, w, h) => { x.fillStyle = '#f2c230'; x.fillRect(0, 0, w, h); x.fillStyle = '#16181c';
    for (let i = -2; i < 10; i++) { x.beginPath(); x.moveTo(0, i * 32); x.lineTo(w, i * 32 + 32); x.lineTo(w, i * 32 + 48); x.lineTo(0, i * 32 + 16); x.fill(); } }, { repeat: [1, 4] }) });
  for (const x of [-3.9, 3.9]) add(box(.35, 6.3, .3), hz, x, 3.15, .1, { parent: gate });
  add(box(8.15, .35, .3), hz, 0, 6.3, .1, { parent: gate });
  const panel = std(0x8a929c, .5, .6);
  for (let i = 0; i < 11; i++) add(box(7.5, .5, .12), panel, 0, .55 + i * .53, 0, { parent: gate });       // segmenty bramy
  add(box(7.5, .22, .02), new THREE.MeshBasicMaterial({ color: 0xbfe4ff }), 0, .14, .02, { parent: gate, cast: false });   // szpara z dziennym światłem
  const spill = canvasTex(64, 64, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(190,225,255,.55)'); g.addColorStop(1, 'rgba(190,225,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }, { srgb: true });
  add(new THREE.PlaneGeometry(7.5, 3), new THREE.MeshBasicMaterial({ map: spill, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), -6.6, .01, BACK + 1.6, { rx: -Math.PI / 2, cast: false });

  // ---------- neon na tylnej ścianie ----------
  const neonTex = canvasTex(1024, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.font = 'italic 900 150px Anton, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const [blur, col] of [[40, '#ff2f9a'], [18, '#ff4fb0'], [0, '#ffe3f3']]) { x.shadowColor = '#ff2f9a'; x.shadowBlur = blur; x.fillStyle = col; x.fillText('FASOLKA', w / 2, h / 2); }
  });
  add(box(6.4, 1.7, .08), std(0x0b0d10, .6, .3), 0.6, 5.6, BACK + .12, { cast: false });
  const neon = add(new THREE.PlaneGeometry(6.6, 1.65), new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, depthWrite: false, toneMapped: false }), 0.6, 5.6, BACK + .2, { cast: false });
  const neonLight = new THREE.PointLight(0xff3fa4, 9, 14, 1.6); neonLight.position.set(0.6, 5.4, BACK + 1.4); scene.add(neonLight);

  // ---------- ściana z bronią (prawa część tylnej ściany) ----------
  const ars = new THREE.Group(); ars.position.set(6.9, 0, BACK + .1); scene.add(ars);
  const peg = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#1d2127'; x.fillRect(0, 0, w, h); x.fillStyle = '#0c0e11';
    for (let i = 8; i < w; i += 16) for (let j = 8; j < h; j += 16) { x.beginPath(); x.arc(i, j, 2.4, 0, 7); x.fill(); } }, { repeat: [3, 2] });
  add(box(6.6, 4, .12), std(0xffffff, .8, .2, { map: peg }), 0, 2.85, 0, { parent: ars, cast: false });
  for (const [w, h, x, y] of [[6.8, .14, 0, .8], [6.8, .14, 0, 4.9], [.14, 4.2, -3.37, 2.85], [.14, 4.2, 3.37, 2.85]]) add(box(w, h, .2), steel, x, y, .05, { parent: ars });
  add(box(6.4, .05, .05), new THREE.MeshBasicMaterial({ color: 0xdff4ff }), 0, 4.78, .14, { parent: ars, cast: false });   // listwa LED
  const ledLight = new THREE.SpotLight(0xdff4ff, 45, 8, 1.0, .6, 1.2); ledLight.position.set(6.9, 4.7, BACK + .9); ledLight.target.position.set(6.9, 1.8, BACK); scene.add(ledLight, ledLight.target);
  const gunM = std(0x2c3038, .35, .75), tanM = std(0xb39262, .6, .1), gunM2 = std(0x5a606a, .3, .85);
  function rifle(len, furn = gunM, scope = true) {
    const g = new THREE.Group(), s = len / 1.1;
    add(box(.42 * s, .09, .05), gunM, 0, 0, 0, { parent: g });                            // komora
    add(new THREE.CylinderGeometry(.018, .018, .45 * s, 8), gunM2, .43 * s, .01, 0, { parent: g, rz: Math.PI / 2 });   // lufa
    add(box(.28 * s, .07, .05), furn, .2 * s, -.005, 0, { parent: g });                   // łoże
    add(box(.26 * s, .12, .045), furn, -.33 * s, -.03, 0, { parent: g, rz: .08 });        // kolba
    add(box(.06, .16, .04), gunM, .04 * s, -.11, 0, { parent: g, rz: -.18 });             // magazynek
    add(box(.05, .11, .04), furn, -.12 * s, -.08, 0, { parent: g, rz: .35 });             // chwyt
    if (scope) add(new THREE.CylinderGeometry(.026, .026, .2 * s, 10), gunM2, .02, .085, 0, { parent: g, rz: Math.PI / 2 });
    return g;
  }
  function pistol() { const g = new THREE.Group();
    add(box(.22, .06, .035), gunM2, 0, 0, 0, { parent: g }); add(box(.06, .13, .033), gunM, -.07, -.07, 0, { parent: g, rz: .25 }); return g; }
  const place = (g, x, y, rz = 0) => { g.position.set(x, y, .14); g.rotation.z = rz; ars.add(g); };
  place(rifle(1.75), -1.6, 4.15); place(rifle(1.65, tanM), 1.6, 4.15);
  place(rifle(1.85, gunM, false), -1.6, 3.25); place(rifle(1.6, tanM, false), 1.6, 3.25);
  place(rifle(1.9), -1.6, 2.35); place(rifle(1.75, gunM, true), 1.6, 2.35);
  for (let i = 0; i < 5; i++) { const pp = pistol(); pp.scale.setScalar(1.6); place(pp, -2.5 + i * 1.25, 1.4); }
  for (let i = 0; i < 3; i++) add(box(.55, .32, .32), std(0x3c4a2c, .8), 5 + i * .62, .16, BACK + .55, { ry: R(-.1, .1) });   // skrzynki z amunicją

  // ---------- drewniane skrzynie i palety ----------
  const crateTex = canvasTex(256, 256, (x, w, h) => {
    const r = rng(23);
    for (let i = 0; i < 8; i++) { x.fillStyle = `hsl(32,${38 + r() * 12}%,${34 + r() * 10}%)`; x.fillRect(0, i * 32, w, 32); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, i * 32, w, 2); }
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(60,35,15,${r() * .25})`; x.fillRect(r() * w, r() * h, 20 + r() * 60, 1); }
    x.fillStyle = 'hsl(30,40%,28%)'; x.lineWidth = 22; x.strokeStyle = 'hsl(30,42%,30%)'; x.strokeRect(11, 11, w - 22, h - 22);
    x.beginPath(); x.moveTo(20, 20); x.lineTo(w - 20, h - 20); x.lineWidth = 20; x.stroke();
    x.fillStyle = 'rgba(20,20,20,.55)'; x.font = 'bold 26px sans-serif'; x.textAlign = 'center'; x.fillText('FRAGILE', w / 2, h / 2 + 52);
  });
  const crateM = std(0xffffff, .85, 0, { map: crateTex });
  const crate = (s, x, y, z, ry = 0) => add(box(s, s, s), crateM, x, y + s / 2, z, { ry });
  const palletM = std(0x9a7b52, .9);
  const pallet = (x, z, ry = 0) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    for (let i = 0; i < 5; i++) add(box(1.2, .03, .16), palletM, 0, .13, -.5 + i * .25, { parent: g });
    for (const zz of [-.45, 0, .45]) add(box(1.2, .1, .1), palletM, 0, .06, zz, { parent: g }); return g; };
  // lewy pierwszy plan (rama kadru)
  crate(1.1, -5.9, 0, -3.2, .12); crate(1, -5.85, 1.1, -3.15, .3); crate(.8, -6.0, 0, -1.9, -.2);
  // lewa ściana w głębi
  for (const [x, z, s, y, ry] of [[-9.3, -12.5, 1.3, 0, 0], [-9.3, -11.1, 1.3, 0, .05], [-9.25, -11.8, 1.2, 1.3, -.1], [-7.9, -12.6, 1, 0, .2], [-9.4, -9.5, .9, 0, -.15]]) crate(s, x, y, z, ry);
  // prawa ściana w głębi
  for (const [x, z, s, y, ry] of [[9.4, -11.6, 1.2, 0, .1], [9.35, -10.3, 1.1, 0, -.1], [9.4, -11, 1, 1.2, .25], [8.2, -12.4, .8, 0, 0]]) crate(s, x, y, z, ry);

  // ---------- torby z pieniędzmi, paczki banknotów, sztabki ----------
  const bagTex = canvasTex(256, 128, (x, w, h) => {
    x.fillStyle = '#c9b184'; x.fillRect(0, 0, w, h); const r = rng(31);
    for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(90,70,40,${r() * .12})`; x.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
    x.fillStyle = '#2f6b33'; x.font = 'bold 64px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('$', w * .25, h * .55); x.fillText('$', w * .75, h * .55);
  });
  const bagGeo = new THREE.LatheGeometry([[0, 0], [.2, .01], [.3, .08], [.33, .2], [.28, .34], [.15, .44], [.07, .48], [.08, .52], [.14, .58], [.1, .62], [0, .6]].map(p => new THREE.Vector2(p[0], p[1])), 14);
  const bagM = std(0xffffff, .95, 0, { map: bagTex }), tieM = std(0x6b4a2a, .8);
  const bag = (x, y, z, s = 1, ry = 0, tilt = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(tilt, ry, tilt * .5); g.scale.setScalar(s); scene.add(g);
    add(bagGeo, bagM, 0, 0, 0, { parent: g }); add(new THREE.TorusGeometry(.075, .018, 6, 12), tieM, 0, .5, 0, { parent: g, rx: Math.PI / 2 }); return g; };
  const cashTex = canvasTex(128, 64, (x, w, h) => { x.fillStyle = '#5f8f5a'; x.fillRect(0, 0, w, h); x.fillStyle = '#86b07c'; x.fillRect(8, 8, w - 16, h - 16);
    x.fillStyle = '#e8e0c8'; x.fillRect(w / 2 - 12, 0, 24, h); x.fillStyle = '#2f5a30'; x.font = 'bold 30px Georgia'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('$', w * .25, h / 2); x.fillText('$', w * .75, h / 2); });
  const cashM = std(0xffffff, .8, 0, { map: cashTex }), cashSide = std(0xd7dcc8, .9);
  const cashGeo = box(.32, .08, .15), cashMats = [cashSide, cashSide, cashM, cashSide, cashSide, cashSide];
  // prawy pierwszy plan: paleta z workami i stos banknotów na skrzyni (rama kadru)
  pallet(-3.7, -1.3, .2);
  bag(-4.0, .16, -1.1, 1.05, .4); bag(-3.4, .16, -1.5, 1, 1.4); bag(-3.35, .16, -.95, .95, 2.2, .1); bag(-3.75, .55, -1.3, .9, .8, -.25); bag(-4.2, .16, -1.65, .85, 3);
  // prawy pierwszy plan: skrzynie, na nich paczki banknotów i sztabki złota
  crate(1.1, 5.5, 0, -3.2, -.2); crate(1, 5.45, 1.1, -3.2, -.05); crate(.8, 6.4, 0, -2.2, .3);
  const top = 2.1;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { const m = new THREE.Mesh(cashGeo, cashMats); m.position.set(5.25 + (j % 2) * .34, top + .04 + i * .081, -3.4 + Math.floor(j / 2) * .17); m.rotation.y = -.05 + R(-.05, .05); m.castShadow = true; scene.add(m); }
  const goldM = std(0xf2c24a, .25, 1), barGeo = new THREE.CylinderGeometry(.07, .1, .07, 4); barGeo.rotateY(Math.PI / 4); barGeo.scale(2.2, 1, 1);
  for (let i = 0; i < 5; i++) add(barGeo, goldM, 5.45 + (i % 3) * .2 - .1, top + .035 + Math.floor(i / 3) * .07, -2.92, { ry: -.05 });
  // przy ścianie z bronią
  pallet(9.2, -14.2, .3); bag(9.0, .16, -14.0, 1.1, 0); bag(9.5, .16, -14.4, 1, 1.7); bag(9.25, .55, -14.2, .9, 3, .2);

  // ---------- beczki i opony ----------
  for (const [x, z, c] of [[-9.6, -7.6, 0x9c2a26], [-9.0, -6.9, 0x2a5e9c], [-9.7, -6.7, 0x9c2a26]]) {
    const m = std(c, .5, .4); add(new THREE.CylinderGeometry(.3, .3, .9, 18), m, x, .45, z);
    for (const y of [.15, .75]) add(new THREE.TorusGeometry(.3, .02, 6, 18), m, x, y, z, { rx: Math.PI / 2 });
  }
  const tireM = std(0x111214, .9);
  for (let i = 0; i < 4; i++) add(new THREE.TorusGeometry(.34, .14, 10, 22), tireM, 9.4, .14 + i * .27, -7.5, { rx: Math.PI / 2, rz: i * .3 });

  // ---------- auta sportowe ----------
  const paint = c => new THREE.MeshPhysicalMaterial({ color: c, metalness: .5, roughness: .28, clearcoat: 1, clearcoatRoughness: .06 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0a0e13, metalness: .6, roughness: .06, clearcoat: 1 });
  const carbon = std(0x0d0e10, .45, .35), rubber = std(0x101113, .92);
  const headM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdff2ff, emissiveIntensity: 2.2 });
  const tailM = new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff1a1a, emissiveIntensity: 2.4 });
  const shape = pts => { const s = new THREE.Shape(); s.moveTo(...pts[0]); pts.slice(1).forEach(p => s.lineTo(...p)); return s; };
  const sstep = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const taper = (g, f) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * f(p.getX(i), p.getY(i))); g.computeVertexNormals(); return g; };
  const ext = (pts, depth, bevel) => { const g = new THREE.ExtrudeGeometry(shape(pts), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 2 }); g.translate(0, 0, -depth / 2); g.computeVertexNormals(); return g; };
  const PROFILES = {   // bok auta w osi X (przód = -X), y w górę
    wedge: { body: [[-2.3, .27], [-2.27, .5], [-1.0, .74], [-.62, .8], [1.85, .86], [2.3, .84], [2.33, .4], [2.1, .22], [-2.0, .22]],
      cab: [[-.85, .78], [-.05, 1.12], [1.05, 1.06], [1.95, .86]],
      roof: [[-.35, 1.03], [-.05, 1.135], [1.05, 1.075], [1.42, .99], [1.36, .965], [-.33, 1.0]] },
    smooth: { body: [[-2.25, .3], [-2.23, .5], [-1.45, .66], [-.75, .78], [1.65, .88], [2.25, .82], [2.28, .42], [2.0, .24], [-1.9, .24]],
      cab: [[-.95, .77], [.0, 1.15], [.95, 1.1], [1.85, .87]],
      roof: [[-.42, 1.05], [0, 1.165], [.95, 1.115], [1.42, 1.0], [1.36, .975], [-.4, 1.02]] },
  };
  function car({ color, profile = 'wedge', wing = false, rim = 0xb9bec6, louvres = false }) {
    const g = new THREE.Group(), P = PROFILES[profile], body = paint(color), rimM = std(rim, .25, 1);
    add(taper(ext(P.body, 1.82, .09), (x, y) => (1 - .2 * sstep(y, .42, .9)) * (1 - .26 * sstep(x, -1.0, -2.4)) * (1 - .08 * sstep(x, 1.4, 2.4))), body, 0, 0, 0, { parent: g });
    add(taper(ext(P.cab, 1.36, .12), (x, y) => (1 - .34 * sstep(y, .8, 1.16)) * (1 - .15 * sstep(x, -.2, -1.0))), glass, 0, 0, 0, { parent: g });
    add(ext(P.roof, .84, .035), body, 0, 0, 0, { parent: g });                                   // lakierowany dach
    add(new THREE.PlaneGeometry(5.2, 2.6), shadowM, 0, -.055, 0, { parent: g, rx: -Math.PI / 2, cast: false });   // cień pod autem
    add(box(4.3, .14, 1.98), carbon, .05, .3, 0, { parent: g });                                  // progi
    add(box(.32, .05, 1.92), carbon, -2.22, .25, 0, { parent: g });                               // splitter
    add(box(.3, .16, 1.7), carbon, 2.2, .3, 0, { parent: g });                                    // dyfuzor
    for (const s of [-1, 1]) {
      add(box(.75, .24, .05), carbon, .95, .58, s * .96, { parent: g, ry: s * .08 });             // wloty boczne
      add(box(.1, .06, .2), body, -.55, .93, s * .78, { parent: g });                             // lusterka
      // światła Y z przodu i paski z tyłu
      add(box(.06, .04, .34), headM, -2.25, .56, s * .62, { parent: g, ry: s * .35, cast: false });
      add(box(.06, .04, .22), headM, -2.2, .5, s * .76, { parent: g, ry: -s * .5, cast: false });
      add(box(.05, .05, .5), tailM, 2.33, .72, s * .55, { parent: g, cast: false });
      for (const wx of [-1.42, 1.5]) {                                                             // nadkola i koła
        add(new THREE.CircleGeometry(.47, 24, 0, Math.PI), carbon, wx, .3, s * .905, { parent: g, ry: s > 0 ? 0 : Math.PI, cast: false });
        const w = new THREE.Group(); w.position.set(wx, .38, s * .87); g.add(w);
        add(new THREE.CylinderGeometry(.38, .38, .3, 26), rubber, 0, 0, 0, { parent: w, rx: Math.PI / 2 });
        add(new THREE.CylinderGeometry(.28, .28, .31, 20), rimM, 0, 0, 0, { parent: w, rx: Math.PI / 2 });
        for (let k = 0; k < 5; k++) add(box(.05, .48, .02), carbon, 0, 0, s * .16, { parent: w, rz: k * Math.PI / 5 });
        add(new THREE.CylinderGeometry(.05, .05, .32, 10), rimM, 0, 0, 0, { parent: w, rx: Math.PI / 2 });
      }
    }
    for (const s of [-1, 1]) add(new THREE.CylinderGeometry(.05, .05, .1, 12), rimM, 2.34, .36, s * .1, { parent: g, rz: Math.PI / 2 });   // wydechy
    if (louvres) for (let i = 0; i < 4; i++) add(box(.08, .03, 1.0), carbon, 1.5 + i * .17, .87, 0, { parent: g });
    if (wing) { for (const s of [-1, 1]) add(box(.08, .32, .05), carbon, 2.05, 1.0, s * .5, { parent: g });
      add(box(.42, .04, 1.9), carbon, 2.1, 1.17, 0, { parent: g, rz: -.12 }); }
    return g;
  }
  const shadowM = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: canvasTex(128, 64, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.save(); x.scale(1, h / w); x.fillRect(0, 0, w, w); x.restore(); }) });
  const disc = (x, z, r) => { add(new THREE.CylinderGeometry(r, r, .06, 48), std(0x111317, .25, .6), x, .03, z);
    add(new THREE.TorusGeometry(r, .025, 6, 64), new THREE.MeshBasicMaterial({ color: 0x7fe0ff }), x, .065, z, { rx: Math.PI / 2, cast: false }); };
  // klinowate auto (zielone), dwa opływowe (pomarańczowe i granatowe ze skrzydłem) – rozstawione na drugim planie
  disc(-4.3, -6.6, 2.75); disc(4.4, -7.0, 2.75);
  const carA = car({ color: 0x7ccf23, profile: 'wedge', louvres: true, rim: 0x2b2e33 }); carA.position.set(-4.3, .06, -6.6); carA.rotation.y = 2.25; scene.add(carA);
  const carB = car({ color: 0xff6a10, profile: 'smooth' }); carB.position.set(4.4, .06, -7.0); carB.rotation.y = .9; scene.add(carB);
  add(new THREE.CylinderGeometry(3, 3.15, .4, 48), std(0x15171b, .3, .6), -2.1, .2, -12.8);
  add(new THREE.TorusGeometry(3.02, .03, 6, 64), new THREE.MeshBasicMaterial({ color: 0x7fe0ff }), -2.1, .41, -12.8, { rx: Math.PI / 2, cast: false });
  const carC = car({ color: 0x1b3c96, profile: 'smooth', wing: true, rim: 0xd9a63a }); carC.position.set(-2.1, .4, -12.8); carC.rotation.y = 1.95; scene.add(carC);

  // ---------- światło ----------
  scene.add(new THREE.HemisphereLight(0x9fb3d6, 0x23262c, .85));
  const key = new THREE.SpotLight(0xfff1dc, 60, 22, .5, .55, 1.3);                                // reflektor na fasolkę
  key.position.set(1.5, 8, 4); key.target.position.set(0, .6, 0); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0004; key.shadow.normalBias = .02; scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xbcd2ff, .6); fill.position.set(-6, 7, 6); scene.add(fill);
  // lampy przemysłowe z widocznym snopem światła
  const beamTex = canvasTex(64, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,236,200,.5)'); g.addColorStop(1, 'rgba(255,236,200,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const beamGeo = new THREE.CylinderGeometry(.22, 2.1, 5.6, 28, 1, true); beamGeo.translate(0, -2.8, 0);
  const beamM = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: .16 });
  const lamps = [];
  for (const [x, z] of [[-4.3, -6.6], [4.4, -7.0], [-2.1, -12.8]]) {
    add(new THREE.CylinderGeometry(.015, .015, 2.6, 6), steel, x, 7.2, z, { cast: false });
    add(new THREE.ConeGeometry(.55, .4, 20, 1, true), std(0x30343b, .5, .7, { side: THREE.DoubleSide }), x, 5.85, z, { cast: false });
    add(new THREE.SphereGeometry(.14, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff2d6 }), x, 5.7, z, { cast: false });
    add(beamGeo, beamM, x, 5.7, z, { cast: false });
    const l = new THREE.PointLight(0xffe2b8, 32, 12, 1.4); l.position.set(x, 5.4, z); scene.add(l); lamps.push(l);
  }

  // kurz w snopach światła
  const DUST = 160, dustGeo = new THREE.BufferGeometry(), dp = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) { dp[i * 3] = R(-7, 7); dp[i * 3 + 1] = R(.3, 6); dp[i * 3 + 2] = R(-13, 1); }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dustTex = canvasTex(32, 32, (x, w, h) => { const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: .05, map: dustTex, transparent: true, depthWrite: false, color: 0xffe9c4, opacity: .55 })));

  // jasna plama światła pod fasolką
  const pool = canvasTex(64, 64, (x, w, h) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,240,215,.35)'); g.addColorStop(1, 'rgba(255,240,215,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  add(new THREE.PlaneGeometry(4.5, 4.5), new THREE.MeshBasicMaterial({ map: pool, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 0, .006, 0, { rx: -Math.PI / 2, cast: false });

  // ---------- animacja ----------
  let flick = 0;
  return {
    update(t, dt) {
      carC.rotation.y = 1.4 + t * .15;                       // auto na obrotowej platformie
      flick -= dt; let k = 1;                                                // neon czasem mrugnie
      if (flick < 0) { if (Math.random() < .004) flick = .25; } else k = Math.random() < .5 ? .35 : 1;
      neon.material.opacity = k; neonLight.intensity = 9 * k;
      const pa = dustGeo.attributes.position;
      for (let i = 0; i < DUST; i++) { let y = pa.getY(i) + dt * (.05 + (i % 4) * .02); if (y > 6) y = .3; pa.setY(i, y); pa.setX(i, pa.getX(i) + Math.sin(t * .5 + i) * dt * .05); }
      pa.needsUpdate = true;
    },
  };
}
