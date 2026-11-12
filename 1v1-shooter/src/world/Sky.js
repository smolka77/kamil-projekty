import * as THREE from 'three';
import { setRim } from '../style/materials.js';

/**
 * Niebo + oświetlenie słonecznego dnia:
 *  - kopuła nieba w nieskończoności (gradient, mgiełka przy horyzoncie, tarcza słońca, puszyste chmury),
 *  - środowisko PMREM wygenerowane z TEGO SAMEGO nieba (scene.environment) — odbicia i rozproszone światło nieba
 *    dla materiałów PBR; pod horyzontem zielonkawe odbicie od trawy,
 *  - słońce kierunkowe z miękkimi cieniami (PCFSoft), frustum ciasno wokół gracza (z wyprzedzeniem w kierunku
 *    patrzenia) i przyciągany do siatki tekseli (bez migotania),
 *  - słabe wypełnienie hemisferyczne.
 */

const SKY_VS = /* glsl */ `
varying vec3 vDir;
void main() {
	vDir = ( modelMatrix * vec4( position, 0.0 ) ).xyz;
	vec4 p = projectionMatrix * vec4( ( viewMatrix * vec4( vDir, 0.0 ) ).xyz, 1.0 );
	gl_Position = p.xyww; // głębokość = 1 → zawsze za sceną
}`;

const SKY_FS = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uHaze;
uniform vec3 uGround;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform float uSunDisk;
uniform float uSunGlow;
uniform float uSunSize;
uniform float uClouds;
uniform float uTime;
varying vec3 vDir;

float hash12( vec2 p ) {
	vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
	p3 += dot( p3, p3.yzx + 33.33 );
	return fract( ( p3.x + p3.y ) * p3.z );
}
float vnoise( vec2 p ) {
	vec2 i = floor( p );
	vec2 f = fract( p );
	vec2 u = f * f * ( 3.0 - 2.0 * f );
	float a = hash12( i );
	float b = hash12( i + vec2( 1.0, 0.0 ) );
	float c = hash12( i + vec2( 0.0, 1.0 ) );
	float d = hash12( i + vec2( 1.0, 1.0 ) );
	return mix( mix( a, b, u.x ), mix( c, d, u.x ), u.y );
}
float cfbm( vec2 p ) {
	float s = 0.0;
	float a = 0.5;
	for ( int i = 0; i < 5; i ++ ) {
		s += a * vnoise( p );
		p = p * 2.03 + vec2( 17.1, 9.2 );
		a *= 0.5;
	}
	return s;
}

