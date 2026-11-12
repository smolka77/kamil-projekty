import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { toonMat, makeOutlineMaterial, addOutline } from '../style/toon.js';

export const RARITY = {
  common: { label: 'Zwykły', color: 0x9aa3ad },
  uncommon: { label: 'Niepospolity', color: 0x4fcf3a },
  rare: { label: 'Rzadki', color: 0x3d8bff },
  epic: { label: 'Epicki', color: 0xb25cff },
  legendary: { label: 'Legendarny', color: 0xffa630 },
};

let flashTexture = null;
function getFlashTexture() {
  if (flashTexture) return flashTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.translate(64, 64);
  // promienie
  g.fillStyle = 'rgba(255,200,90,0.9)';
  for (let i = 0; i < 7; i++) {
    g.save();
    g.rotate((i / 7) * Math.PI * 2 + Math.random() * 0.3);
    g.beginPath();
    g.moveTo(-7, 0);
    g.lineTo(0, -60 + Math.random() * 14);
    g.lineTo(7, 0);
    g.closePath();
    g.fill();
    g.restore();
  }
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, 52);
  grad.addColorStop(0, 'rgba(255,255,240,1)');
  grad.addColorStop(0.25, 'rgba(255,230,140,0.95)');
  grad.addColorStop(0.6, 'rgba(255,150,40,0.5)');
  grad.addColorStop(1, 'rgba(255,90,0,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(0, 0, 52, 0, Math.PI * 2);
  g.fill();
  flashTexture = new THREE.CanvasTexture(c);
  flashTexture.colorSpace = THREE.SRGBColorSpace;
  return flashTexture;
}

