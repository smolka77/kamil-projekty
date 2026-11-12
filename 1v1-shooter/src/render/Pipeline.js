import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/**
 * Potok renderowania:
 *   RenderPass (HDR, half-float, opcjonalnie MSAA) → GTAO (okluzja otoczenia) → UnrealBloom (subtelny)
 *   → korekcja nasycenia → OutputPass (tone mapping ACES + sRGB) → SMAA.
 * Jakość: 'high' | 'medium' | 'low' (low = bez post-processingu), automatyczne skalowanie po czasie klatki
 * (najpierw wyłącza AO/MSAA, potem obniża pixel ratio, na końcu bloom). URL: ?quality=low|medium|high
 * (wymusza poziom i wyłącza auto-skalowanie; ?autoquality=1 włącza je z powrotem).
 * Gdy któraś warstwa post-processingu nie wystartuje — powrót do zwykłego renderowania.
 */

export const QUALITY_PRESETS = {
  high: { post: true, ao: true, aoScale: 1.0, aoSamples: 16, bloom: true, smaa: true, msaa: 4, maxPixelRatio: 2, shadowMapSize: 4096 },
  medium: { post: true, ao: true, aoScale: 0.5, aoSamples: 12, bloom: true, smaa: true, msaa: 0, maxPixelRatio: 1.5, shadowMapSize: 2048 },
  low: { post: false, ao: false, aoScale: 0.5, aoSamples: 8, bloom: false, smaa: false, msaa: 0, maxPixelRatio: 1.25, shadowMapSize: 2048 },
};

// parametry dobrane pod postać ~1.85 m oglądaną z 2–20 m
const AO_PARAMS = { radius: 0.42, distanceExponent: 1.3, thickness: 0.9, distanceFallOff: 1.0, scale: 1.55, screenSpaceRadius: false };
// AO tylko w promieniu ~45 m od kamery (dalej precyzja głębi daje fałszywe przyciemnienia przy horyzoncie)
const AO_RANGE = new THREE.Vector3(45, 30, 45);
const _aoBox = new THREE.Box3();
const PD_PARAMS = { lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, radiusExponent: 1.4, rings: 2, samples: 16 };
const BLOOM = { strength: 0.24, radius: 0.5, threshold: 1.6 };
// delikatna korekcja koloru przed tone mappingiem (ACES lekko "pierze" nasycenie)
const GRADE = { saturation: 1.14 };

