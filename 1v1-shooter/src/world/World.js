import * as THREE from 'three';
import { toonMat } from '../style/toon.js';

function makeGroundTexture(renderer) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#74bf55';
  g.fillRect(0, 0, size, size);
  // delikatny szum trawy
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const l = 40 + Math.random() * 18;
    g.fillStyle = `hsla(${95 + Math.random() * 18}, 48%, ${l}%, 0.5)`;
    g.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 3);
  }
  // siatka (1 kafel = 4 m)
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.lineWidth = 3;
  g.strokeRect(0, 0, size, size);
  g.strokeStyle = 'rgba(255,255,255,0.08)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(size / 2, 0);
  g.lineTo(size / 2, size);
  g.moveTo(0, size / 2);
  g.lineTo(size, size / 2);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

/** Pusta mapa: niebo, słońce z cieniami, płaska trawiasta arena z siatką i dwoma punktami startowymi. */
export function createWorld(scene, renderer) {
  scene.background = new THREE.Color(0x9fd4ff);
  scene.fog = new THREE.Fog(0xbfe2ff, 90, 340);

  // kopuła nieba
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(0x2f86ea) },
        horizon: { value: new THREE.Color(0xcfeaff) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vPos;
        void main() {
          vPos = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 top;
        uniform vec3 horizon;
        varying vec3 vPos;
        void main() {
          float h = clamp(vPos.y, 0.0, 1.0);
          vec3 col = mix(horizon, top, pow(h, 0.55));
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.renderOrder = -1;
  scene.add(sky);

  // światła
  const hemi = new THREE.HemisphereLight(0xdcefff, 0x9c8c6a, 1.35);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff0d6, 2.7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const S = 22;
  Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 140 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const sunOffset = new THREE.Vector3(32, 46, -6);


  // ziemia
  const tex = makeGroundTexture(renderer);
  tex.repeat.set(150, 150);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    toonMat(0xffffff, { map: tex }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // punkty startowe (niebieski — gracz, czerwony — przeciwnik)
  const pad = (z, color) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.25, 1.5, 48),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.5 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.012, z);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.25, 48),
      new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.18, roughness: 0.8 }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(0, 0.01, z);
    disc.receiveShadow = true;
    scene.add(ring, disc);
  };
  pad(8, 0x3d8bff);
  pad(-8, 0xff4d6a);

  return {
    ground,
    sun,
    update(focus) {
      sun.position.copy(focus).add(sunOffset);
      sun.target.position.copy(focus);
    },
  };
}