/**
 * Karabin szturmowy — jedyna broń na tym etapie.
 * Lufa skierowana w -Z, początek układu = chwyt pistoletowy (prawa dłoń).
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
    this.outline = makeOutlineMaterial(0.0034);
    this.build();
  }

  get reloadProgress() {
    return this.reloading ? Math.min(1, this.reloadT / this.stats.reloadTime) : -1;
  }

  mat(color, opts = {}) {
    const m = toonMat(color, opts);
    this.materials.push(m);
    return m;
  }

  part(parent, geo, mat, pos, rot = [0, 0, 0], outline = true) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    if (outline) addOutline(m, this.outline);
    return m;
  }

  build() {
    const RB = (w, h, d, r = 0.015) => new RoundedBoxGeometry(w, h, d, 2, r);
    const CYL = (r, h, seg = 14) => new THREE.CylinderGeometry(r, r, h, seg);
    const g = this.group;
    const gun = this.mat(0x4a5163);
    const dark = this.mat(0x262a33);
    const rar = RARITY[this.rarity].color;
    const accent = this.mat(rar);
    const lens = this.mat(0x9ff6ff, { emissive: 0x39d4ff, emissiveIntensity: 0.6 });
    const dot = new THREE.MeshBasicMaterial({ color: 0xff2a3d });

    // korpus
    this.part(g, RB(0.07, 0.11, 0.4, 0.022), gun, [0, 0.045, -0.1]);
    this.part(g, RB(0.074, 0.035, 0.16, 0.012), accent, [0, 0.07, 0.02]);
    // szyna + ząbki
    this.part(g, RB(0.045, 0.024, 0.34, 0.008), dark, [0, 0.112, -0.13]);
    for (let i = 0; i < 9; i++) this.part(g, new THREE.BoxGeometry(0.05, 0.012, 0.016), dark, [0, 0.126, -0.27 + i * 0.034], [0, 0, 0], false);
    // łoże
    this.part(g, RB(0.082, 0.088, 0.28, 0.026), accent, [0, 0.04, -0.41]);
    for (let i = 0; i < 3; i++) {
      for (const sx of [-1, 1]) this.part(g, RB(0.006, 0.03, 0.05, 0.003), dark, [0.042 * sx, 0.045, -0.48 + i * 0.07], [0, 0, 0], false);
    }
    // lufa
    this.part(g, CYL(0.017, 0.24), dark, [0, 0.052, -0.64], [Math.PI / 2, 0, 0]);
    this.part(g, CYL(0.027, 0.075), gun, [0, 0.052, -0.765], [Math.PI / 2, 0, 0]);
    this.part(g, new THREE.BoxGeometry(0.012, 0.045, 0.02), dark, [0, 0.11, -0.53]); // muszka
    // kolimator
    this.part(g, RB(0.058, 0.058, 0.1, 0.016), dark, [0, 0.155, -0.08]);
    this.part(g, RB(0.064, 0.016, 0.11, 0.006), accent, [0, 0.19, -0.08]);
    const l = this.part(g, new THREE.CircleGeometry(0.02, 18), lens, [0, 0.158, -0.029], [0, 0, 0], false);
    l.castShadow = false;
    const d = this.part(g, new THREE.CircleGeometry(0.0035, 8), dot, [0, 0.158, -0.028], [0, 0, 0], false);
    d.castShadow = false;
    // chwyt pistoletowy + spust
    this.part(g, RB(0.046, 0.135, 0.062, 0.016), dark, [0, -0.055, 0.025], [0.32, 0, 0]);
    this.part(g, new THREE.TorusGeometry(0.03, 0.006, 6, 14, Math.PI), dark, [0, -0.008, -0.05], [Math.PI, Math.PI / 2, 0]);
    // kolba
    this.part(g, RB(0.052, 0.085, 0.22, 0.022), gun, [0, 0.022, 0.215]);
    this.part(g, RB(0.054, 0.03, 0.18, 0.01), accent, [0, 0.07, 0.2]);
    this.part(g, RB(0.058, 0.125, 0.032, 0.012), dark, [0, 0.0, 0.335]);

    // magazynek (osobna grupa — animowany przy przeładowaniu)
    this.magRest = new THREE.Vector3(0, -0.01, -0.17);
    this.magGroup = new THREE.Group();
    this.magGroup.position.copy(this.magRest);
    g.add(this.magGroup);
    this.part(this.magGroup, RB(0.046, 0.19, 0.085, 0.016), gun, [0, -0.09, -0.01], [-0.2, 0, 0]);
    this.part(this.magGroup, RB(0.05, 0.03, 0.09, 0.01), accent, [0, -0.175, -0.03], [-0.2, 0, 0]);

    // punkty zaczepienia
    const pt = (x, y, z) => {
      const o = new THREE.Object3D();
      o.position.set(x, y, z);
      g.add(o);
      return o;
    };
    this.muzzle = pt(0, 0.052, -0.81);
    this.gripR = pt(0, -0.045, 0.03);
    this.gripL = pt(0, -0.03, -0.42);
    this.magGrab = new THREE.Vector3(0, -0.2, -0.2);

    // błysk z lufy
    const fm = new THREE.MeshBasicMaterial({
      map: getFlashTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.flash = new THREE.Group();
    this.flash.position.copy(this.muzzle.position);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), fm);
    const s1 = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.55), fm);
    s1.rotation.x = -Math.PI / 2;
    s1.position.z = -0.2;
    const s2 = s1.clone();
    s2.rotation.set(-Math.PI / 2, 0, 0);
    s2.rotateY(Math.PI / 2);
    this.flash.add(front, s1, s2);
    this.flash.visible = false;
    g.add(this.flash);

    this.flashLight = new THREE.PointLight(0xffb04a, 0, 7, 2);
    this.flashLight.position.copy(this.muzzle.position);
    g.add(this.flashLight);
  }

  showFlash() {
    this.flashTimer = 0.05;
    this.flash.visible = true;
    this.flash.rotation.z = Math.random() * Math.PI;
    this.flash.scale.setScalar(0.8 + Math.random() * 0.45);
    this.flashLight.intensity = 7;
  }

  update(dt) {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flash.visible = false;
        this.flashLight.intensity = 0;
      }
    }
  }
}
