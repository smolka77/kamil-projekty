// Wioska na drugim planie: małe domki z desek w stylu low poly (jak drzewa), stoją przy skraju lasu, lekko we mgle.
// Ciepłe światło w oknach, dym z komina. buildVillage(scene, heightAt) -> { zones: [{x, z, r}], update(t, dt) }
import * as THREE from 'three';

function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function buildVillage(scene, heightAt) {
  const rnd = rng(77), R = (a, b) => a + (b - a) * rnd();
  const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .95, flatShading: true, ...extra });
  const add = (parent, geo, mat, x, y, z, o = {}) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  // deski: pionowe, ciepły brąz, wyraźne szpary – prosto, jak reszta mapy
  const plankTex = (hue, light) => canvasTex(128, 64, (x, w, h) => { const r = rng(hue * 7 + light);
    for (let i = 0; i < 8; i++) { x.fillStyle = `hsl(${hue + r() * 6},${42 + r() * 10}%,${light + r() * 7}%)`; x.fillRect(i * 16, 0, 16, h); x.fillStyle = 'rgba(40,22,10,.55)'; x.fillRect(i * 16, 0, 2, h); } });
  const WALL_TEX = [plankTex(28, 38), plankTex(24, 33), plankTex(32, 44)];
  const ROOFS = [0x8a3a2a, 0x5a3b2a, 0x3d5a46, 0x7a4630].map(c => flat(c));
  const trimM = flat(0x4a2c18), stoneM = flat(0x8d9196), doorM = flat(0x5e3a20);
  const winM = new THREE.MeshStandardMaterial({ color: 0xffc46b, emissive: 0xffa040, emissiveIntensity: 2.4, flatShading: true });
  const glowTex = canvasTex(64, 64, (x, w, h) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,190,100,.85)'); g.addColorStop(.45, 'rgba(255,160,70,.3)'); g.addColorStop(1, 'rgba(255,150,60,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const glowM = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .45 });

  function windowAt(g, x, y, z, ry, w = .42, h = .46) {
    const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.y = ry; g.add(p);
    add(p, box(w + .12, h + .12, .06), trimM, 0, 0, 0);
    add(p, new THREE.PlaneGeometry(w, h), winM, 0, 0, .032);
    add(p, box(w, .035, .02), trimM, 0, 0, .045); add(p, box(.035, h, .02), trimM, 0, 0, .045);
    const s = new THREE.Sprite(glowM); s.position.set(0, 0, .15); s.scale.set(w * 2.8, h * 2.6, 1); p.add(s);
  }

  // mały domek z desek: prosta bryła, dwuspadowy dach z okapem, komin, drzwi i okna
  function house({ w = 3.2, d = 2.8, h = 2.0, wall = 0, roof = 0, chimney = 0, porch = false }) {
    const g = new THREE.Group(), tex = WALL_TEX[wall].clone(); tex.repeat.set(w / 1.6, h / 1.6); tex.needsUpdate = true;
    const wm = flat(0xffffff, { map: tex });
    add(g, box(w + .2, .25, d + .2), stoneM, 0, .125, 0);
    add(g, box(w, h, d), wm, 0, .25 + h / 2, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, box(.14, h, .14), trimM, sx * w / 2, .25 + h / 2, sz * d / 2);   // narożniki
    // szczyt z desek (pryzmat pod dachem)
    const rise = w * .42, top = .25 + h;
    const tri = new THREE.Shape(); tri.moveTo(-w / 2, 0); tri.lineTo(w / 2, 0); tri.lineTo(0, rise); tri.lineTo(-w / 2, 0);
    const triG = new THREE.ExtrudeGeometry(tri, { depth: d, bevelEnabled: false }); triG.translate(0, 0, -d / 2);
    const uv = triG.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.6, uv.getY(i) / 1.6);
    add(g, triG, wm, 0, top, 0);
    // dach: dwie połacie z okapem
    const pitch = Math.atan2(rise, w / 2), over = .3, half = w / 2 + over, drop = over * Math.tan(pitch);
    const slopeL = Math.hypot(half, rise + drop);
    for (const s of [-1, 1]) add(g, box(slopeL, .14, d + .5), ROOFS[roof], s * half / 2, top + (rise - drop) / 2 + .07, 0, { rz: -s * pitch });
    add(g, box(.16, .14, d + .55), trimM, 0, top + rise + .1, 0);
    if (chimney) { const cx = chimney * w * .22; add(g, box(.36, rise + .9, .36), stoneM, cx, top + (rise + .9) / 2, -d * .15); g.userData.smoke = new THREE.Vector3(cx, top + rise + .95, -d * .15); }
    // przód: drzwi, okna, mały daszek nad drzwiami
    const fz = d / 2 + .01;
    add(g, box(.66, 1.25, .06), trimM, -w * .18, .25 + .63, fz);
    add(g, box(.54, 1.15, .06), doorM, -w * .18, .25 + .6, fz + .02);
    windowAt(g, w * .22, .25 + h * .58, fz);
    windowAt(g, 0, top + rise * .36, fz, 0, .32, .34);
    for (const s of [-1, 1]) windowAt(g, s * (w / 2 + .01), .25 + h * .58, 0, s * Math.PI / 2);
    if (porch) { add(g, box(1.1, .06, .55), ROOFS[roof], -w * .18, .25 + 1.45, fz + .25, { rx: -.3 });
      add(g, box(1.0, .12, .5), stoneM, -w * .18, .06, fz + .3); }
    return g;
  }

  // ---------- rozstawienie: drugi plan, przy skraju lasu ----------
  const HOUSES = [
    { x: -15.5, z: -36, ry: .45, o: { wall: 0, roof: 0, chimney: 1, porch: true } },
    { x: -7.5, z: -42, ry: .2, o: { w: 3.6, d: 3.0, h: 2.2, wall: 1, roof: 1 } },
    { x: 5.5, z: -43.5, ry: -.15, o: { w: 3.0, d: 2.6, wall: 2, roof: 2, chimney: -1 } },
    { x: 14, z: -37, ry: -.5, o: { w: 3.4, d: 2.8, wall: 1, roof: 3, porch: true } },
  ];
  const zones = [], smokers = [], village = new THREE.Group(); scene.add(village);
  for (const hh of HOUSES) {
    const c = house(hh.o); c.position.set(hh.x, heightAt(hh.x, hh.z) - .05, hh.z); c.rotation.y = hh.ry; village.add(c);
    zones.push({ x: hh.x, z: hh.z, r: 3.6 });
    if (c.userData.smoke) { c.updateMatrixWorld(true); smokers.push(c.localToWorld(c.userData.smoke.clone())); }
  }
  // drobiazgi przy domkach: płotki i ścieżka
  const fenceM = flat(0x7a5534);
  const fence = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 1.1)), a = Math.atan2(z1 - z0, x1 - x0);
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; add(village, box(.09, .7, .09), fenceM, x, heightAt(x, z) + .35, z); }
    for (const y of [.28, .55]) add(village, box(len, .06, .04), fenceM, (x0 + x1) / 2, heightAt((x0 + x1) / 2, (z0 + z1) / 2) + y, (z0 + z1) / 2, { ry: -a });
  };
  fence(-19, -33.5, -17.5, -39.5); fence(1.8, -46.5, 8.5, -46.8); fence(17.2, -34, 18.4, -40);
  const dirtTex = canvasTex(128, 128, (x, w, h) => { const g = x.createRadialGradient(64, 64, 10, 64, 64, 64);
    g.addColorStop(0, 'rgba(150,118,78,.9)'); g.addColorStop(.7, 'rgba(140,110,72,.6)'); g.addColorStop(1, 'rgba(130,104,68,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const dirtM = new THREE.MeshStandardMaterial({ map: dirtTex, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const [x, z] of [[-13.5, -33.6], [-9.5, -36], [-5.5, -38.5], [-1, -40], [3.5, -40.5], [8.5, -39], [12.5, -35.5]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(R(3, 4), R(2.2, 2.8)), dirtM); m.rotation.set(-Math.PI / 2, 0, R(0, 3)); m.position.set(x, heightAt(x, z) + .02, z); village.add(m);
  }
  // ciepłe światło z wnętrz
  for (const [x, z] of [[-14, -34], [12.6, -35]]) { const l = new THREE.PointLight(0xffa64a, 4, 5, 1.6); l.position.set(x, 1.2, z); village.add(l); }

  // ---------- dym z komina ----------
  const smokeTex = canvasTex(64, 64, (x, w, h) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(240,240,240,.85)'); g.addColorStop(.55, 'rgba(230,230,232,.35)'); g.addColorStop(1, 'rgba(225,225,230,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const puffs = [];
  for (const at of smokers) for (let i = 0; i < 14; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.userData = { at, life: i / 14, rot: R(-.6, .6), drift: R(.6, 1.1) }; village.add(s); puffs.push(s);
  }

  return {
    zones,
    update(t, dt) {
      for (const s of puffs) {
        const u = s.userData; u.life += dt * .16; if (u.life > 1) u.life -= 1;
        const L = u.life;
        s.position.set(u.at.x + L * 2.2 * u.drift + Math.sin(t * .8 + L * 6) * .2, u.at.y + L * 4.2, u.at.z - L * .5);
        s.scale.setScalar(.35 + L * 2.4);
        s.material.opacity = Math.min(1, L * 14) * (1 - L) * .7;
        s.material.rotation = u.rot * L * 3;
      }
    },
  };
}