void main() {
	vec3 d = normalize( vDir );
	float h = d.y;
	float hp = max( h, 0.0 );
	float cs = dot( d, uSunDir );

	vec3 sky = mix( uHorizon, uZenith, pow( hp, 0.48 ) );
	sky = mix( sky, uHaze, exp( - hp * 9.0 ) * 0.85 );
	sky += uSunColor * pow( max( cs, 0.0 ), 5.0 ) * 0.16 * ( 1.0 - hp * 0.4 );

	vec3 below = mix( uHaze, uGround, smoothstep( 0.0, 0.22, - h ) );
	vec3 col = mix( below, sky, smoothstep( - 0.012, 0.01, h ) );

	float cov = 0.0;
	if ( uClouds > 0.0 && h > 0.0 ) {
		vec2 cp = d.xz / ( h + 0.14 ) * 1.35 + vec2( uTime * 0.0045, uTime * 0.0018 );
		float n = cfbm( cp );
		vec2 sunOff = normalize( uSunDir.xz + 1e-4 ) * 0.16;
		float n2 = cfbm( cp + sunOff );
		cov = smoothstep( 0.54, 0.76, n ) * uClouds * smoothstep( 0.02, 0.2, h );
		cov *= 1.0 - smoothstep( 0.93, 0.995, cs ) * 0.9; // nie zasłaniaj słońca — ma być słonecznie
		float lit = clamp( 0.62 + ( n - n2 ) * 4.5, 0.0, 1.0 );
		vec3 cloud = mix( uCloudShade, uCloudLit, lit );
		cloud += uSunColor * pow( max( cs, 0.0 ), 10.0 ) * 0.5;
		col = mix( col, cloud, cov );
	}

	float disk = smoothstep( cos( uSunSize ), cos( uSunSize * 0.82 ), cs );
	float glow = pow( max( cs, 0.0 ), 350.0 ) * 0.7 + pow( max( cs, 0.0 ), 40.0 ) * 0.12;
	col += uSunColor * ( disk * uSunDisk + glow * uSunGlow ) * ( 1.0 - cov );

	gl_FragColor = vec4( col, 1.0 );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`;

const lin = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);

export const SKY_DEFAULTS = {
  sunDir: [0.6, 0.72, -0.2], // kierunek DO słońca (świat)
  zenith: lin(0x1f6fea, 0.95),
  horizon: lin(0x8cc4ff, 1.1),
  haze: lin(0xcfe6ff, 1.12),
  ground: lin(0x6f8f3f, 0.5),
  sunColor: lin(0xfff1dc, 1.0),
  cloudLit: lin(0xffffff, 1.55),
  cloudShade: lin(0xb4c6e0, 0.95),
  sunIntensity: 3.3,
  hemiIntensity: 0.3,
  envIntensity: 1.0,
  shadowMapSize: 4096,
  shadowExtent: 14,
};

function makeSkyMaterial(o, env) {
  return new THREE.ShaderMaterial({
    name: env ? 'SkyEnv' : 'Sky',
    uniforms: {
      uZenith: { value: o.zenith.clone() },
      uHorizon: { value: o.horizon.clone() },
      uHaze: { value: o.haze.clone() },
      uGround: { value: o.ground.clone() },
      uSunDir: { value: o.sunDirV.clone() },
      uSunColor: { value: o.sunColor.clone() },
      uCloudLit: { value: o.cloudLit.clone() },
      uCloudShade: { value: o.cloudShade.clone() },
      uSunDisk: { value: env ? 0.0 : 40.0 },
      uSunGlow: { value: env ? 0.6 : 1.0 },
      uSunSize: { value: 0.03 },
      uClouds: { value: 1.0 },
      uTime: { value: 0 },
    },
    vertexShader: SKY_VS,
    fragmentShader: SKY_FS,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
}

export function createSkyLighting(scene, renderer, options = {}) {
  const o = { ...SKY_DEFAULTS, ...options };
  o.sunDirV = new THREE.Vector3().fromArray(o.sunDir).normalize();

  // --- niebo ---
  const skyGeo = new THREE.SphereGeometry(1, 48, 24);
  const sky = new THREE.Mesh(skyGeo, makeSkyMaterial(o, false));
  sky.frustumCulled = false;
  sky.renderOrder = 1000; // po nieprzezroczystych → wypełnia tylko puste piksele (early-z)
  sky.userData.noAO = true;
  sky.raycast = () => {};
  sky.name = 'sky';
  scene.add(sky);
  scene.background = null;

  // --- środowisko PMREM z tego samego nieba (bez ostrej tarczy słońca — robi ją światło kierunkowe) ---
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(skyGeo, makeSkyMaterial(o, true));
  envSky.material.depthTest = false;
  envSky.frustumCulled = false;
  envScene.add(envSky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(envScene, 0, 0.1, 10);
  pmrem.dispose();
  envSky.material.dispose();
  scene.environment = envRT.texture;
  scene.environmentIntensity = o.envIntensity;

  // mgła w kolorze mgiełki horyzontu (liniowo) — krawędź mapy rozpływa się w niebie
  scene.fog = new THREE.Fog(o.haze.clone(), 110, 300);

  // --- światła ---
  const hemi = new THREE.HemisphereLight(0xc4e0ff, 0x5f7040, o.hemiIntensity);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(o.sunColor.clone(), o.sunIntensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(o.shadowMapSize, o.shadowMapSize);
  const S = o.shadowExtent;
  const DIST = 50;
  Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: DIST - 32, far: DIST + 32 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0001;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  // baza przestrzeni światła (do przyciągania do tekseli)
  const lz = o.sunDirV.clone();
  const lx = new THREE.Vector3(0, 1, 0).cross(lz).normalize();
  const ly = lz.clone().cross(lx).normalize();
  const center = new THREE.Vector3();
  const fwd = new THREE.Vector3();

  setRim({ color: new THREE.Color(1.0, 0.96, 0.9) });

  let time = 0;
  return {
    sky,
    sun,
    hemi,
    envTexture: envRT.texture,
    sunDir: o.sunDirV.clone(),
    /** focus — pozycja gracza; camera — opcjonalnie, przesuwa obszar cieni w kierunku patrzenia. */
    update(focus, camera, dt = 0) {
      time += dt;
      sky.material.uniforms.uTime.value = time;
      center.copy(focus);
      if (camera) {
        camera.getWorldDirection(fwd);
        fwd.y = 0;
        if (fwd.lengthSq() > 1e-6) center.addScaledVector(fwd.normalize(), S * 0.38);
      }
      const texel = (2 * S) / sun.shadow.mapSize.x;
      const x = Math.round(center.dot(lx) / texel) * texel;
      const y = Math.round(center.dot(ly) / texel) * texel;
      const z = center.dot(lz);
      center.set(0, 0, 0).addScaledVector(lx, x).addScaledVector(ly, y).addScaledVector(lz, z);
      sun.target.position.copy(center);
      sun.position.copy(center).addScaledVector(lz, DIST);
      sun.target.updateMatrixWorld();
    },
    setShadowMapSize(n) {
      if (sun.shadow.mapSize.x === n) return;
      sun.shadow.mapSize.set(n, n);
      if (sun.shadow.map) {
        sun.shadow.map.dispose();
        sun.shadow.map = null;
      }
    },
    dispose() {
      scene.remove(sky, hemi, sun, sun.target);
      sky.material.dispose();
      skyGeo.dispose();
      envRT.dispose();
      if (scene.environment === envRT.texture) scene.environment = null;
    },
  };
}
