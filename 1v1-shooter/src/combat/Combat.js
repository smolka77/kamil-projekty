import * as THREE from 'three';

const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _muzzle = new THREE.Vector3();

const tracerGeo = new THREE.BoxGeometry(1, 1, 1);
tracerGeo.translate(0, 0, -0.5);
const particleGeo = new THREE.BoxGeometry(1, 1, 1);
const decalGeo = new THREE.CircleGeometry(0.07, 10);
decalGeo.rotateX(-Math.PI / 2);
const decalMat = new THREE.MeshBasicMaterial({
  color: 0x1e2416,
  transparent: true,
  opacity: 0.75,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
});

/**
 * Strzelanie hitscan z kamery (jak w strzelankach TPP), rozrzut ("bloom"),
 * smugi pocisków, iskry, ślady po kulach, trafienia w głowę ×1.5.
 */
export class Combat {
  constructor({ scene, camera, player, targets, ground, hud, sfx, input }) {
    this.scene = scene;
    this.camera = camera;
    this.player = player;
    this.targets = targets;
    this.ground = ground;
    this.hud = hud;
    this.sfx = sfx;
    this.input = input;
    this.raycaster = new THREE.Raycaster();
    this.tracers = [];
    this.particles = [];
    this.decals = [];
    this.spread = 0.03;
  }

  /** Aktualny rozrzut (radiany, półkąt stożka). */
  computeSpread() {
    const p = this.player;
    const w = p.weapon;
    const ads = p.anim.ads;
    const moveF = Math.min(1.5, p.speed / 5.5);
    let s = THREE.MathUtils.lerp(0.032, 0.007, ads);
    s += moveF * THREE.MathUtils.lerp(0.03, 0.012, ads);
    if (!p.grounded) s += 0.05;
    s += w.bloom;
    if (p.crouching && p.grounded) s *= 0.72;
    return s;
  }

  update(dt, active) {
    const p = this.player;
    const w = p.weapon;
    const inp = this.input;

    w.cooldown = Math.max(0, w.cooldown - dt);
    w.timeSinceShot += dt;
    w.bloom = Math.max(0, w.bloom - dt * (w.timeSinceShot > 0.25 ? 0.25 : 0.06));

    // przeładowanie
    if (w.reloading) {
      const before = w.reloadProgress;
      w.reloadT += dt;
      const now = w.reloadProgress;
      if (before < 0.3 && now >= 0.3) this.sfx.click(500);
      if (before < 0.76 && now >= 0.76) this.sfx.click(700, 0.16);
      if (before < 0.9 && now >= 0.9) this.sfx.click(1100, 0.12);
      if (w.reloadT >= w.stats.reloadTime) {
        w.reloading = false;
        w.reloadT = 0;
        w.mag = w.stats.magSize;
      }
    }
    if (active && !w.reloading && !p.emoting && inp.pressed('KeyR') && w.mag < w.stats.magSize) this.startReload();

    // strzał (ogień ciągły)
    if (active && inp.mouse.left && !p.emoting && !w.reloading && w.cooldown <= 0) {
      if (w.mag > 0) this.fire();
      else {
        this.sfx.empty();
        w.cooldown = 0.25;
        this.startReload();
      }
    }

    this.spread = this.computeSpread();
    this.updateEffects(dt);
  }

  startReload() {
    const w = this.player.weapon;
    if (w.reloading || w.mag >= w.stats.magSize) return;
    w.reloading = true;
    w.reloadT = 0;
    this.player.stopEmote();
  }

