// Lobby z fasolką: niebo, chmury, las i góry w tle, trawiasta ziemia, duży przycisk GRAJ.
// Użycie: createLobby({renderer, bean, animate, onPlay(modeId), modes}) – bean to THREE.Object3D ~1,5 m, przodem do -Z.
import * as THREE from 'three';

const CSS = `
#lb-ui{position:fixed;inset:0;z-index:20;pointer-events:none;font-family:'Anton',Impact,'Arial Narrow Bold',sans-serif;color:#fff;
  transition:opacity .35s ease;-webkit-user-select:none;user-select:none}
#lb-ui.lb-hidden{opacity:0;visibility:hidden;transition:opacity .25s ease,visibility 0s .25s}
#lb-ui *{box-sizing:border-box}
#lb-ui .lb-shade{position:absolute;inset:0;background:
  linear-gradient(180deg,rgba(8,24,60,.45) 0%,rgba(8,24,60,0) 18%),
  linear-gradient(0deg,rgba(6,18,40,.55) 0%,rgba(6,18,40,0) 30%)}
#lb-ui .lb-top{position:absolute;left:0;right:0;top:0;display:flex;justify-content:space-between;align-items:center;gap:12px;
  padding:max(16px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) 0 max(20px,env(safe-area-inset-left))}
#lb-ui .lb-logo{font-size:clamp(30px,4.4vw,52px);line-height:1;letter-spacing:.02em;transform:skewX(-8deg);
  text-shadow:0 3px 0 #1b4fa8,0 6px 0 #123a80,0 10px 22px rgba(0,0,0,.35)}
#lb-ui .lb-logo b{color:#ffe14a;font-weight:400}
#lb-ui .lb-player{pointer-events:auto;display:flex;align-items:center;gap:10px;background:rgba(10,22,48,.55);
  border:2px solid rgba(255,255,255,.18);border-radius:10px;padding:6px 12px 6px 6px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
#lb-ui .lb-avatar{width:36px;height:36px;border-radius:8px;background:linear-gradient(160deg,#ffd76a,#f0a020);
  display:grid;place-items:center;font-size:20px;color:#5a3500}
#lb-ui .lb-player label{display:block;font:600 10px/1 system-ui,sans-serif;letter-spacing:.12em;color:#9fc2ff;text-transform:uppercase;margin-bottom:3px}
#lb-ui .lb-nick{font:inherit;font-size:20px;letter-spacing:.03em;color:#fff;background:none;border:0;outline:none;width:min(170px,34vw);padding:0}
#lb-ui .lb-nick::placeholder{color:rgba(255,255,255,.55)}
#lb-ui .lb-plate{position:absolute;left:0;top:0;transform:translate(-50%,-100%);white-space:nowrap;font-size:22px;letter-spacing:.04em;
  text-shadow:0 2px 0 rgba(0,0,0,.45),0 0 12px rgba(0,0,0,.35);display:flex;flex-direction:column;align-items:center;gap:2px}
#lb-ui .lb-plate small{font:700 10px/1 system-ui,sans-serif;letter-spacing:.16em;color:#062a12;background:#5ff08a;border-radius:4px;padding:3px 6px;text-shadow:none}
#lb-ui .lb-dock{position:absolute;right:max(28px,env(safe-area-inset-right));bottom:max(28px,env(safe-area-inset-bottom));
  display:flex;flex-direction:column;align-items:stretch;gap:12px;width:min(340px,calc(100vw - 32px))}
#lb-ui .lb-mode{pointer-events:auto;cursor:pointer;width:100%;text-align:left;font:inherit;color:#fff;
  display:flex;align-items:center;gap:14px;padding:10px 18px 10px 26px;background:rgba(10,22,48,.62);
  border:2px solid rgba(255,255,255,.16);clip-path:polygon(3% 0,100% 0,97% 100%,0 100%);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
  transition:background .15s ease,border-color .15s ease}
#lb-ui .lb-mode:hover{background:rgba(20,40,82,.78);border-color:rgba(255,225,74,.55)}
#lb-ui .lb-mode:focus-visible{outline:3px solid #ffe14a;outline-offset:-6px}
#lb-ui .lb-mode .lb-chev{margin-left:auto;font:700 11px/1 system-ui,sans-serif;letter-spacing:.12em;color:#ffe14a;white-space:nowrap}
#lb-ui .lb-thumb{width:64px;height:48px;flex:none;border-radius:6px;overflow:hidden;border:2px solid rgba(255,255,255,.7);box-shadow:0 2px 8px rgba(0,0,0,.4)}
#lb-ui .lb-thumb svg{display:block;width:100%;height:100%}
#lb-ui .lb-picker{position:absolute;inset:0;pointer-events:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;
  padding:24px 16px;background:rgba(6,14,32,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);animation:lb-in .18s ease}
#lb-ui .lb-picker[hidden]{display:none}
@keyframes lb-in{from{opacity:0}to{opacity:1}}
#lb-ui .lb-picker h2{margin:0;font-weight:400;font-size:clamp(30px,4vw,46px);letter-spacing:.04em;transform:skewX(-8deg);text-shadow:0 3px 0 #1b4fa8}
#lb-ui .lb-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,300px));gap:18px;width:100%;justify-content:center}
#lb-ui .lb-tile{position:relative;display:block;aspect-ratio:16/10;padding:0;font:inherit;color:#fff;text-align:left;cursor:pointer;overflow:hidden;
  border:0;border-radius:10px;background:#0c1630;box-shadow:0 0 0 3px rgba(255,255,255,.18),0 10px 24px rgba(0,0,0,.45);
  transition:transform .14s ease,box-shadow .14s ease,filter .14s ease}
#lb-ui .lb-tile svg.art{position:absolute;inset:0;width:100%;height:100%;display:block;transition:transform .35s ease}
#lb-ui .lb-tile:hover{transform:translateY(-5px);box-shadow:0 0 0 3px rgba(255,255,255,.75),0 16px 30px rgba(0,0,0,.5)}
#lb-ui .lb-tile:hover svg.art{transform:scale(1.05)}
#lb-ui .lb-tile.sel{transform:translateY(-5px) scale(1.03);box-shadow:0 0 0 5px #fff,0 0 34px 6px rgba(120,200,255,.55),0 18px 34px rgba(0,0,0,.55)}
#lb-ui .lb-tile:focus-visible{outline:none;box-shadow:0 0 0 5px #ffe14a,0 16px 30px rgba(0,0,0,.5)}
#lb-ui .lb-tile .cap{position:absolute;left:0;right:0;bottom:0;padding:22px 14px 11px;
  background:linear-gradient(180deg,rgba(4,8,24,0) 0%,rgba(4,8,24,.6) 100%)}
#lb-ui .lb-tile .cap span{display:block;font-size:34px;line-height:.95;letter-spacing:.02em;text-transform:uppercase;transform:skewX(-8deg);transform-origin:left bottom;
  text-shadow:0 3px 0 rgba(0,0,0,.45)}
#lb-ui .lb-tile .cap em{display:block;font:600 12px/1.25 system-ui,sans-serif;font-style:normal;color:#e6eeff;text-shadow:0 1px 2px rgba(0,0,0,.6)}
#lb-ui .lb-tile .tag{position:absolute;top:10px;left:10px;font:800 10px/1 system-ui,sans-serif;letter-spacing:.12em;color:#1d1400;background:#ffe14a;
  padding:5px 8px 4px;transform:skewX(-10deg);box-shadow:0 2px 0 rgba(0,0,0,.35)}
#lb-ui .lb-tile .check{position:absolute;top:10px;right:10px;width:26px;height:26px;border-radius:50%;background:#fff;color:#0c1630;
  display:none;place-items:center;font:900 15px/1 system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.4)}
#lb-ui .lb-tile.sel .check{display:grid}
#lb-ui .lb-tile.soon{cursor:default}
#lb-ui .lb-tile.soon:hover{transform:none;box-shadow:0 0 0 3px rgba(255,255,255,.18),0 10px 24px rgba(0,0,0,.45)}
#lb-ui .lb-tile.soon:hover svg.art{transform:none}
#lb-ui .lb-tile.soon .tag{background:#9aa7c0}
#lb-ui .lb-close{font:inherit;font-size:22px;letter-spacing:.05em;color:#2a1c00;background:#ffe14a;border:0;cursor:pointer;padding:10px 34px 8px;
  clip-path:polygon(6% 0,100% 0,94% 100%,0 100%)}
#lb-ui .lb-close:hover{filter:brightness(1.08)}
#lb-ui .lb-mode small{display:block;font:700 11px/1 system-ui,sans-serif;letter-spacing:.14em;color:#ffe14a;margin-bottom:5px}
#lb-ui .lb-mode span{font-size:24px;letter-spacing:.03em;line-height:1}
#lb-ui .lb-mode em{display:block;font:500 12px/1.2 system-ui,sans-serif;font-style:normal;color:#b9c9e6;margin-top:4px}
#lb-ui .lb-playwrap{pointer-events:auto;filter:drop-shadow(0 7px 0 #a87400) drop-shadow(0 16px 26px rgba(0,0,0,.4));transition:transform .12s ease,filter .12s ease}
#lb-ui .lb-playwrap:hover{transform:translateY(-3px) scale(1.03);filter:drop-shadow(0 9px 0 #a87400) drop-shadow(0 0 26px rgba(255,214,60,.65)) drop-shadow(0 18px 28px rgba(0,0,0,.4))}
#lb-ui .lb-playwrap:active{transform:translateY(5px);filter:drop-shadow(0 2px 0 #a87400) drop-shadow(0 8px 14px rgba(0,0,0,.35))}
#lb-ui .lb-play{position:relative;display:block;width:100%;overflow:hidden;cursor:pointer;border:0;padding:12px 0 10px;
  font:inherit;font-size:clamp(52px,6.2vw,74px);line-height:1;letter-spacing:.06em;color:#2a1c00;
  background:linear-gradient(180deg,#fff7a8 0%,#ffe437 38%,#ffc800 70%,#f5ad00 100%);
  clip-path:polygon(4% 0,100% 0,96% 100%,0 100%)}
#lb-ui .lb-play span{display:inline-block;transform:skewX(-8deg);text-shadow:0 2px 0 rgba(255,255,255,.55)}
#lb-ui .lb-play::before{content:"";position:absolute;inset:0 0 auto 0;height:46%;background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,0))}
#lb-ui .lb-play::after{content:"";position:absolute;top:-20%;bottom:-20%;width:26%;left:-40%;transform:skewX(-20deg);
  background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.85),rgba(255,255,255,0));animation:lb-shine 3.2s ease-in-out infinite}
@keyframes lb-shine{0%,62%{left:-40%}100%{left:130%}}
#lb-ui .lb-play:focus-visible{outline:4px solid #fff;outline-offset:-8px}
#lb-ui .lb-hint{position:absolute;left:max(20px,env(safe-area-inset-left));bottom:max(24px,env(safe-area-inset-bottom));
  font:500 13px/1.4 system-ui,sans-serif;color:rgba(255,255,255,.82);text-shadow:0 1px 3px rgba(0,0,0,.5)}
@media (max-width:640px){
  #lb-ui .lb-dock{left:16px;right:16px;width:auto;bottom:max(20px,env(safe-area-inset-bottom))}
  #lb-ui .lb-hint{display:none}
  #lb-ui .lb-plate{font-size:18px}
  #lb-ui .lb-tiles{grid-template-columns:1fr;max-width:340px}
  #lb-ui .lb-tile .cap span{font-size:28px}
}
`;

