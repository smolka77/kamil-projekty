import * as THREE from 'three';
import { createSkyLighting } from './Sky.js';
import { turf, plastic, emissive } from '../style/materials.js';

/**
 * Pusta mapa: słoneczne niebo z oświetleniem IBL, słońce z miękkimi cieniami podążającymi za graczem,
 * murawa PBR (bez widocznego kafelkowania) i dwa punkty startowe.
 */
export function createWorld(scene, renderer, options = {}) {
  const lighting = createSkyLighting(scene, renderer, options.sky);

  // ziemia — mapowanie po XZ świata, więc UV i powtórzenia nie są potrzebne
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), turf());
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  scene.add(ground);

  // punkty startowe (niebieski — gracz, czerwony — przeciwnik): płyta z tworzywa + świecący pierścień
  const padGeo = new THREE.CylinderGeometry(1.5, 1.56, 0.03, 64, 1);
  padGeo.translate(0, 0.004, 0);
  const ringGeo = new THREE.TorusGeometry(1.36, 0.035, 10, 96);
  ringGeo.rotateX(-Math.PI / 2);
  const innerGeo = new THREE.CircleGeometry(1.18, 64);
  innerGeo.rotateX(-Math.PI / 2);
  const pad = (z, color) => {
    const g = new THREE.Group();
    g.position.set(0, 0, z);
    const base = new THREE.Mesh(padGeo, plastic(0x39414f, { roughness: 0.45, rim: 0 }));
    base.receiveShadow = true;
    const inner = new THREE.Mesh(innerGeo, plastic(new THREE.Color(color).multiplyScalar(0.5), { roughness: 0.36, rim: 0, polygonOffset: true, polygonOffsetFactor: -2 }));
    inner.position.y = 0.0195;
    inner.receiveShadow = true;
    const ring = new THREE.Mesh(ringGeo, emissive(color, 7));
    ring.position.y = 0.019;
    g.add(base, inner, ring);
    scene.add(g);
    return g;
  };
  const pads = [pad(8, 0x3d8bff), pad(-8, 0xff4d6a)];

  return {
    ground,
    pads,
    sun: lighting.sun,
    sky: lighting.sky,
    lighting,
    /** focus — pozycja gracza, camera — kamera (cienie z wyprzedzeniem w kierunku patrzenia), dt — krok czasu. */
    update(focus, camera, dt) {
      lighting.update(focus, camera, dt);
    },
    setShadowMapSize(n) {
      lighting.setShadowMapSize(n);
    },
  };
}