  fire() {
    const p = this.player;
    const w = p.weapon;
    w.mag -= 1;
    w.cooldown = 1 / w.stats.fireRate;

    // pierwszy strzał w bezruchu z celowania jest idealnie celny
    const perfect = p.anim.ads > 0.9 && p.speed < 0.5 && p.grounded && w.timeSinceShot > 0.4;
    const spread = perfect ? 0 : this.computeSpread();
    w.timeSinceShot = 0;
    w.bloom = Math.min(0.05, w.bloom + 0.011);

    const cam = this.camera;
    cam.getWorldDirection(_dir);
    _right.setFromMatrixColumn(cam.matrixWorld, 0);
    _up.setFromMatrixColumn(cam.matrixWorld, 1);
    const r = spread * Math.sqrt(Math.random());
    const a = Math.random() * Math.PI * 2;
    _dir.addScaledVector(_right, Math.cos(a) * r).addScaledVector(_up, Math.sin(a) * r).normalize();

    this.raycaster.set(cam.position, _dir);
    this.raycaster.far = w.stats.range;
    const objs = [this.ground];
    for (const t of this.targets) if (t.alive) objs.push(...t.hitMeshes);
    const hits = this.raycaster.intersectObjects(objs, false);
    const hit = hits[0];
    const end = hit ? hit.point.clone() : cam.position.clone().addScaledVector(_dir, w.stats.range);

    w.muzzle.getWorldPosition(_muzzle);
    this.spawnTracer(_muzzle.clone(), end);
    w.showFlash();
    this.sfx.shot();
    p.onShot();

    if (!hit) return;
    if (hit.object === this.ground) {
      this.spawnImpact(end, hit.face?.normal ?? new THREE.Vector3(0, 1, 0), 0x6b5a3a, 7);
      this.spawnDecal(end);
      return;
    }
    const target = this.targets.find((t) => t.hitMeshes.includes(hit.object));
    if (!target) return;
    const head = hit.object.userData.part === 'head';
    const dmg = Math.round(w.stats.damage * (head ? w.stats.headMultiplier : 1));
    const res = target.takeDamage(dmg);
    if (!res) return;
    this.spawnImpact(end, _dir.clone().negate(), head ? 0xffe066 : 0xffffff, 9);
    if (head) this.hud.spawnDamage(end, dmg, 'head');
    else {
      if (res.toShield > 0) this.hud.spawnDamage(end, res.toShield, 'shield');
      if (res.toHealth > 0) this.hud.spawnDamage(end, res.toHealth, 'health', res.toShield > 0 ? 0.35 : 0);
    }
    this.hud.hitmarker(head);
    this.sfx.hit(head);
    if (res.killed) {
      this.hud.showElim(target.model.skin.name);
      this.sfx.elim();
    }
  }

  // ---------- efekty ----------
  spawnTracer(from, to) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffe9a8,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(tracerGeo, mat);
    mesh.position.copy(from);
    mesh.lookAt(to);
    const dist = from.distanceTo(to);
    this.scene.add(mesh);
    this.tracers.push({ mesh, from, dir: to.clone().sub(from).normalize(), dist, traveled: 0 });
  }

  spawnImpact(point, normal, color, count) {
    const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(particleGeo, mat);
      const sz = 0.025 + Math.random() * 0.03;
      m.scale.setScalar(sz);
      m.position.copy(point);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
        .multiplyScalar(2.2)
        .addScaledVector(normal, 2.4);
      this.scene.add(m);
      this.particles.push({ mesh: m, v, life: 0.35 + Math.random() * 0.25, t: 0, mat });
    }
  }

  spawnDecal(point) {
    const m = new THREE.Mesh(decalGeo, decalMat);
    m.position.set(point.x, 0.003, point.z);
    m.scale.setScalar(0.7 + Math.random() * 0.6);
    this.scene.add(m);
    this.decals.push(m);
    if (this.decals.length > 80) this.scene.remove(this.decals.shift());
  }

  updateEffects(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.traveled += dt * 420;
      const head = Math.min(t.traveled, t.dist);
      const tail = Math.max(0, head - 3.2);
      const len = Math.max(0.01, head - tail);
      t.mesh.position.copy(t.from).addScaledVector(t.dir, head);
      t.mesh.scale.set(0.022, 0.022, len);
      if (t.traveled - 3.2 >= t.dist) {
        this.scene.remove(t.mesh);
        t.mesh.material.dispose();
        this.tracers.splice(i, 1);
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.t += dt;
      p.v.y -= 9 * dt;
      p.mesh.position.addScaledVector(p.v, dt);
      p.mesh.rotation.x += dt * 8;
      const k = 1 - p.t / p.life;
      p.mesh.scale.multiplyScalar(0.97);
      if (k <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }
}