const HTML = `
<div class="lb-shade"></div>
<div class="lb-top">
  <div class="lb-logo">FASOL<b>KA</b></div>
  <div class="lb-player"><div class="lb-avatar"><svg viewBox="0 0 24 24" width="22" height="22"><rect x="6" y="2" width="12" height="20" rx="6" fill="#fff6dc"/><rect x="8" y="6.5" width="8" height="4" rx="2" fill="#5a3500"/></svg></div><div><label for="lb-nick">Gracz</label>
    <input class="lb-nick" id="lb-nick" maxlength="14" placeholder="Wpisz nick" autocomplete="off"></div></div>
</div>
<div class="lb-plate" id="lb-plate"><span id="lb-plate-name">Gracz</span><small>GOTOWY</small></div>
<div class="lb-dock">
  <button class="lb-mode" id="lb-mode" type="button" aria-haspopup="dialog"><div class="lb-thumb" id="lb-mode-ic"></div>
    <div><small>TRYB GRY</small><span id="lb-mode-name"></span><em id="lb-mode-desc"></em></div><i class="lb-chev">ZMIEŃ ›</i></button>
  <div class="lb-playwrap"><button class="lb-play" id="lb-play" type="button"><span>GRAJ</span></button></div>
</div>
<div class="lb-hint">Przeciągnij, aby obrócić postać</div>
<div class="lb-picker" id="lb-picker" role="dialog" aria-label="Wybór trybu" hidden>
  <h2>WYBIERZ TRYB</h2>
  <div class="lb-tiles" id="lb-tiles"></div>
  <button class="lb-close" id="lb-close" type="button">GOTOWE</button>
</div>`;

