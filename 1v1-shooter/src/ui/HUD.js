import * as THREE from 'three';

const _v = new THREE.Vector3();

export class HUD {
  constructor() {
    this.root = document.getElementById('hud');
    this.cross = document.getElementById('crosshair');
    this.chT = this.cross.querySelector('.t');
    this.chB = this.cross.querySelector('.b');
    this.chL = this.cross.querySelector('.l');
    this.chR = this.cross.querySelector('.r');
    this.hit = document.getElementById('hitmarker');
    this.ring = document.getElementById('reload-ring');
    this.ringProg = this.ring.querySelector('.prog');
    this.dmgLayer = document.getElementById('damage-layer');
    this.elim = document.getElementById('elim-banner');
    this.elimWho = this.elim.querySelector('.who');
    this.ammoBox = document.querySelector('#weapon-panel .ammo');
    this.ammoMag = document.getElementById('ammo-mag');
    this.modeText = document.getElementById('mode-text');
    this.hint = document.getElementById('controls-hint');
    this.shieldFill = document.querySelector('.bar-row.shield .fill');
    this.shieldVal = document.querySelector('.bar-row.shield .val');
    this.healthFill = document.querySelector('.bar-row.health .fill');
    this.healthVal = document.querySelector('.bar-row.health .val');

    this.hitT = 0;
    this.elimT = 0;
    this.damage = [];
    this.lastMag = -1;
  }

  show(v) {
    this.root.classList.toggle('hidden', !v);
  }

  toggleHint() {
    this.hint.classList.toggle('hidden');
  }

  setVitals(shield, health) {
    this.shieldFill.style.width = `${shield}%`;
    this.shieldVal.textContent = Math.round(shield);
    this.healthFill.style.width = `${health}%`;
    this.healthVal.textContent = Math.round(health);
  }

  hitmarker(head) {
    this.hitT = 1;
    this.hit.classList.toggle('head', head);
  }

  showElim(name) {
    this.elimWho.textContent = name.toUpperCase();
    this.elim.classList.add('show');
    this.elimT = 2.4;
  }

  spawnDamage(worldPos, amount, kind, delay = 0) {
    const el = document.createElement('div');
    el.className = `dmg ${kind}`;
    el.textContent = amount;
    el.style.opacity = '0';
    this.dmgLayer.appendChild(el);
    this.damage.push({
      el,
      pos: worldPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.15, 0)),
      t: -delay,
      life: 1.0,
      dx: (Math.random() - 0.5) * 40,
    });
  }

  update(dt, camera, s) {
    // celownik — rozstęp zależny od rozrzutu
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const gap = Math.max(5, (Math.tan(s.spread) / Math.tan(halfFov)) * (innerHeight / 2));
    this.chT.style.top = `${-gap - 9}px`;
    this.chB.style.top = `${gap}px`;
    this.chL.style.left = `${-gap - 9}px`;
    this.chR.style.left = `${gap}px`;
    this.cross.style.opacity = s.sprinting || s.emoting ? '0.25' : '1';

    // hitmarker
    this.hitT = Math.max(0, this.hitT - dt * 6);
    this.hit.style.opacity = this.hitT.toFixed(2);
    this.hit.style.transform = `scale(${1 + this.hitT * 0.25})`;

    // przeładowanie
    if (s.reload >= 0) {
      this.ring.style.opacity = '1';
      this.ringProg.style.strokeDashoffset = `${150.8 * (1 - s.reload)}`;
    } else this.ring.style.opacity = '0';

    // amunicja
    if (s.mag !== this.lastMag) {
      this.lastMag = s.mag;
      this.ammoMag.textContent = s.mag;
      this.ammoBox.classList.toggle('low', s.mag <= 6);
    }
    this.modeText.textContent = s.mode.toUpperCase();

    // baner eliminacji
    if (this.elimT > 0) {
      this.elimT -= dt;
      if (this.elimT <= 0) this.elim.classList.remove('show');
    }

    // liczby obrażeń
    for (let i = this.damage.length - 1; i >= 0; i--) {
      const d = this.damage[i];
      d.t += dt;
      if (d.t < 0) continue;
      if (d.t > d.life) {
        d.el.remove();
        this.damage.splice(i, 1);
        continue;
      }
      _v.copy(d.pos);
      _v.y += d.t * 0.9;
      _v.project(camera);
      if (_v.z > 1) {
        d.el.style.opacity = '0';
        continue;
      }
      const x = (_v.x * 0.5 + 0.5) * innerWidth + d.dx * d.t;
      const y = (-_v.y * 0.5 + 0.5) * innerHeight;
      const pop = d.t < 0.08 ? 0.5 + (d.t / 0.08) * 0.9 : Math.max(1, 1.4 - (d.t - 0.08) * 2.5);
      const alpha = d.t > d.life - 0.3 ? (d.life - d.t) / 0.3 : 1;
      d.el.style.opacity = alpha.toFixed(2);
      d.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${pop.toFixed(3)})`;
    }
  }
}
