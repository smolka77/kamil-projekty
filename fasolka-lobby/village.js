// Wioska za graczem: drewniane chaty z bali, ciepłe światło w oknach, dym z komina, stos drewna, płot i ścieżka.
// buildVillage(scene, heightAt) -> { zones: [{x, z, r}], update(t, dt) }   (kamera patrzy w stronę -Z)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function buildVillage(scene, heightAt) {
  const rnd = rng(77), R = (a, b) => a + (b - a) * rnd();
  const std = (color, roughness = .85, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const add = (parent, geo, mat, x, y, z, o = {}) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
    m.castShadow = o.cast !== false; m.receiveShadow = true; parent.add(m); return m;
  };

  // ---------- materiały ----------
  const barkM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 });
  const endM = std(0xc9a072, .9);
  const plankTex = canvasTex(128, 256, (x, w, h) => { const r = rng(5);
    for (let i = 0; i < 8; i++) { x.fillStyle = `hsl(27,${38 + r() * 10}%,${30 + r() * 8}%)`; x.fillRect(i * 16, 0, 16, h); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(i * 16, 0, 2, h); }
    for (let i = 0; i < 120; i++) { x.fillStyle = `rgba(40,20,8,${r() * .25})`; x.fillRect(r() * w, r() * h, 1, 10 + r() * 40); } });
  const plankM = std(0xffffff, .9, { map: plankTex });
  const shingleTex = canvasTex(256, 256, (x, w, h) => { const r = rng(9);
    for (let row = 0; row < 16; row++) for (let col = -1; col < 9; col++) {
      x.fillStyle = `hsl(${12 + r() * 10},${25 + r() * 12}%,${24 + r() * 10}%)`;
      x.fillRect(col * 32 + (row % 2) * 16, row * 16, 31, 15); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(col * 32 + (row % 2) * 16, row * 16 + 13, 31, 3); } });
  const stoneTex = canvasTex(256, 128, (x, w, h) => { const r = rng(13); x.fillStyle = '#54585c'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const g = 105 + r() * 60 | 0; x.fillStyle = `rgb(${g},${g - 3},${g - 8})`; x.beginPath(); x.ellipse(r() * w, r() * h, 10 + r() * 14, 7 + r() * 8, r(), 0, 7); x.fill(); } });
  const stoneM = std(0xffffff, .95, { map: stoneTex });
  const frameM = std(0x3b2414, .8), doorM = std(0xffffff, .85, { map: plankTex, color: 0xb88a5c });
  const winM = new THREE.MeshStandardMaterial({ color: 0xffc46b, emissive: 0xffa53a, emissiveIntensity: 2.2, roughness: .4 });
  const glowTex = canvasTex(64, 64, (x, w, h) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,190,100,.9)'); g.addColorStop(.4, 'rgba(255,160,70,.35)'); g.addColorStop(1, 'rgba(255,150,60,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const glowM = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .5 });
  const shutterMs = [std(0x2f5d3a, .7), std(0x7a2f22, .7), std(0x2d4f78, .7)];
  const barkCols = [0x6f4526, 0x7d5130, 0x664020, 0x845a36].map(c => new THREE.Color(c));

  // ---------- okno z ciepłym światłem ----------
  function windowAt(parent, x, y, z, ry, w = .62, h = .72, shutters) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
    add(g, box(w + .16, h + .16, .1), frameM, 0, 0, 0);
    add(g, new THREE.PlaneGeometry(w, h), winM, 0, 0, .052, { cast: false });
    add(g, box(w, .04, .03), frameM, 0, 0, .07, { cast: false }); add(g, box(.04, h, .03), frameM, 0, 0, .07, { cast: false });
    add(g, box(w + .3, .07, .2), frameM, 0, -h / 2 - .1, .06);                                      // parapet
    if (shutters) for (const s of [-1, 1]) add(g, box(w * .5, h + .1, .05), shutters, s * (w * .5 + .16), 0, .04);
    const gl = new THREE.Sprite(glowM); gl.position.set(0, 0, .25); gl.scale.set(w * 2.6, h * 2.4, 1); g.add(gl);
  }

  // ---------- chata z bali (szczyt dachu skierowany do kamery) ----------
  function cabin({ w = 4.6, d = 4.2, wallH = 2.5, roofCol = 0xffffff, shutters, chimney = 0, lantern = false }) {
    const g = new THREE.Group(), r = .14, step = 2 * r * .9, n = Math.round(wallH / step);
    add(g, box(w + .5, .4, d + .5), stoneM, 0, .2, 0);
    // bale: osobno boki (kora) i końce (słoje), scalone dla wydajności
    const sides = [], ends = [];
    const log = (len, x, y, z, alongX) => {
      const c = new THREE.CylinderGeometry(r, r * .95, len, 9, 1, true); c.deleteAttribute('uv');
      const col = barkCols[(rnd() * barkCols.length) | 0].clone().multiplyScalar(R(.85, 1.1)), cc = new Float32Array(c.attributes.position.count * 3);
      for (let i = 0; i < cc.length; i += 3) cc.set([col.r, col.g, col.b], i); c.setAttribute('color', new THREE.BufferAttribute(cc, 3));
      if (alongX) c.rotateZ(Math.PI / 2); else c.rotateX(Math.PI / 2); c.translate(x, y, z); sides.push(c);
      for (const s of [-1, 1]) { const e = new THREE.CircleGeometry(r * .97, 9); e.deleteAttribute('uv');
        if (alongX) e.rotateY(s * Math.PI / 2); else if (s < 0) e.rotateY(Math.PI);
        e.translate(alongX ? x + s * len / 2 : x, y, alongX ? z : z + s * len / 2); ends.push(e); }
    };
    for (let i = 0; i < n; i++) {
      const y = .4 + r + i * step;
      for (const s of [-1, 1]) log(w + .55, 0, y + (i % 2 ? 0 : r * .5), s * d / 2, true);
      for (const s of [-1, 1]) log(d + .55, s * w / 2, y + (i % 2 ? r * .5 : 0), 0, false);
    }
    add(g, mergeGeometries(sides), barkM, 0, 0, 0); add(g, mergeGeometries(ends), endM, 0, 0, 0, { cast: false });
    const top = .4 + n * step + r * .4, pitch = .62, rise = (w / 2 + .45) * Math.tan(pitch);
    // szczyty z desek (trójkąty z przodu i z tyłu)
    const tri = new THREE.Shape(); tri.moveTo(-w / 2 - .12, 0); tri.lineTo(w / 2 + .12, 0); tri.lineTo(0, rise - .12); tri.lineTo(-w / 2 - .12, 0);
    const triG = new THREE.ExtrudeGeometry(tri, { depth: .12, bevelEnabled: false });
    const uv = triG.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * .35, uv.getY(i) * .35);
    for (const s of [-1, 1]) add(g, triG, plankM, 0, top, s * (d / 2 + .02) - (s < 0 ? .12 : 0));
    // dach z gontów, z okapem
    const slope = (w / 2 + .45) / Math.cos(pitch), roofM = std(roofCol, .9, { map: shingleTex.clone() });
    roofM.map.repeat.set(slope / 1.3, (d + 1) / 1.3); roofM.map.needsUpdate = true;
    for (const s of [-1, 1]) {
      add(g, box(slope, .14, d + 1), [frameM, frameM, roofM, frameM, frameM, frameM], s * (w / 2 + .45) / 2, top + rise / 2 + .05, 0, { rz: -s * pitch });
    }
    add(g, box(.24, .2, d + 1.05), frameM, 0, top + rise + .08, 0);                                     // kalenica
    for (const s of [-1, 1]) for (const zz of [-1, 1]) add(g, box(slope + .05, .1, .1), frameM, s * (w / 2 + .45) / 2, top + rise / 2 + .03, zz * (d / 2 + .5), { rz: -s * pitch, cast: false });   // deski wiatrowe
    // drzwi z daszkiem i schodkiem
    const fz = d / 2 + r + .02;
    add(g, box(1.06, 1.95, .1), frameM, -.3, .4 + .98, fz);
    add(g, box(.9, 1.85, .1), doorM, -.3, .4 + .95, fz + .03);
    add(g, new THREE.SphereGeometry(.045, 8, 6), std(0xd4a640, .3, { metalness: .8 }), .03, 1.35, fz + .1, { cast: false });
    add(g, box(1.3, .18, .6), stoneM, -.3, .32, fz + .25);
    add(g, box(1.5, .07, .8), plankM, -.3, 2.55, fz + .3, { rx: -.25 });
    for (const s of [-1, 1]) add(g, box(.07, .5, .07), frameM, -.3 + s * .68, 2.35, fz + .55, { rx: .9 });
    // okna
    windowAt(g, 1.25, 1.55, fz, 0, .7, .78, shutters);
    windowAt(g, 0, top + rise * .38, d / 2 + .1, 0, .46, .52);
    for (const s of [-1, 1]) windowAt(g, s * (w / 2 + r + .02), 1.55, s * .2, s * Math.PI / 2, .66, .74, shutters);
    windowAt(g, -1.2, 1.55, -(d / 2 + r + .02), Math.PI, .62, .7, shutters);
    // komin z kamienia (wychodzi przez dach) – zwraca miejsce, skąd leci dym
    let smokeAt = null;
    if (chimney) {
      const cx = chimney * (w * .25), cz = -d * .18, ch = top + rise + 1.0;
      add(g, box(.55, ch, .55), stoneM, cx, ch / 2, cz);
      add(g, box(.7, .12, .7), stoneM, cx, ch + .06, cz);
      smokeAt = new THREE.Vector3(cx, ch + .15, cz);
    }
    if (lantern) {                                                                                        // latarnia przy drzwiach
      add(g, box(.05, .3, .22), frameM, .45, 2.05, fz + .12);
      add(g, box(.16, .22, .16), winM, .45, 1.85, fz + .26, { cast: false });
      add(g, box(.2, .04, .2), frameM, .45, 1.98, fz + .26);
      const gl = new THREE.Sprite(glowM); gl.position.set(.45, 1.85, fz + .32); gl.scale.setScalar(.9); g.add(gl);
    }
    g.userData.smokeAt = smokeAt;
    return g;
  }

  // ---------- ustawienie wioski ~20 m za graczem ----------
  const HOUSES = [
    { x: -11.5, z: -22.5, ry: .45, o: { w: 4.6, d: 4.2, shutters: shutterMs[0], chimney: 1, lantern: true } },
    { x: -4.6, z: -30, ry: .15, o: { w: 5.2, d: 4.6, wallH: 2.7, roofCol: 0xd9c2b4, shutters: shutterMs[1] } },
    { x: 6.4, z: -28.5, ry: -.25, o: { w: 4.4, d: 4.0, shutters: shutterMs[2], chimney: -1 } },
    { x: 13.6, z: -21.5, ry: -.55, o: { w: 4.0, d: 3.8, roofCol: 0xcfd6dc, shutters: shutterMs[0], lantern: true } },
  ];
  const zones = [], smokers = [];
  const village = new THREE.Group(); scene.add(village);
  for (const h of HOUSES) {
    const c = cabin(h.o); c.position.set(h.x, heightAt(h.x, h.z), h.z); c.rotation.y = h.ry; c.scale.setScalar(.88); village.add(c);
    zones.push({ x: h.x, z: h.z, r: Math.max(h.o.w, h.o.d) * .75 + 1.2 });
    if (c.userData.smokeAt) { c.updateMatrixWorld(true); smokers.push(c.localToWorld(c.userData.smokeAt.clone())); }
  }
  // ciepłe światło z wnętrz (dwa światła punktowe na całą wioskę)
  for (const [x, z] of [[-9.6, -20], [7.4, -25.6]]) { const l = new THREE.PointLight(0xffa64a, 6, 7, 1.6); l.position.set(x, 1.6, z); village.add(l); }

  // ---------- ścieżka z ubitej ziemi ----------
  const dirtTex = canvasTex(256, 256, (x, w, h) => { const r = rng(17);
    const g = x.createRadialGradient(128, 128, 30, 128, 128, 128); g.addColorStop(0, 'rgba(140,108,70,.95)'); g.addColorStop(.7, 'rgba(130,100,64,.75)'); g.addColorStop(1, 'rgba(120,95,60,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(${r() < .5 ? '90,70,45' : '170,140,100'},${r() * .35})`; x.beginPath(); x.arc(r() * w, r() * h, 1 + r() * 4, 0, 7); x.fill(); } });
  const dirtM = new THREE.MeshStandardMaterial({ map: dirtTex, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
  const pathPts = [[0, -13], [-.8, -16.5], [-2.5, -20], [-6.5, -20.5], [-3.8, -25.5], [1.2, -24.5], [5, -24.5], [9.5, -21.5], [12, -19.5]];
  for (const [x, z] of pathPts) { const m = new THREE.Mesh(new THREE.PlaneGeometry(R(3.4, 4.4), R(2.6, 3.4)), dirtM); m.rotation.set(-Math.PI / 2, 0, R(0, 3)); m.position.set(x, heightAt(x, z) + .02, z); m.receiveShadow = true; village.add(m); }

  // ---------- stos drewna i płot ----------
  const wood = [], woodEnds = [];
  for (let row = 0; row < 4; row++) for (let i = 0; i < 7 - row; i++) {
    const c = new THREE.CylinderGeometry(.11, .11, 1.1, 8, 1, true); c.deleteAttribute('uv'); c.rotateX(Math.PI / 2);
    const x = (i - (6 - row) / 2) * .22, y = .11 + row * .19; c.translate(x, y, 0); wood.push(c);
    for (const s of [-1, 1]) { const e = new THREE.CircleGeometry(.105, 8); e.deleteAttribute('uv'); if (s < 0) e.rotateY(Math.PI); e.translate(x, y, s * .55); woodEnds.push(e); }
  }
  const woodpile = new THREE.Group(); woodpile.position.set(-8.0, heightAt(-8, -20.2), -20.2); woodpile.rotation.y = 1.25; village.add(woodpile);
  add(woodpile, mergeGeometries(wood), std(0x6b4628, .9), 0, 0, 0); add(woodpile, mergeGeometries(woodEnds), endM, 0, 0, 0, { cast: false });
  add(woodpile, box(1.8, .08, 1.3), plankM, 0, .9, 0, { rz: .08 });
  const fenceM = std(0x7a5534, .9), fence = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 1.4)), a = Math.atan2(z1 - z0, x1 - x0);
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; add(village, box(.1, .9, .1), fenceM, x, heightAt(x, z) + .45, z, { ry: R(-.1, .1), rz: R(-.05, .05) }); }
    for (const y of [.35, .7]) add(village, box(len, .07, .05), fenceM, (x0 + x1) / 2, heightAt((x0 + x1) / 2, (z0 + z1) / 2) + y, (z0 + z1) / 2, { ry: -a });
  };
  fence(16.2, -17, 18, -24); fence(2.2, -32.5, 9.4, -32); fence(-15.6, -18.5, -16.2, -25.5);
  // beczka i ławka przy chatach
  add(village, new THREE.CylinderGeometry(.32, .28, .8, 14), std(0x7a5232, .8), 9.6, heightAt(9.6, -24.5) + .4, -24.5);
  for (const y of [.2, .6]) add(village, new THREE.TorusGeometry(.315, .02, 5, 16), std(0x3a3a3a, .5, { metalness: .7 }), 9.6, heightAt(9.6, -24.5) + y, -24.5, { rx: Math.PI / 2, cast: false });
  const bench = new THREE.Group(); bench.position.set(-1.4, heightAt(-1.4, -27.2), -27.2); bench.rotation.y = .12; village.add(bench);
  add(bench, box(1.6, .07, .4), plankM, 0, .45, 0); for (const s of [-1, 1]) add(bench, box(.08, .45, .35), frameM, s * .65, .22, 0);

  // ---------- dym z kominów ----------
  const smokeTex = canvasTex(64, 64, (x, w, h) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(235,235,235,.85)'); g.addColorStop(.55, 'rgba(225,225,228,.35)'); g.addColorStop(1, 'rgba(220,220,225,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const puffs = [];
  for (const at of smokers) for (let i = 0; i < 16; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.userData = { at, life: i / 16, rot: R(-.6, .6), drift: R(.5, 1.1) }; village.add(s); puffs.push(s);
  }

  return {
    zones,
    update(t, dt) {
      for (const s of puffs) {
        const u = s.userData; u.life += dt * .17; if (u.life > 1) u.life -= 1;
        const L = u.life;
        s.position.set(u.at.x + L * 2.4 * u.drift + Math.sin(t * .8 + L * 6) * .25, u.at.y + L * 4.6, u.at.z - L * .6);
        s.scale.setScalar(.35 + L * 2.6);
        s.material.opacity = Math.min(1, L * 14) * (1 - L) * .72;
        s.material.rotation = u.rot * L * 3;
      }
    },
  };
}