// ilustracje kafelków (SVG 320x200): same napisy na tłach; uid = unikalne id gradientów w dokumencie
let artN = 0;
const vign = u => `<radialGradient id="vg${u}" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>`;
const goldDef = u => `<linearGradient id="gold${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".32" stop-color="#fff1c4"/><stop offset=".52" stop-color="#f3b632"/><stop offset=".53" stop-color="#a8660f"/><stop offset="1" stop-color="#ffe08a"/></linearGradient>`;
const TXT = 'font-family="Anton,Impact,sans-serif" text-anchor="middle" stroke="#120a1c" stroke-linejoin="round" paint-order="stroke"';
const stripes = (n, op) => `<g stroke="#fff" stroke-opacity="${op}" stroke-width="2">${Array.from({ length: n }, (_, i) => `<line x1="${-60 + i * 22}" y1="200" x2="${i * 22}" y2="0"/>`).join('')}</g>`;
const ART = {
  range() {
    const u = ++artN;
    return `<svg class="art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice"><defs>${vign(u)}${goldDef(u)}
      <linearGradient id="bg${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a2e"/><stop offset=".5" stop-color="#e2461f"/><stop offset="1" stop-color="#6a0f12"/></linearGradient></defs>
      <rect width="320" height="200" fill="url(#bg${u})"/>${stripes(18, .07)}
      <g fill="none" stroke="#fff" stroke-opacity=".16"><circle cx="248" cy="92" r="118" stroke-width="16"/><circle cx="248" cy="92" r="80" stroke-width="14"/><circle cx="248" cy="92" r="44" stroke-width="12"/></g>
      <circle cx="248" cy="92" r="14" fill="#fff" fill-opacity=".22"/>
      <g stroke="#fff" stroke-opacity=".28" stroke-width="2"><line x1="248" y1="0" x2="248" y2="200"/><line x1="100" y1="92" x2="320" y2="92"/></g>
      <g transform="translate(160 108) skewX(-10)"><text ${TXT} font-size="60" stroke-width="7" fill="#fff" letter-spacing="1">STRZELNICA</text></g>
      <rect x="62" y="118" width="196" height="7" fill="url(#gold${u})" stroke="#120a1c" stroke-width="2" transform="skewX(-10) translate(21 0)"/>
      <rect width="320" height="200" fill="url(#vg${u})"/></svg>`;
  },
  duel() {
    const u = ++artN;
    return `<svg class="art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice"><defs>${vign(u)}${goldDef(u)}
      <linearGradient id="rd${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4a3a"/><stop offset="1" stop-color="#8a0c2c"/></linearGradient>
      <linearGradient id="bl${u}" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4aa3ff"/><stop offset="1" stop-color="#0e2a8a"/></linearGradient>
      <filter id="gl${u}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter></defs>
      <polygon points="0,0 186,0 134,200 0,200" fill="url(#rd${u})"/><polygon points="186,0 320,0 320,200 134,200" fill="url(#bl${u})"/>
      ${stripes(18, .08)}
      <polygon points="180,0 192,0 140,200 128,200" fill="#fff" filter="url(#gl${u})"/><polygon points="184,0 188,0 136,200 132,200" fill="#fff"/>
      <g transform="translate(160 118) skewX(-10)"><text ${TXT} font-size="96" stroke-width="8" letter-spacing="2"><tspan fill="#fff">1</tspan><tspan fill="url(#gold${u})">VS</tspan><tspan fill="#fff">1</tspan></text></g>
      <rect width="320" height="200" fill="url(#vg${u})"/></svg>`;
  },
  soon() {
    const u = ++artN;
    return `<svg class="art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice"><defs>${vign(u)}
      <radialGradient id="bg${u}" cx=".5" cy=".42" r=".7"><stop offset="0" stop-color="#34497e"/><stop offset=".6" stop-color="#18234a"/><stop offset="1" stop-color="#0a1028"/></radialGradient></defs>
      <rect width="320" height="200" fill="url(#bg${u})"/>${stripes(18, .06)}
      <g transform="translate(160 106) skewX(-10)"><text ${TXT} font-size="50" stroke-width="6" fill="#cfdcf5" letter-spacing="1">COMING SOON...</text></g>
      <rect width="320" height="200" fill="url(#vg${u})"/></svg>`;
  },
};
const DEFAULT_MODES = [
  { id: 'range', name: 'Strzelnica', desc: 'Solo · zestrzel czerwone fasolki', icon: 'range', tag: 'SOLO' },
  { id: '1v1', name: '1v1', desc: 'Pojedynek z botem · do 5', icon: 'duel', tag: '1 NA 1' },
  { soon: true },
];