const GradeShader = {
  name: 'GradeShader',
  uniforms: { tDiffuse: { value: null }, saturation: { value: GRADE.saturation } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D( tDiffuse, vUv );
      float l = dot( c.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
      gl_FragColor = vec4( max( mix( vec3( l ), c.rgb, saturation ), 0.0 ), c.a );
    }`,
};

// progi auto-skalowania (ms, wygładzony czas klatki)
const SLOW_MS = 21.5;
const FAST_MS = 18.0;

/** GTAO liczone w ułamku rozdzielczości, z pominięciem obiektów przezroczystych / userData.noAO / nieba. */
class GameGTAOPass extends GTAOPass {
  constructor(scene, camera, w, h, resScale) {
    super(scene, camera, Math.max(1, Math.round(w * resScale)), Math.max(1, Math.round(h * resScale)), undefined, AO_PARAMS, PD_PARAMS);
    this.resScale = resScale;
    this._full = [w, h];
  }

  setSize(w, h) {
    this._full = [w, h];
    super.setSize(Math.max(1, Math.round(w * this.resScale)), Math.max(1, Math.round(h * this.resScale)));
  }

  setResScale(s) {
    if (s === this.resScale) return;
    this.resScale = s;
    this.setSize(this._full[0], this._full[1]);
  }

  overrideVisibility() {
    const cache = this._visibilityCache;
    this.scene.traverse((o) => {
      cache.set(o, o.visible);
      if (o.isPoints || o.isLine || o.isSprite || o.userData.noAO) {
        o.visible = false;
        return;
      }
      const m = o.material;
      if (m && (Array.isArray(m) ? m.some((x) => x.transparent || !x.depthWrite) : m.transparent || !m.depthWrite)) o.visible = false;
    });
  }
}

function aoOutputValue(mode) {
  const M = GTAOPass.OUTPUT;
  return { default: M.Default, ao: M.AO, denoise: M.Denoise, normal: M.Normal, depth: M.Depth, off: M.Off }[mode] ?? M.Default;
}

function readUrlQuality() {
  try {
    const q = new URLSearchParams(location.search);
    const v = q.get('quality');
    const a = q.get('autoquality');
    const tm = { aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping, neutral: THREE.NeutralToneMapping }[q.get('tonemap')];
    const ex = parseFloat(q.get('exposure'));
    return {
      quality: v && QUALITY_PRESETS[v] ? v : null,
      auto: a === null ? null : a !== '0' && a !== 'false',
      toneMapping: tm ?? null,
      exposure: Number.isFinite(ex) ? ex : null,
    };
  } catch {
    return { quality: null, auto: null, toneMapping: null, exposure: null };
  }
}

/**
 * @param {HTMLElement} container — element, do którego trafia <canvas>
 * @param {object} [opts] — { quality, autoQuality, toneMapping, exposure, width, height }
 */
export function createPipeline(container, opts = {}) {
  const url = readUrlQuality();
  let quality = url.quality ?? opts.quality ?? 'high';
  let autoEnabled = url.auto ?? (url.quality ? false : opts.autoQuality ?? true);

  const renderer = new THREE.WebGLRenderer({
    antialias: !QUALITY_PRESETS[quality].post, // przy post-processingu AA robi MSAA celu + SMAA
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = url.toneMapping ?? opts.toneMapping ?? THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = url.exposure ?? opts.exposure ?? 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (container) container.appendChild(renderer.domElement);

  let width = opts.width ?? innerWidth;
  let height = opts.height ?? innerHeight;
  const dpr = () => (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);

  // stan bieżący (preset + krok auto-skalowania)
  let preset = QUALITY_PRESETS[quality];
  let step = 0;
  let pixelRatio = 1;
  let composer = null;
  let passes = {};
  let postFailed = false;
  let curScene = null;
  let curCamera = null;
  let aoOutput = 'default';

  const listeners = [];
  const api = {};

  function ladder() {
    const p = preset;
    if (!p.post) return [{ prScale: 1 }, { prScale: 0.85 }, { prScale: 0.72 }, { prScale: 0.6 }];
    return [
      { ao: p.ao, msaa: p.msaa, bloom: p.bloom, prScale: 1 },
      { ao: false, msaa: 0, bloom: p.bloom, prScale: 1 },
      { ao: false, msaa: 0, bloom: p.bloom, prScale: 0.85 },
      { ao: false, msaa: 0, bloom: p.bloom, prScale: 0.72 },
      { ao: false, msaa: 0, bloom: p.bloom, prScale: 0.6 },
      { ao: false, msaa: 0, bloom: false, prScale: 0.6 },
    ];
  }

  function currentSettings() {
    const l = ladder();
    return { ...preset, ...l[Math.min(step, l.length - 1)] };
  }

  function supportsPost() {
    const gl = renderer.getContext();
    const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    return isGL2 && (renderer.extensions.has('EXT_color_buffer_half_float') || renderer.extensions.has('EXT_color_buffer_float'));
  }

  // zabezpieczenie: błąd kompilacji shadera warstwy post → wyłącz post-processing
  function onPostShaderError(gl, program, vs, fs) {
    console.error(
      '[Pipeline] Błąd shadera post-processingu — przełączam na zwykłe renderowanie.\n',
      gl.getProgramInfoLog(program),
      gl.getShaderInfoLog(vs),
      gl.getShaderInfoLog(fs),
    );
    postFailed = true;
  }
  function guardPass(pass) {
    const orig = pass.render.bind(pass);
    pass.render = (...args) => {
      const prev = renderer.debug.onShaderError;
      renderer.debug.onShaderError = onPostShaderError;
      try {
        orig(...args);
      } finally {
        renderer.debug.onShaderError = prev;
      }
    };
    return pass;
  }

  function buildComposer(scene, camera) {
    disposeComposer();
    const s = currentSettings();
    const w = Math.max(1, Math.floor(width * pixelRatio));
    const h = Math.max(1, Math.floor(height * pixelRatio));
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: s.msaa || 0 });
    const c = new EffectComposer(renderer, rt);
    c.setPixelRatio(pixelRatio);
    c.setSize(width, height);
    const render = new RenderPass(scene, camera);
    c.addPass(render);
    const ao = guardPass(new GameGTAOPass(scene, camera, w, h, preset.aoScale));
    ao.updateGtaoMaterial({ samples: preset.aoSamples });
    ao.blendIntensity = 1.0;
    ao.output = aoOutputValue(aoOutput);
    c.addPass(ao);
    const bloom = guardPass(new UnrealBloomPass(new THREE.Vector2(w, h), BLOOM.strength, BLOOM.radius, BLOOM.threshold));
    c.addPass(bloom);
    const grade = guardPass(new ShaderPass(GradeShader));
    c.addPass(grade);
    const output = guardPass(new OutputPass());
    c.addPass(output);
    const smaa = guardPass(new SMAAPass(w, h));
    c.addPass(smaa);
    composer = c;
    passes = { render, ao, bloom, grade, output, smaa };
    curScene = scene;
    curCamera = camera;
    applyPassToggles();
  }

  function disposeComposer() {
    if (!composer) return;
    for (const p of Object.values(passes)) p.dispose?.();
    composer.renderTarget1.dispose();
    composer.renderTarget2.dispose();
    composer = null;
    passes = {};
  }

  function applyPassToggles() {
    if (!composer) return;
    const s = currentSettings();
    passes.ao.enabled = !!s.ao;
    passes.bloom.enabled = !!s.bloom;
    passes.smaa.enabled = !!s.smaa;
    const samples = s.msaa || 0;
    for (const rt of [composer.renderTarget1, composer.renderTarget2]) {
      if (rt.samples !== samples) {
        rt.samples = samples;
        rt.dispose(); // zostanie odtworzony z nową liczbą próbek przy następnym użyciu
      }
    }
  }

  function applyPixelRatio() {
    const s = currentSettings();
    pixelRatio = Math.max(0.5, Math.min(dpr(), s.maxPixelRatio) * (s.prScale ?? 1));
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    if (composer) {
      composer.setPixelRatio(pixelRatio);
      composer.setSize(width, height);
    }
  }

  function notify() {
    const info = api.info();
    for (const fn of listeners) fn(info);
    if (typeof api.onQualityChange === 'function') api.onQualityChange(info);
  }

  function usePost() {
    return preset.post && !postFailed;
  }

  // ---------- auto-skalowanie ----------
  const perf = { last: 0, ema: 16.7, slow: 0, fast: 0, settleUntil: 0, lastUp: -1e9, upDelay: 12000 };
  function trackFrame(now) {
    let dt = now - perf.last;
    perf.last = now;
    // przerwy przy ukrytej karcie pomijamy (visibilitychange ustawia settleUntil); bardzo wolne klatki liczymy
    if (!autoEnabled || dt <= 0 || now < perf.settleUntil || (typeof document !== 'undefined' && document.hidden)) return;
    dt = Math.min(dt, 1000);
    perf.ema += (dt - perf.ema) * (dt > 100 ? 0.3 : 0.06);
    const l = ladder();
    if (perf.ema > SLOW_MS) {
      perf.slow += dt;
      perf.fast = 0;
    } else {
      perf.slow = Math.max(0, perf.slow - dt * 0.5);
      perf.fast = perf.ema < FAST_MS ? perf.fast + dt : 0;
    }
    if (perf.slow > 2000 && step < l.length - 1) {
      // szybki spadek po niedawnym podniesieniu → wydłuż czekanie na kolejną próbę
      if (now - perf.lastUp < 6000) perf.upDelay = Math.min(perf.upDelay * 2, 120000);
      setStep(step + 1, now);
    } else if (perf.fast > perf.upDelay && step > 0) {
      perf.lastUp = now;
      setStep(step - 1, now);
    }
  }
  function setStep(n, now = performance.now()) {
    const l = ladder();
    n = Math.max(0, Math.min(l.length - 1, n));
    if (n === step) return;
    step = n;
    perf.slow = 0;
    perf.fast = 0;
    perf.ema = 16.7;
    perf.settleUntil = now + 1500;
    applyPixelRatio();
    applyPassToggles();
    notify();
  }

  // ---------- API ----------
  Object.assign(api, {
    renderer,
    get composer() {
      return composer;
    },
    get passes() {
      return passes;
    },
    get quality() {
      return quality;
    },
    /** Callback (info) => {} wołany przy każdej zmianie jakości / kroku auto-skalowania. */
    onQualityChange: null,
    addQualityListener(fn) {
      listeners.push(fn);
    },

    render(scene, camera) {
      const now = performance.now();
      trackFrame(now);
      // cienie liczymy raz na klatkę (GTAO renderuje scenę drugi raz — bez ponownego shadow passa)
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
      if (usePost()) {
        try {
          if (!composer) buildComposer(scene, camera);
          if (scene !== curScene || camera !== curCamera) {
            passes.render.scene = scene;
            passes.render.camera = camera;
            passes.ao.scene = scene;
            passes.ao.camera = camera;
            curScene = scene;
            curCamera = camera;
          }
          if (passes.ao.enabled) {
            _aoBox.min.copy(camera.position).sub(AO_RANGE);
            _aoBox.max.copy(camera.position).add(AO_RANGE);
            passes.ao.setSceneClipBox(_aoBox);
          }
          composer.render(1 / 60);
          if (!postFailed) return;
        } catch (e) {
          console.warn('[Pipeline] Post-processing wyłączony (błąd):', e);
          postFailed = true;
        }
        // awaria → zwykłe renderowanie od tej klatki
        disposeComposer();
        renderer.setRenderTarget(null);
        renderer.shadowMap.needsUpdate = true;
        notify();
      }
      renderer.render(scene, camera);
    },

    setSize(w, h) {
      width = w;
      height = h;
      renderer.setSize(width, height);
      if (composer) composer.setSize(width, height);
    },

    setQuality(q) {
      if (!QUALITY_PRESETS[q]) {
        console.warn(`[Pipeline] nieznana jakość "${q}"`);
        return;
      }
      const wasPost = preset.post;
      quality = q;
      preset = QUALITY_PRESETS[q];
      step = 0;
      perf.settleUntil = performance.now() + 1500;
      if (!preset.post) disposeComposer();
      else if (composer) {
        passes.ao.setResScale(preset.aoScale);
        passes.ao.updateGtaoMaterial({ samples: preset.aoSamples });
      }
      if (wasPost !== preset.post && !preset.post) renderer.setRenderTarget(null);
      applyPixelRatio();
      applyPassToggles();
      notify();
    },

    setAutoQuality(v) {
      autoEnabled = !!v;
      perf.settleUntil = performance.now() + 1500;
    },

    /** Stan potoku (do HUD/debugu). */
    info() {
      const s = currentSettings();
      return {
        quality,
        auto: autoEnabled,
        step,
        post: usePost(),
        postFailed,
        ao: usePost() && !!s.ao,
        bloom: usePost() && !!s.bloom,
        smaa: usePost() && !!s.smaa,
        msaa: usePost() ? s.msaa || 0 : 0,
        pixelRatio,
        frameMs: Math.round(perf.ema * 10) / 10,
        shadowMapSize: s.shadowMapSize,
      };
    },

    /** Debug: podgląd bufora AO ('default' | 'ao' | 'denoise' | 'normal' | 'depth'). */
    setAOOutput(mode = 'default') {
      aoOutput = mode;
      if (passes.ao) passes.ao.output = aoOutputValue(mode);
    },

    dispose() {
      disposeComposer();
      renderer.dispose();
      renderer.domElement.remove();
    },
  });

  if (preset.post && !supportsPost()) {
    console.warn('[Pipeline] Brak renderowalnych celów half-float — renderuję bez post-processingu.');
    postFailed = true;
  }
  applyPixelRatio();
  perf.last = performance.now();
  perf.settleUntil = perf.last + 2500; // pierwsze klatki = kompilacja shaderów
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) perf.settleUntil = performance.now() + 1000;
    });
  }
  return api;
}