// deterministyczny generator losowy, żeby las wyglądał zawsze tak samo
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

export function createLobby({ renderer, bean, animate = () => {}, onPlay = () => {}, modes = DEFAULT_MODES }) {
  const rnd = rng(7);
  const R = (a, b) => a + (b - a) * rnd();

  // ---------- DOM ----------
  if (!document.getElementById('lb-font')) {
    const l = document.createElement('link');
    l.id = 'lb-font'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Anton&display=swap';
    document.head.appendChild(l);
  }
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const ui = document.createElement('div'); ui.id = 'lb-ui'; ui.innerHTML = HTML; document.body.appendChild(ui);
  const $ = id => ui.querySelector('#' + id);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };
  // ---------- tryby gry ----------
  const playable = modes.filter(m => !m.soon);
  let mode = playable.find(m => m.id === store.get('fasolka-mode')) || playable[0];
  const picker = $('lb-picker'), tiles = $('lb-tiles');
  function renderMode() {
    $('lb-mode-name').textContent = mode.name; $('lb-mode-desc').textContent = mode.desc;
    $('lb-mode-ic').innerHTML = ART[mode.icon] ? ART[mode.icon]() : '';
    tiles.querySelectorAll('.lb-tile').forEach(t => { t.classList.toggle('sel', t.dataset.id === mode.id); t.setAttribute('aria-pressed', t.dataset.id === mode.id); });
  }
  modes.forEach(m => {
    const t = document.createElement('button'); t.type = 'button';
    t.className = 'lb-tile' + (m.soon ? ' soon' : '');
    const icon = m.soon ? 'soon' : m.icon;
    t.innerHTML = (ART[icon] ? ART[icon]() : '') + '<i class="tag"></i><i class="check">✓</i><div class="cap"><em></em></div>';
    t.querySelector('.tag').textContent = m.soon ? 'WKRÓTCE' : (m.tag || 'TRYB');
    if (m.soon) { t.disabled = true; t.setAttribute('aria-label', 'Coming soon'); t.querySelector('.cap em').textContent = 'Nowy tryb jest w drodze'; }
    else {
      t.dataset.id = m.id; t.querySelector('.cap em').textContent = m.desc; t.setAttribute('aria-label', m.name);
      t.addEventListener('click', () => { mode = m; store.set('fasolka-mode', m.id); renderMode(); });
      t.addEventListener('dblclick', () => closePicker());
    }
    tiles.appendChild(t);
  });
  const openPicker = () => { picker.hidden = false; hover = false; (tiles.querySelector('.sel') || tiles.firstChild).focus({ preventScroll: true }); };
  const closePicker = () => { picker.hidden = true; };
  $('lb-mode').addEventListener('click', openPicker);
  $('lb-close').addEventListener('click', closePicker);
  picker.addEventListener('click', e => { if (e.target === picker) closePicker(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !picker.hidden) { closePicker(); e.stopPropagation(); } }, true);
  renderMode();
  const nick = $('lb-nick'), plateName = $('lb-plate-name'), plate = $('lb-plate');
  nick.value = store.get('fasolka-nick') || '';
  const syncNick = () => { plateName.textContent = nick.value.trim() || 'Gracz'; store.set('fasolka-nick', nick.value); };
  nick.addEventListener('input', syncNick); syncNick();
  nick.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') nick.blur(); });
  nick.addEventListener('keyup', e => e.stopPropagation());

  // ---------- scena ----------
  const scene = new THREE.Scene();
  const HORIZON = new THREE.Color(0xcfe9ff);
  scene.fog = new THREE.FogExp2(HORIZON, 0.0068);   // lekka mgła: przy postaci niewidoczna, gęstnieje z odległością
  const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 1200);

  // niebo: gradient na kuli
  const skyU = { top: { value: new THREE.Color(0x1d63d8) }, mid: { value: new THREE.Color(0x5fb0ff) }, bot: { value: HORIZON } };
  const SKY_GLSL = `uniform vec3 top,mid,bot;
    vec3 skyCol(float h){vec3 c=mix(bot,mid,smoothstep(0.,.18,h));return mix(c,top,smoothstep(.18,.75,h));}`;
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `${SKY_GLSL} varying vec3 vP;
      void main(){gl_FragColor=vec4(skyCol(vP.y),1.);
      #include <colorspace_fragment>
      }`,
  })));
  // materiał gór "za mgłą": kolor nieba w tym kierunku zmieszany z barwą góry (amt = ile góry widać)
  const SUN_DIR = new THREE.Vector3(7, 13, 6).normalize();
  function hazeMat(tint, amt, fullAt) {
    return new THREE.ShaderMaterial({
      fog: false,
      uniforms: { ...skyU, tint: { value: new THREE.Color(tint) }, amt: { value: amt }, fullAt: { value: fullAt }, sunDir: { value: SUN_DIR } },
      vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader: `${SKY_GLSL} uniform vec3 tint,sunDir;uniform float amt,fullAt;varying vec3 vW;
        void main(){
          vec3 d=normalize(vW-cameraPosition),n=normalize(cross(dFdx(vW),dFdy(vW)));if(dot(n,d)>0.)n=-n;
          float l=.8+.25*max(dot(n,sunDir),0.);
          float k=amt*(.3+.7*smoothstep(-6.,fullAt,vW.y));          // u podnóża więcej mgły
          gl_FragColor=vec4(mix(skyCol(max(d.y,0.)),tint*l,k),1.);
          #include <colorspace_fragment>
        }`,
    });
  }
  const rnd2 = rng(19), R2 = (a, b) => a + (b - a) * rnd2();   // osobny generator, żeby nie ruszać układu lasu

  // słońce z poświatą
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(.18, 'rgba(255,250,220,.95)');
    g.addColorStop(.4, 'rgba(255,240,190,.35)'); g.addColorStop(1, 'rgba(255,240,190,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, fog: false, depthWrite: false, transparent: true }));
  sunSprite.position.set(150, 150, -420); sunSprite.scale.setScalar(150); scene.add(sunSprite);

  // światła
  scene.add(new THREE.HemisphereLight(0xd6ecff, 0x557a33, 1.35));
  const sun = new THREE.DirectionalLight(0xfff0d2, 2.6);
  sun.position.set(7, 13, 6); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
  scene.add(sun, sun.target);

  // teren: płaski w środku, łagodne pagórki dalej
  const heightAt = (x, z) => {
    const d = Math.hypot(x, z * 1.2);
    const k = THREE.MathUtils.smoothstep(d, 45, 110);
    return k * (Math.sin(x * 0.05) * Math.cos(z * 0.045) * 2 + Math.sin(x * 0.017 + 1.3) * 2.5 + 2);
  };
  const grassTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = '#62b33d'; x.fillRect(0, 0, 256, 256);
    const r = rng(3);
    for (let i = 0; i < 900; i++) {
      const l = r();
      x.fillStyle = l < .5 ? `rgba(70,140,40,${.25 + r() * .3})` : `rgba(140,205,80,${.2 + r() * .3})`;
      x.beginPath(); x.arc(r() * 256, r() * 256, 2 + r() * 9, 0, 7); x.fill();
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(90, 90);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  })();
  const groundGeo = new THREE.PlaneGeometry(700, 700, 140, 140); groundGeo.rotateX(-Math.PI / 2);
  { const p = groundGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i))); groundGeo.computeVertexNormals(); }
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
  ground.receiveShadow = true; scene.add(ground);

  // góry na horyzoncie (bliższe pasmo, lekko zamglone)
  const mountMat = hazeMat(0x6f9cc0, .78, 40);
  const snowMat = hazeMat(0xf4f8ff, .82, 40);
  for (let i = 0; i < 12; i++) {
    const h = R(28, 52), r = h * R(1.3, 1.8), g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), mountMat); m.position.y = h / 2; g.add(m);
    const s = new THREE.Mesh(new THREE.ConeGeometry(r * .26, h * .26, 9), snowMat); s.position.y = h * .87 + .1; g.add(s);
    g.position.set(-330 + i * 60 + R(-20, 20), -6, R(-300, -250)); g.rotation.y = R(0, 6); scene.add(g);
  }
  // dalekie pasmo: ogromne, ledwo widoczne zza mgły
  const farMat = hazeMat(0x4f74a6, .26, 120), farSnow = hazeMat(0xffffff, .2, 120);
  for (let i = 0; i < 16; i++) {
    const h = R2(80, 150), r = h * R2(1.4, 2.1), g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), farMat); m.position.y = h / 2; g.add(m);
    const sn = new THREE.Mesh(new THREE.ConeGeometry(r * .22, h * .22, 10), farSnow); sn.position.y = h * .89 + .2; g.add(sn);
    g.position.set(-800 + i * 105 + R2(-30, 30), -10, R2(-640, -540)); g.rotation.y = R2(0, 6); scene.add(g);
  }

  // chmury
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x9fb8d8, emissiveIntensity: .6, roughness: 1, fog: false });
  const cloudGeo = new THREE.SphereGeometry(1, 18, 12);
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Group(), n = 5 + Math.floor(R(0, 4));
    for (let j = 0; j < n; j++) {
      const p = new THREE.Mesh(cloudGeo, cloudMat), s = R(5, 10) * (1 - Math.abs(j - n / 2) / n);
      p.scale.set(s, s * .8, s); p.position.set((j - n / 2) * 6 + R(-2, 2), R(0, 3), R(-3, 3)); c.add(p);
    }
    const flat = new THREE.Mesh(cloudGeo, cloudMat); flat.scale.set(n * 3.6, 2.2, 7); flat.position.y = -1.5; c.add(flat);
    c.position.set(R(-320, 320), R(45, 110), R(-380, -120)); c.scale.setScalar(R(.8, 1.6));
    c.userData.v = R(.6, 1.6); scene.add(c); clouds.push(c);
  }

  // ptaki: kilka kluczy przelatuje po niebie, machają skrzydłami i czasem szybują
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x2c3746, side: THREE.DoubleSide, fog: false });
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([.24, 0, 0, -.22, 0, 0, -.16, 0, .82], 3));
  const birdBody = new THREE.ConeGeometry(.07, .5, 5); birdBody.rotateZ(-Math.PI / 2);   // dziób w +X
  function makeBird() {
    const g = new THREE.Group(), L = new THREE.Mesh(wingGeo, birdMat), Rw = new THREE.Mesh(wingGeo, birdMat);
    Rw.scale.z = -1; g.add(new THREE.Mesh(birdBody, birdMat), L, Rw);
    g.userData = { L, R: Rw, ph: rnd2() * 6.28, f: R2(8, 10.5) }; return g;
  }
  const flocks = [];
  // lot po skosie (nie idealnie w poprzek kadru), żeby z ziemi było widać rozpiętość skrzydeł
  function launchFlock(f, first) {
    const dir = rnd2() < .5 ? 1 : -1, tilt = (rnd2() < .5 ? 1 : -1) * R2(.6, .85);
    const h = dir > 0 ? tilt : Math.PI - tilt;                       // obrót wokół Y; lokalne +X = kierunek lotu
    f.v = new THREE.Vector3(Math.cos(h), 0, -Math.sin(h)); f.group.rotation.y = h;
    f.speed = R2(5.5, 8.5); f.y = R2(13, 21);
    const cross = new THREE.Vector3(R2(-18, 18), f.y, R2(-105, -70));   // gdzie klucz przetnie środek kadru
    const back = first ? R2(5, 25) : R2(90, 200);
    f.group.position.copy(cross).addScaledVector(f.v, -back);
    f.left = back + 140;                                              // ile jeszcze leci, zanim wróci na start
  }
  for (let i = 0; i < 3; i++) {
    const group = new THREE.Group(), n = 3 + Math.floor(R2(0, 5)), birds = [];
    for (let j = 0; j < n; j++) {                       // formacja V za przewodnikiem
      const b = makeBird(), row = Math.ceil(j / 2), side = j % 2 ? 1 : -1;
      b.position.set(-row * 1.7 + R2(-.3, .3), R2(-.35, .35), row * side * 1.5); b.scale.setScalar(R2(1.9, 2.4));
      group.add(b); birds.push(b);
    }
    const f = { group, birds, bob: R2(0, 6) }; launchFlock(f, i === 0); scene.add(group); flocks.push(f);
  }

  // drzewa
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a4a26, roughness: 1, flatShading: true });
  const pineMats = [0x2f7d3a, 0x3a8f45, 0x276b33, 0x44994c].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }));
  const leafMats = [0x5fae3c, 0x4f9e34, 0x78c043, 0x8acb4c].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }));
  const trunkGeo = new THREE.CylinderGeometry(.13, .2, 1, 6);
  const coneGeo = new THREE.ConeGeometry(1, 1, 7);
  const blobGeo = new THREE.IcosahedronGeometry(1, 1);
  const swaying = [];
  function tree(x, z, s, shadow) {
    const g = new THREE.Group();
    const pine = rnd() < .55;
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    const th = pine ? .9 : 1.3; trunk.scale.set(1, th, 1); trunk.position.y = th / 2; g.add(trunk);
    const crown = new THREE.Group(); crown.position.y = th * .85; g.add(crown);
    if (pine) {
      const m = pineMats[Math.floor(rnd() * pineMats.length)];
      for (let k = 0; k < 3; k++) {
        const c = new THREE.Mesh(coneGeo, m), w = 1.25 - k * .3, h = 1.5 - k * .2;
        c.scale.set(w, h, w); c.position.y = k * .85 + h / 2; c.rotation.y = rnd() * 3; crown.add(c);
      }
    } else {
      const m = leafMats[Math.floor(rnd() * leafMats.length)];
      for (let k = 0; k < 3; k++) {
        const b = new THREE.Mesh(blobGeo, m), r = k ? R(.6, .8) : R(.95, 1.15);
        b.scale.setScalar(r); b.position.set(k ? (k === 1 ? .6 : -.55) : 0, k ? R(.6, 1) : 1.1, k ? R(-.3, .3) : 0); crown.add(b);
      }
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = shadow; o.receiveShadow = shadow; } });
    g.position.set(x, heightAt(x, z) - .05, z); g.scale.setScalar(s); g.rotation.y = rnd() * 6;
    crown.userData.ph = rnd() * 6; swaying.push(crown);
    scene.add(g);
  }
  // las za postacią i po bokach (ramka kadru)
  for (let i = 0; i < 520; i++) {
    const x = R(-130, 130), z = R(-140, 4);
    const d = Math.hypot(x, z * 1.15);
    if (d < 16) continue;                                  // polana wokół fasolki
    if (d > 70 && rnd() < .5) continue;
    tree(x, z, R(1.15, 1.9), d < 30);
  }
  [[-9.5, -6], [10.5, -7.5], [-14, -1], [15, -2.5], [-6, -13], [7.5, -15]].forEach(([x, z]) => tree(x, z, R(1.3, 1.7), true));

  // krzaki, kamienie
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x9aa3a8, roughness: 1, flatShading: true });
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  [[-2.8, -2.2, .32], [3.4, -2.8, .45], [2.3, 1.0, .18], [-3.9, .3, .24], [6, -7, .7], [-7, -9, .9]].forEach(([x, z, s]) => {
    const r = new THREE.Mesh(rockGeo, rockMat); r.scale.set(s * 1.3, s * .8, s); r.position.set(x, s * .35, z);
    r.rotation.set(rnd(), rnd() * 6, rnd()); r.castShadow = r.receiveShadow = true; scene.add(r);
  });
  [[-3.4, -3], [4.2, -1.6], [-2, -5.5], [2.8, -6], [-5.6, -1.5], [6.5, -3]].forEach(([x, z]) => {
    const b = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const m = new THREE.Mesh(blobGeo, leafMats[k % 4]); const s = R(.32, .5);
      m.scale.set(s, s * .8, s); m.position.set(R(-.35, .35), s * .55, R(-.25, .25)); m.castShadow = m.receiveShadow = true; b.add(m);
    }
    b.position.set(x, 0, z); scene.add(b);
  });

  // kępki trawy i kwiatki (instancje)
  const bladeGeo = new THREE.ConeGeometry(.025, .2, 3); bladeGeo.translate(0, .1, 0);
  const blades = new THREE.InstancedMesh(bladeGeo, new THREE.MeshStandardMaterial({ roughness: 1 }), 2600);
  const flowerGeo = new THREE.IcosahedronGeometry(.03, 0);
  const flowers = new THREE.InstancedMesh(flowerGeo, new THREE.MeshStandardMaterial({ roughness: .7, emissive: 0x222222 }), 260);
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
    const greens = [0x5aa935, 0x6dbd3f, 0x4e9a2e, 0x86cf4f];
    for (let i = 0; i < blades.count; i++) {
      const a = rnd() * 6.283, r = .55 + Math.pow(rnd(), .7) * 16;
      p.set(Math.cos(a) * r, 0, Math.sin(a) * r * .9 - 2); if (p.z > 2.5) p.z = R(-12, 2.5); p.y = heightAt(p.x, p.z);
      e.set(R(-.35, .35), rnd() * 6, R(-.35, .35)); q.setFromEuler(e); const s = R(.6, 1.2); sc.set(s, s * R(.8, 1.3), s);
      blades.setMatrixAt(i, m.compose(p, q, sc)); blades.setColorAt(i, col.set(greens[i % 4]));
    }
    const petals = [0xffffff, 0xffe14a, 0xff7eb6, 0xb58cff, 0xff9a3c];
    for (let i = 0; i < flowers.count; i++) {
      const a = rnd() * 6.283, r = 1.1 + rnd() * 13;
      p.set(Math.cos(a) * r, 0, Math.sin(a) * r * .9 - 2); if (p.z > 2.5) p.z = R(-12, 2.5); p.y = heightAt(p.x, p.z) + R(.1, .2);
      q.identity(); sc.setScalar(R(.8, 1.5));
      flowers.setMatrixAt(i, m.compose(p, q, sc)); flowers.setColorAt(i, col.set(petals[i % petals.length]));
    }
  }
  blades.receiveShadow = true; scene.add(blades, flowers);

  // pyłki unoszące się w powietrzu
  const POLLEN = 140;
  const pollenGeo = new THREE.BufferGeometry();
  const pp = new Float32Array(POLLEN * 3);
  for (let i = 0; i < POLLEN; i++) { pp[i * 3] = R(-8, 8); pp[i * 3 + 1] = R(0, 5); pp[i * 3 + 2] = R(-8, 4); }
  pollenGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const pollen = new THREE.Points(pollenGeo, new THREE.PointsMaterial({
    size: .07, map: glowTex, transparent: true, depthWrite: false, color: 0xfff6c8, opacity: .9,
  }));
  scene.add(pollen);

  // cień kontaktowy pod fasolką
  const blob = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = .01; return m;
  })();
  scene.add(blob);

  // fasolka
  const holder = new THREE.Group(); holder.add(bean); scene.add(holder);
  bean.rotation.y = Math.PI;                 // model patrzy w -Z, kamera stoi na +Z
  bean.traverse(o => { if (o.isMesh) o.castShadow = true; });

  // ---------- kamera i sterowanie ----------
  const lookAt = new THREE.Vector3();
  let camZ = 5.4;
  function frameCamera() {
    camera.aspect = innerWidth / innerHeight;
    const portrait = camera.aspect < 0.8;
    camera.fov = portrait ? 42 : 30;
    camZ = portrait ? 6.2 : 6;
    lookAt.set(0, portrait ? 1.2 : 1.0, 0);
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', frameCamera); frameCamera();

  const canvas = renderer.domElement;
  let active = true, dragging = false, lastX = 0, rotY = 0, rotVel = 0, mx = 0, my = 0, cmx = 0, cmy = 0, wave = 0, hover = false;
  canvas.addEventListener('pointerdown', e => { if (!active) return; dragging = true; lastX = e.clientX; try { canvas.setPointerCapture(e.pointerId); } catch {} });
  addEventListener('pointermove', e => {
    mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1;
    if (!active || !dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX; rotVel = dx * .012; rotY += rotVel;
  });
  addEventListener('pointerup', () => { dragging = false; });

  const play = $('lb-play'), wrap = ui.querySelector('.lb-playwrap');
  wrap.addEventListener('pointerenter', () => hover = true);
  wrap.addEventListener('pointerleave', () => hover = false);
  play.addEventListener('click', () => { if (active) onPlay(mode.id); });

  // ---------- pętla ----------
  const head = new THREE.Vector3();
  let t = 0;
  const state = { wave: 0, dragging: false };
  function update(dt) {
    t += dt;
    if (!dragging) { rotVel *= .93; rotY += rotVel; rotY += (Math.sin(t * .35) * .3 - rotY) * .008; }
    holder.rotation.y = rotY;
    wave = THREE.MathUtils.damp(wave, hover ? 1 : 0, 6, dt);
    state.wave = wave; state.dragging = dragging;
    animate(bean, t, dt, state);

    cmx = THREE.MathUtils.damp(cmx, mx, 2.5, dt); cmy = THREE.MathUtils.damp(cmy, my, 2.5, dt);
    camera.position.set(cmx * .35, .8 - cmy * .1, camZ);
    camera.lookAt(lookAt);

    swaying.forEach(c => { c.rotation.z = Math.sin(t * 1.1 + c.userData.ph) * .025; });
    clouds.forEach(c => { c.position.x += c.userData.v * dt; if (c.position.x > 360) c.position.x = -360; });
    flocks.forEach(f => {
      const p = f.group.position;
      p.addScaledVector(f.v, f.speed * dt); p.y = f.y + Math.sin(t * .45 + f.bob) * .8;
      f.left -= f.speed * dt; if (f.left < 0) launchFlock(f, false);
      f.birds.forEach(b => {
        const u = b.userData, glide = THREE.MathUtils.smoothstep(Math.sin(t * .35 + u.ph), .45, .8);
        const a = THREE.MathUtils.lerp(.15 + Math.sin(t * u.f + u.ph) * .6, .1, glide);
        u.L.rotation.x = -a; u.R.rotation.x = a; b.position.y += Math.cos(t * u.f + u.ph) * .002;
      });
    });
    const pa = pollenGeo.attributes.position;
    for (let i = 0; i < POLLEN; i++) {
      let y = pa.getY(i) + dt * (.12 + (i % 5) * .03); if (y > 5) y = 0;
      pa.setY(i, y); pa.setX(i, pa.getX(i) + Math.sin(t * .8 + i) * dt * .08);
    }
    pa.needsUpdate = true;

    renderer.render(scene, camera);

    // tabliczka z nickiem nad głową
    head.set(0, 1.78, 0); holder.localToWorld(head); head.project(camera);
    plate.style.transform = `translate(${(head.x * .5 + .5) * innerWidth}px,${(-head.y * .5 + .5) * innerHeight}px) translate(-50%,-100%)`;
  }

  function show() { active = true; ui.classList.remove('lb-hidden'); }
  function hide() { active = false; dragging = false; hover = false; picker.hidden = true; ui.classList.add('lb-hidden'); }

  return { scene, camera, update, show, hide, get active() { return active; }, get mode() { return mode.id; }, ui };
}
