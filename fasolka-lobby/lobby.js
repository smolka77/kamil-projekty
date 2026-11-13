// Lobby z fasolką: niebo, chmury, las i góry w tle, trawiasta ziemia, duży przycisk GRAJ.
// Użycie: createLobby({renderer, bean, animate, onPlay(modeId), modes}) – bean to THREE.Object3D ~1,5 m, przodem do -Z.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildVillage } from './village.js';
import { buildBattlefield } from './battlefield.js';

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
#lb-ui .lb-tile.sel{transform:translateY(-5px) scale(1.04);box-shadow:0 0 0 4px #fff,0 0 0 8px rgba(255,225,74,.85),0 0 40px 10px rgba(255,214,60,.35),0 18px 34px rgba(0,0,0,.55)}
#lb-ui .lb-tile:focus-visible{outline:3px dashed #fff;outline-offset:6px}
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
#lb-ui .lb-plate em{display:block;font:800 10px/1 system-ui,sans-serif;font-style:normal;letter-spacing:.14em;color:#2a1c00;background:#ffe14a;
  border-radius:4px;padding:4px 7px;margin-top:3px;opacity:0;transform:translateY(4px);transition:opacity .15s,transform .15s;text-shadow:none}
#lb-ui .lb-plate.hov em{opacity:1;transform:none}
#lb-ui.bean-hover{cursor:pointer}
#lb-ui .lb-skins{position:absolute;left:max(16px,env(safe-area-inset-left));top:86px;bottom:24px;width:min(330px,calc(100vw - 32px));pointer-events:auto;
  display:flex;flex-direction:column;gap:12px;padding:16px;background:rgba(8,14,32,.78);border:2px solid rgba(255,255,255,.14);border-radius:12px;
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);animation:lb-in .18s ease}
#lb-ui .lb-skins[hidden]{display:none}
#lb-ui .lb-skins h2{margin:0;font-weight:400;font-size:30px;letter-spacing:.04em;transform:skewX(-8deg);text-shadow:0 3px 0 #1b4fa8}
#lb-ui .lb-skins .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;overflow-y:auto;padding:4px 2px}
#lb-ui .lb-skin{font:inherit;color:#fff;cursor:pointer;border:0;border-radius:8px;padding:8px 4px 7px;background:rgba(255,255,255,.07);
  box-shadow:0 0 0 2px rgba(255,255,255,.12);display:flex;flex-direction:column;align-items:center;gap:5px;transition:transform .12s,box-shadow .12s,background .12s}
#lb-ui .lb-skin:hover{transform:translateY(-3px);background:rgba(255,255,255,.13);box-shadow:0 0 0 2px rgba(255,255,255,.45)}
#lb-ui .lb-skin.sel{box-shadow:0 0 0 3px #ffe14a,0 0 18px rgba(255,214,60,.45);background:rgba(255,225,74,.12)}
#lb-ui .lb-skin svg{width:44px;height:58px;display:block}
#lb-ui .lb-skin span{font-size:15px;letter-spacing:.03em;line-height:1}
#lb-ui .lb-skin small{font:700 9px/1 system-ui,sans-serif;letter-spacing:.12em;color:#ffe14a;min-height:9px}
#lb-ui .lb-skins .lb-close{align-self:flex-start;margin-top:auto}
@media (max-width:640px){#lb-ui .lb-skins{top:auto;bottom:16px;height:52vh;left:16px;right:16px;width:auto}#lb-ui .lb-skins .grid{grid-template-columns:repeat(4,1fr)}}
#lb-ui .lb-hint{position:absolute;left:max(20px,env(safe-area-inset-left));bottom:max(24px,env(safe-area-inset-bottom));
  font:500 13px/1.4 system-ui,sans-serif;color:rgba(255,255,255,.82);text-shadow:0 1px 3px rgba(0,0,0,.5)}
@media (max-width:640px){
  #lb-ui .lb-dock{left:16px;right:16px;width:auto;bottom:max(20px,env(safe-area-inset-bottom))}
  #lb-ui .lb-hint{display:none}
  #lb-ui .lb-plate{font-size:18px}
  #lb-ui .lb-tiles{grid-template-columns:minmax(0,1fr);max-width:340px;padding:0 6px}
  #lb-ui .lb-picker{justify-content:flex-start;overflow-y:auto;padding-top:max(20px,env(safe-area-inset-top))}
  #lb-ui .lb-picker h2{font-size:clamp(24px,8vw,34px)}
  #lb-ui .lb-tile.sel,#lb-ui .lb-tile:hover{transform:none}
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
<div class="lb-plate" id="lb-plate"><span id="lb-plate-name">Gracz</span><small>GOTOWY</small><em>KLIKNIJ, BY ZMIENIĆ SKIN</em></div>
<div class="lb-dock">
  <button class="lb-mode" id="lb-mode" type="button" aria-haspopup="dialog"><div class="lb-thumb" id="lb-mode-ic"></div>
    <div><small>TRYB GRY</small><span id="lb-mode-name"></span><em id="lb-mode-desc"></em></div><i class="lb-chev">ZMIEŃ ›</i></button>
  <div class="lb-playwrap"><button class="lb-play" id="lb-play" type="button"><span>GRAJ</span></button></div>
</div>
<div class="lb-hint">Przeciągnij, aby obrócić postać · kliknij fasolkę, aby zmienić skin</div>
<div class="lb-skins" id="lb-skins" role="dialog" aria-label="Wybór skina" hidden>
  <h2>SKINY</h2>
  <div class="grid" id="lb-skin-grid"></div>
  <button class="lb-close" id="lb-skin-close" type="button">GOTOWE</button>
</div>
<div class="lb-picker" id="lb-picker" role="dialog" aria-label="Wybór trybu" hidden>
  <h2>WYBIERZ TRYB</h2>
  <div class="lb-tiles" id="lb-tiles"></div>
  <button class="lb-close" id="lb-close" type="button">GOTOWE</button>
</div>`;

// ilustracje kafelków (SVG 320x200): same napisy na tłach; uid = unikalne id gradientów w dokumencie
let artN = 0;
const DEFS = u => `<radialGradient id="vg${u}" cx=".5" cy=".5" r=".72"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
  <radialGradient id="hl${u}" cx=".5" cy=".42" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="gold${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe8"/><stop offset=".3" stop-color="#ffe9a0"/><stop offset=".5" stop-color="#f3b632"/><stop offset=".51" stop-color="#b06c10"/><stop offset=".8" stop-color="#e9a52a"/><stop offset="1" stop-color="#ffe08a"/></linearGradient>
  <linearGradient id="slv${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#f1f4ff"/><stop offset=".51" stop-color="#cdd6ee"/><stop offset="1" stop-color="#f4f7ff"/></linearGradient>
  <filter id="gr${u}"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${u}"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .09 0"/></filter>
  <filter id="bl${u}" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>
  <filter id="ds${u}" x="-30%" y="-10%" width="160%" height="120%"><feDropShadow dx="2.5" dy="1" stdDeviation="2" flood-color="#000" flood-opacity=".55"/></filter>
  <pattern id="ht${u}" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.3" fill="#fff"/></pattern>
  <linearGradient id="hm${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <mask id="mk${u}"><rect width="320" height="200" fill="url(#hm${u})"/></mask>`;
const TXT = 'font-family="Anton,Impact,sans-serif" text-anchor="middle" stroke-linejoin="round"';
// duży napis: poświata, wytłoczenie w głąb (kilka warstw), obrys i połysk; y = środek wysokości liter
function bigText(u, y, size, plain, spans, depth = '#1c0b16') {
  const base = y + size * .36, sw = size * .085;
  return `<g transform="translate(154 ${base}) skewX(-10)">
    <text ${TXT} y="${-size * .02}" font-size="${size}" fill="#fff" opacity=".45" filter="url(#bl${u})">${plain}</text>
    ${[7, 5.5, 4, 2.5].map(d => `<text ${TXT} y="${d}" x="${d * .35}" font-size="${size}" fill="${depth}" stroke="${depth}" stroke-width="${sw}">${plain}</text>`).join('')}
    <text ${TXT} font-size="${size}" stroke="#120a1c" stroke-width="${sw}" paint-order="stroke">${spans}</text></g>`;
}
// pojedynczy znak z wytłoczeniem (do układu 1 VS 1)
function glyph(u, x, base, size, ch, fill, depth = '#1c0b16') {
  const sw = size * .085;
  return `<g transform="translate(${x} ${base}) skewX(-10)">
    <text ${TXT} y="${-size * .02}" font-size="${size}" fill="#fff" opacity=".4" filter="url(#bl${u})">${ch}</text>
    ${[8, 6, 4, 2].map(d => `<text ${TXT} y="${d}" x="${d * .35}" font-size="${size}" fill="${depth}" stroke="${depth}" stroke-width="${sw}">${ch}</text>`).join('')}
    <text ${TXT} font-size="${size}" stroke="#120a1c" stroke-width="${sw}" paint-order="stroke" fill="${fill}">${ch}</text></g>`;
}
const finish = u => `<rect width="320" height="200" fill="url(#vg${u})"/><rect width="320" height="200" filter="url(#gr${u})"/>`;
const halftone = u => `<rect width="320" height="200" fill="url(#ht${u})" opacity=".14" mask="url(#mk${u})"/>`;
const stripes = (n, op) => `<g stroke="#fff" stroke-opacity="${op}" stroke-width="2">${Array.from({ length: n }, (_, i) => `<line x1="${-60 + i * 22}" y1="200" x2="${i * 22}" y2="0"/>`).join('')}</g>`;
// poszarpana krawędź w zygzaku (błyskawica / rozdarty papier) od (x0,0) do (x1,200)
function tear(u, x0, x1) {
  let seed = 97 * u + 13; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const C = [], Lp = [], Rp = [], N = 14;
  for (let i = 0; i <= N; i++) {
    const t = i / N, y = t * 200, bx = x0 + (x1 - x0) * t, z = (i % 2 ? 1 : -1) * (5 + r() * 9) * (i && i < N ? 1 : 0);
    C.push([bx + z, y]);
    for (let k = 0; k < 2; k++) {                       // drobne włókna papieru między punktami zygzaka
      const yy = y + (k ? 200 / N * .5 : 0); if (yy > 200) continue;
      Lp.push([bx + z - (3 + r() * 4), yy]); Rp.push([bx + z + (3 + r() * 5), yy]);
    }
  }
  const pts = a => a.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  return { red: `0,0 ${pts(C)} 0,200`, blue: `320,0 ${pts(C)} 320,200`, paper: `${pts(Lp)} ${pts(Rp.slice().reverse())}` };
}
const ART = {
  range() {
    const u = ++artN;
    return `<svg class="art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice"><defs>${DEFS(u)}
      <linearGradient id="bg${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffa53a"/><stop offset=".5" stop-color="#e2461f"/><stop offset="1" stop-color="#5e0c10"/></linearGradient></defs>
      <rect width="320" height="200" fill="url(#bg${u})"/>${stripes(18, .06)}${halftone(u)}
      <g fill="none" stroke="#fff" stroke-opacity=".14"><circle cx="160" cy="100" r="128" stroke-width="18"/><circle cx="160" cy="100" r="88" stroke-width="15"/><circle cx="160" cy="100" r="50" stroke-width="12"/></g>
      <g stroke="#fff" stroke-opacity=".22" stroke-width="2"><line x1="160" y1="0" x2="160" y2="200"/><line x1="0" y1="100" x2="320" y2="100"/></g>
      <rect width="320" height="200" fill="url(#hl${u})"/>
      ${bigText(u, 100, 62, 'STRZELNICA', '<tspan fill="url(#slv' + u + ')">STRZELNICA</tspan>', '#4a0d0a')}
      ${finish(u)}</svg>`;
  },
  duel() {
    // niebieski | biała błyskawica | czerwony; duże jedynki, mniejsze złote VS, wszystko na środku
    const u = ++artN;
    // błyskawica / _ / : stroma, zygzak na środku za VS
    const boltPts = [[166, -4], [184, -4], [160, 93], [186, 93], [176, 204], [158, 204], [170, 107], [144, 107]];
    const P = a => a.map(q => q.join(',')).join(' ');
    const bolt = P(boltPts);
    return `<svg class="art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice"><defs>${DEFS(u)}
      <linearGradient id="bu${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#21b0f2"/><stop offset="1" stop-color="#0577c4"/></linearGradient>
      <linearGradient id="rd${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3a3a"/><stop offset="1" stop-color="#c8101c"/></linearGradient>
      <linearGradient id="wb${u}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#eef2f8"/><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe6ef"/></linearGradient></defs>
      <rect width="320" height="200" fill="url(#rd${u})"/>
      <polygon points="-4,-4 166,-4 144,107 170,107 158,204 -4,204" fill="url(#bu${u})"/>
      ${stripes(18, .06)}<rect width="320" height="200" fill="url(#hl${u})"/>
      <polygon points="${bolt}" fill="#fff" opacity=".55" filter="url(#bl${u})"/>
      <polygon points="${bolt}" fill="#000" opacity=".3" transform="translate(3 2)"/>
      <polygon points="${bolt}" fill="url(#wb${u})" stroke="#fff" stroke-width="1" stroke-linejoin="miter"/>
      ${glyph(u, 94, 136, 100, '1', `url(#slv${u})`, '#0a2a66')}${glyph(u, 232, 136, 100, '1', `url(#slv${u})`, '#5a0712')}
      ${glyph(u, 162, 131, 86, 'VS', `url(#gold${u})`, '#3a1a04')}
      ${finish(u)}</svg>`;
  },
  soon() {
    const u = ++artN;
    return `<svg class="art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice"><defs>${DEFS(u)}
      <radialGradient id="bg${u}" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="#3a5394"/><stop offset=".6" stop-color="#18234a"/><stop offset="1" stop-color="#080d22"/></radialGradient></defs>
      <rect width="320" height="200" fill="url(#bg${u})"/>${stripes(18, .05)}${halftone(u)}
      ${bigText(u, 100, 50, 'COMING SOON...', '<tspan fill="#d6e1f7">COMING SOON...</tspan>', '#070b1c')}
      ${finish(u)}</svg>`;
  },
};
export const SKINS = [
  { id: 'klasyk', name: 'Klasyczna', c: 0xf0b440 },
  { id: 'kamuflaz', name: 'Kamuflaż', c: 0x5a6438, c2: 0x7f7548, c3: 0x2f3524, p: 1, tag: 'WOJSKO' },
  { id: 'pustynia', name: 'Pustynia', c: 0xc9b07a, c2: 0x9c7e4f, c3: 0x6e5a3a, p: 1, tag: 'WOJSKO' },
  { id: 'arbuz', name: 'Arbuz', c: 0x3f9a3a, c2: 0x1f5e22, p: 2 },
  { id: 'truskawka', name: 'Truskawka', c: 0xe0343a, c2: 0xffe66b, p: 3 },
  { id: 'jagoda', name: 'Jagoda', c: 0x4f5fd6 },
  { id: 'mieta', name: 'Mięta', c: 0x7fe0c0 },
  { id: 'wegiel', name: 'Węgiel', c: 0x34363b },
  { id: 'lawa', name: 'Lawa', c: 0x2a1c18, c2: 0xff6a1a, p: 5, tag: 'RZADKI' },
  { id: 'zlota', name: 'Złota', c: 0xffc23a, metal: true, tag: 'LEGENDA' },
  { id: 'teczowa', name: 'Tęczowa', c: 0xffffff, p: 4, tag: 'RZADKI' },
  { id: 'arktyka', name: 'Arktyka', c: 0xe8eef2, c2: 0xb9c7d2, c3: 0x8a9aa8, p: 1, tag: 'WOJSKO' },
];
const SKIN_GLSL = `uniform float uPat,uRim;uniform vec3 uC2,uC3,uRimC;varying vec3 vObj;
  float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float vn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
// Nakłada skin na materiał skóry fasolki (kolor + wzór + metal). Działa też na postaci w grze.
export function applySkin(mat, skin) {
  if (!mat.userData.skinU) {
    const U = { uPat: { value: 0 }, uC2: { value: new THREE.Color() }, uC3: { value: new THREE.Color() }, uRim: { value: 0 }, uRimC: { value: new THREE.Color(0xfff0a8) } };
    mat.userData.skinU = U;
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vObj;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
      sh.fragmentShader = SKIN_GLSL + '\n' + sh.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
          float lavaGlow = 0.; vec3 P = vObj;
          if (uPat > .5 && uPat < 1.5) { float n = vn(P * 4.2) * .65 + vn(P * 9.) * .35; diffuseColor.rgb = n < .43 ? diffuseColor.rgb : (n < .58 ? uC2 : uC3); }
          else if (uPat > 1.5 && uPat < 2.5) { float a = atan(P.z, P.x); float st = step(.5, fract(a * 1.6 + vn(P * 7.) * .18)); diffuseColor.rgb = mix(diffuseColor.rgb, uC2, st); }
          else if (uPat > 2.5 && uPat < 3.5) { vec3 q = P * 15.; float d = length(fract(q) - .5); diffuseColor.rgb = mix(diffuseColor.rgb, uC2, step(d, .17) * step(.55, h3(floor(q)))); }
          else if (uPat > 3.5 && uPat < 4.5) { diffuseColor.rgb = .55 + .45 * cos(6.2832 * (P.y * 1.1 + vec3(0., .33, .67))); }
          else if (uPat > 4.5) { float n = vn(P * 6.5) * .7 + vn(P * 13.) * .3; lavaGlow = 1. - smoothstep(.0, .07, abs(n - .5)); diffuseColor.rgb = mix(diffuseColor.rgb, uC2, lavaGlow); }`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance += uC2 * lavaGlow * 2.2;
          float rimK = 1. - abs(dot(normalize(normal), normalize(vViewPosition)));
          totalEmissiveRadiance += uRimC * pow(rimK, 2.6) * uRim * 1.2 + uRimC * uRim * .02;
          if (uPat < -.5) totalEmissiveRadiance += diffuseColor.rgb * (.18 + .5 * pow(rimK, 3.));`);
    };
    mat.customProgramCacheKey = () => 'fasolka-skin';
    mat.needsUpdate = true;
  }
  const U = mat.userData.skinU, P = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
  mat.color.set(skin.c); U.uPat.value = skin.metal ? -1 : (P[skin.p] || 0); U.uC2.value.set(skin.c2 ?? skin.c); U.uC3.value.set(skin.c3 ?? skin.c);
  mat.metalness = skin.metal ? .35 : 0; mat.roughness = skin.metal ? .3 : .55;
}
// ikona fasolki do kafelka (SVG z kolorem/wzorem)
function skinIcon(sk) {
  const hex = c => '#' + new THREE.Color(c).getHexString(), c1 = hex(sk.c), c2 = hex(sk.c2 ?? sk.c), c3 = hex(sk.c3 ?? sk.c), id = 'sk' + sk.id;
  let fill = c1, defs = '';
  if (sk.p === 1) { defs = `<pattern id="${id}" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="${c1}"/><path d="M2 4c6-3 9 2 7 6s-7 3-8 0z" fill="${c2}"/><path d="M14 13c5-2 9 1 8 5s-6 4-9 1z" fill="${c3}"/><path d="M12 1c3 0 4 3 2 4s-4 0-2-4z" fill="${c3}"/><path d="M1 16c3-1 5 2 3 4s-4 0-3-4z" fill="${c2}"/></pattern>`; fill = `url(#${id})`; }
  if (sk.p === 2) { defs = `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${c1}"/><rect width="4" height="10" fill="${c2}"/></pattern>`; fill = `url(#${id})`; }
  if (sk.p === 3) { defs = `<pattern id="${id}" width="8" height="9" patternUnits="userSpaceOnUse"><rect width="8" height="9" fill="${c1}"/><ellipse cx="3" cy="3" rx="1" ry="1.4" fill="${c2}"/><ellipse cx="7" cy="7.5" rx="1" ry="1.4" fill="${c2}"/></pattern>`; fill = `url(#${id})`; }
  if (sk.p === 4) { defs = `<linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff5a5a"/><stop offset=".25" stop-color="#ffc83a"/><stop offset=".5" stop-color="#5fe36a"/><stop offset=".75" stop-color="#4aa3ff"/><stop offset="1" stop-color="#b56cff"/></linearGradient>`; fill = `url(#${id})`; }
  if (sk.p === 5) { defs = `<pattern id="${id}" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="${c1}"/><path d="M0 6l6 2 4-5 5 4 5-2M3 20l3-7 6 1 3-5 5 3" stroke="${c2}" stroke-width="1.6" fill="none"/></pattern>`; fill = `url(#${id})`; }
  if (sk.metal) { defs = `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c0"/><stop offset=".45" stop-color="#ffc23a"/><stop offset="1" stop-color="#a86d0e"/></linearGradient>`; fill = `url(#${id})`; }
  return `<svg viewBox="0 0 44 58"><defs>${defs}</defs><rect x="15" y="40" width="5" height="15" rx="2.5" fill="${fill}"/><rect x="24" y="40" width="5" height="15" rx="2.5" fill="${fill}"/>
    <rect x="8" y="3" width="28" height="44" rx="14" fill="${fill}" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/><ellipse cx="16" cy="13" rx="3.5" ry="5" fill="#fff" opacity=".35"/></svg>`;
}
const DEFAULT_MODES = [
  { id: 'range', name: 'Strzelnica', desc: 'Solo · zestrzel czerwone fasolki', icon: 'range', tag: 'SOLO' },
  { id: '1v1', name: '1v1', desc: 'Mapa Oaza · bot · do 5 trafień', icon: 'duel', tag: '1 NA 1' },
  { soon: true },
];

// deterministyczny generator losowy, żeby las wyglądał zawsze tak samo
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

export function createLobby({ renderer, bean, animate = () => {}, onPlay = () => {}, onSkin = () => {}, modes = DEFAULT_MODES, skins = SKINS }) {
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
    t.innerHTML = (ART[icon] ? ART[icon]() : '') + '<i class="tag"></i><i class="check">✓</i>';
    t.querySelector('.tag').textContent = m.soon ? 'WKRÓTCE' : (m.tag || 'TRYB');
    if (m.soon) { t.disabled = true; t.setAttribute('aria-label', 'Coming soon');  }
    else {
      t.dataset.id = m.id; t.setAttribute('aria-label', m.name + ' – ' + m.desc); t.title = m.desc;
      t.addEventListener('click', () => { mode = m; store.set('fasolka-mode', m.id); renderMode(); });
      t.addEventListener('dblclick', () => closePicker());
    }
    tiles.appendChild(t);
  });
  const openPicker = () => { picker.hidden = false; hover = false; };
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
  const HORIZON = new THREE.Color(0xf4a46e);                        // zachód słońca: ciepły horyzont
  scene.fog = new THREE.FogExp2(HORIZON, 0.0105);   // lekka mgła: przy postaci niewidoczna, gęstnieje z odległością
  const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 1200);

  // niebo: gradient na kuli
  const skyU = { top: { value: new THREE.Color(0x2b2f6b) }, mid: { value: new THREE.Color(0xc8657c) }, bot: { value: HORIZON } };
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
  const SUN_DIR = new THREE.Vector3(-.55, .32, -.77).normalize();   // nisko, z lewej za wioską
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
  sunSprite.position.set(-150, 58, -430); sunSprite.scale.setScalar(240); sunSprite.material.color.set(0xffc078); scene.add(sunSprite);

  // światła
  scene.add(new THREE.HemisphereLight(0xffb898, 0x3d3324, 1.15));
  const sun = new THREE.DirectionalLight(0xff9a52, 2.9);
  sun.target.position.set(0, 0, -10); sun.position.copy(SUN_DIR).multiplyScalar(32).add(sun.target.position); sun.castShadow = true;   // cień obejmuje też wioskę
  const fillL = new THREE.DirectionalLight(0x9aa6d8, 1.05); fillL.position.set(4, 6, 10); scene.add(fillL);   // chłodne doświetlenie od kamery
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 60 });
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
  const mountMat = hazeMat(0x5b4a6c, .8, 40);
  const snowMat = hazeMat(0xffcfc0, .82, 40);
  for (let i = 0; i < 12; i++) {
    const h = R(28, 52), r = h * R(1.3, 1.8), g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), mountMat); m.position.y = h / 2; g.add(m);
    const s = new THREE.Mesh(new THREE.ConeGeometry(r * .26, h * .26, 9), snowMat); s.position.y = h * .87 + .1; g.add(s);
    g.position.set(-330 + i * 60 + R(-20, 20), -6, R(-300, -250)); g.rotation.y = R(0, 6); scene.add(g);
  }
  // dalekie pasmo: ogromne, ledwo widoczne zza mgły
  const farMat = hazeMat(0x6a4f72, .3, 120), farSnow = hazeMat(0xffd8c8, .22, 120);
  for (let i = 0; i < 16; i++) {
    const h = R2(80, 150), r = h * R2(1.4, 2.1), g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), farMat); m.position.y = h / 2; g.add(m);
    const sn = new THREE.Mesh(new THREE.ConeGeometry(r * .22, h * .22, 10), farSnow); sn.position.y = h * .89 + .2; g.add(sn);
    g.position.set(-800 + i * 105 + R2(-30, 30), -10, R2(-640, -540)); g.rotation.y = R2(0, 6); scene.add(g);
  }

  // chmury
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffc9a8, emissive: 0xa0506a, emissiveIntensity: .55, roughness: 1, fog: false });
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

  // ---------- wioska ~20 m za graczem ----------
  const village = buildVillage(scene, heightAt);
  const battle = buildBattlefield(scene, heightAt);
  village.zones.push(...battle.zones);   // drzewa omijają też okopy, czołgi i leje

  // ---------- las: gęsty, zwarty, z nieregularnymi koronami (instancje, kołysanie na wietrze) ----------
  const hash3 = (x, y, z) => { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return v - Math.floor(v); };
  const jitter = (g, amt, seed) => { const p = g.attributes.position;                 // te same punkty przesuwają się tak samo (brak dziur)
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = o => hash3(x * 3.1 + o + seed, y * 3.7 + o, z * 2.9) - .5;
      p.setXYZ(i, x + n(1) * amt, y + n(5) * amt * .6, z + n(9) * amt); } return g; };
  const paint = (g, fn) => { const p = g.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color();
    for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), col); c.set([col.r, col.g, col.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; };
  const prep = g => { g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv'); return g; };
  const TRUNK = new THREE.Color(0x6b4426), tmpC = new THREE.Color();
  const trunkPart = (h, r0, r1) => { const g = new THREE.CylinderGeometry(r1, r0, h, 7); g.translate(0, h / 2, 0); return paint(prep(jitter(g, .04, 3)), (x, y, z, c) => c.copy(TRUNK).multiplyScalar(.75 + .25 * y / h)); };
  function pineGeo(layers, h, r0, seed, dark, light) {
    const parts = [trunkPart(1.5, .27, .16)], D = new THREE.Color(dark), L = new THREE.Color(light);
    for (let k = 0; k < layers; k++) {
      const t = k / (layers - 1), r = r0 * (1 - .74 * t), ch = 2.1 - .7 * t, y0 = .55 + t * (h - .55 - ch);
      const g = new THREE.ConeGeometry(r, ch, 10, 2); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) < -ch / 2 + .01) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, p.getY(i) - (Math.round(a / (Math.PI / 5)) % 2 ? .28 : 0) * r / r0); }   // poszarpany, opadający brzeg
      g.translate(0, y0 + ch / 2, 0); jitter(g, .22 * r / r0 + .08, seed + k);
      parts.push(paint(prep(g), (x, y, z, c) => { c.lerpColors(D, L, Math.min(1, y / h * .9 + .1)); const edge = Math.hypot(x, z) / r; c.multiplyScalar(.8 + .3 * edge); }));
    }
    return mergeGeometries(parts);
  }
  function leafGeo(blobs, trunkH, seed, base) {
    const parts = [trunkPart(trunkH, .28, .17)], B = new THREE.Color(base);
    for (const [x, y, z, r] of blobs) {
      const g = new THREE.IcosahedronGeometry(r, 1); g.translate(x, y, z); jitter(g, .32 * r, seed + x * 7);
      const tint = .85 + hash3(x, y, z) * .3;
      parts.push(paint(prep(g), (px, py, pz, c) => { c.copy(B).multiplyScalar(tint * (.62 + .5 * THREE.MathUtils.clamp((py - y + r) / (2 * r), 0, 1))); }));
    }
    return mergeGeometries(parts);
  }
  const TREES = [
    pineGeo(5, 6.4, 1.75, 11, 0x1d5a2a, 0x46a04c),                  // świerk
    pineGeo(4, 5.4, 1.95, 23, 0x235f2c, 0x52a650),                  // jodła, szersza
    leafGeo([[0, 3.3, 0, 1.6], [1.05, 2.8, .3, 1.15], [-.95, 2.95, -.4, 1.2], [.2, 4.1, -.45, 1.05], [-.35, 2.55, .95, 1.0], [.65, 3.75, .85, .95]], 2.3, 31, 0x5fae3c),
    leafGeo([[0, 3.9, 0, 1.35], [.7, 3.2, .4, 1.05], [-.7, 3.4, -.3, 1.05], [.1, 4.9, .1, 1.0], [-.2, 2.8, -.8, .9], [.4, 2.7, .9, .85]], 2.6, 47, 0x4f9e34),
    leafGeo([[0, .55, 0, .75], [.6, .45, .25, .55], [-.55, .5, -.2, .6], [.1, .9, -.35, .5]], .1, 59, 0x4c9a32),   // krzak podszytu
  ];
  const wind = { value: 0 };
  const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .95 });
  treeMat.onBeforeCompile = sh => {
    sh.uniforms.uTime = wind;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 wp = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      #else
        vec3 wp = vec3(0.0);
      #endif
      float hh = max(position.y - 1.2, 0.0);
      transformed.x += sin(uTime * 1.3 + wp.x * .17 + wp.z * .11) * .022 * hh;
      transformed.z += cos(uTime * 1.05 + wp.z * .13 + wp.x * .07) * .016 * hh;`);
  };
  // granica lasu: z tyłu dalej (żeby było widać niebo i góry), po bokach bliżej (rama kadru), nieregularna
  const edgeR = th => 24 + 26 * Math.pow(Math.max(0, Math.cos(th)), 1.5) + 4 * Math.sin(th * 5 + 1.3) + 2.5 * Math.sin(th * 11 + .4);
  const lists = TREES.map(() => ({ near: [], far: [] }));
  const put = (type, x, z, sc, near) => village.zones.some(v => Math.hypot(x - v.x, z - v.z) < v.r) ? 0 : lists[type][near ? 'near' : 'far'].push({ x, z, y: heightAt(x, z) - .1, s: sc, ry: rnd() * 6.28, sx: R(.88, 1.12), sy: R(.9, 1.12) });
  const plant = (x, z, d, e) => {
    const nearEdge = d < e + 6, pine = rnd() < (nearEdge ? .48 : .66);
    const type = pine ? (rnd() < .6 ? 0 : 1) : (rnd() < .55 ? 2 : 3);
    put(type, x, z, pine ? R(.88, 1.22) : R(.85, 1.2), d < 24);
  };
  for (const [step, dmin, dmax, prob] of [[3.4, 0, 70, .62], [4.2, 70, 160, .78]]) {
    for (let gx = -150; gx <= 150; gx += step) for (let gz = -160; gz <= 6; gz += step) {
      const x = gx + R(-.45, .45) * step, z = gz + R(-.45, .45) * step, d = Math.hypot(x, z), th = Math.atan2(x, -z), e = edgeR(th);
      if (d < Math.max(e, dmin) || d >= dmax) continue;
      const clump = Math.sin(x * .085 + 1.7) * Math.cos(z * .075 - .6) * .5 + .5 + (Math.sin(x * .23 - z * .19) * .25);   // kępy i prześwity
      if (rnd() > prob * THREE.MathUtils.clamp(clump * 1.5 - .15, .08, 1.3)) continue;
      plant(x, z, d, e);
    }
  }
  for (let i = 0; i < 90; i++) {                                           // trochę podszytu przy skraju lasu
    const th = R(-2.3, 2.3), r = edgeR(th) + R(-1, 3), x = Math.sin(th) * r, z = -Math.cos(th) * r;
    if (z > 6) continue; put(4, x, z, R(.8, 1.5), r < 22);
  }
  // pojedyncze drzewa i małe kępy na łące w różnych odległościach – dają głębię
  [[-10.5, -5.5, 2], [11.5, -7, 0], [-16, -1.5, 1], [17, -3, 3],
   [-16.5, -13.5, 0], [-15.6, -25, 3], [17.5, -25, 2], [18.6, -21.5, 0], [-21, -30, 1], [-10, -31, 2], [9, -33, 0], [22, -34, 3], [-26, -15, 0], [27, -14, 2]]
    .forEach(([x, z, t]) => put(t, x, z, R(.95, 1.2), Math.hypot(x, z) < 24));
  const dummy = new THREE.Object3D(), tint = new THREE.Color();
  lists.forEach((L, type) => { for (const [arr, cast] of [[L.near, true], [L.far, false]]) {
    if (!arr.length) continue;
    const m = new THREE.InstancedMesh(TREES[type], treeMat, arr.length);
    arr.forEach((t, i) => { dummy.position.set(t.x, t.y, t.z); dummy.rotation.set(0, t.ry, 0); dummy.scale.set(t.s * t.sx, t.s * t.sy, t.s * t.sx); dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, tint.setRGB(R(.84, 1.06), R(.88, 1.08), R(.8, 1.0))); });
    m.castShadow = cast; m.receiveShadow = true; scene.add(m);
  } });
  // ciemniejsza ściółka pod drzewami
  { const p = groundGeo.attributes.position, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z), k = 1 - .38 * THREE.MathUtils.smoothstep(d, edgeR(Math.atan2(x, -z)) - 1, edgeR(Math.atan2(x, -z)) + 7);
      c.set([k, k * .97 + .03 * (1 - k), k], i * 3); }
    groundGeo.setAttribute('color', new THREE.BufferAttribute(c, 3)); ground.material.vertexColors = true; ground.material.needsUpdate = true; }
  const leafMats = [0x5fae3c, 0x4f9e34, 0x78c043, 0x8acb4c].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }));
  const blobGeo = new THREE.IcosahedronGeometry(1, 1);

  // krzaki, kamienie
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x9aa3a8, roughness: 1, flatShading: true });
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  [[-2.8, -2.2, .32], [3.4, -2.8, .45], [2.3, 1.0, .18], [-3.9, .3, .24], [7.4, -8.2, .7]].forEach(([x, z, s]) => {
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

  // świecące koło pod fasolką (pulsuje po najechaniu)
  const ringTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const g = x.createRadialGradient(128, 128, 60, 128, 128, 128); g.addColorStop(0, 'rgba(255,225,120,0)'); g.addColorStop(.72, 'rgba(255,215,90,.18)'); g.addColorStop(.86, 'rgba(255,230,140,.95)');
    g.addColorStop(.92, 'rgba(255,200,70,.55)'); g.addColorStop(1, 'rgba(255,190,60,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(255,240,180,.75)'; x.lineWidth = 5; for (let i = 0; i < 12; i++) { x.beginPath(); x.arc(128, 128, 96, i * Math.PI / 6, i * Math.PI / 6 + .32); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const ringM = new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .75, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), ringM); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; scene.add(ring);
  const discM = new THREE.MeshBasicMaterial({ color: 0x1a1408, transparent: true, opacity: .28, depthWrite: false });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(.92, 40), discM); disc.rotation.x = -Math.PI / 2; disc.position.y = .02; scene.add(disc);

  // fasolka
  const holder = new THREE.Group(); holder.add(bean); scene.add(holder);
  const hitProxy = new THREE.Mesh(new THREE.CylinderGeometry(.48, .48, 1.75, 10), new THREE.MeshBasicMaterial({ visible: false })); hitProxy.position.y = .87; holder.add(hitProxy);
  const skinMats = [];                                   // materiały skóry fasolki (z gry: userData.mats.skin, inaczej wszystkie)
  if (bean.userData.mats && bean.userData.mats.skin) skinMats.push(bean.userData.mats.skin);
  else bean.traverse(o => { if (o.isMesh && o.material && !skinMats.includes(o.material)) skinMats.push(o.material); });
  let skin = skins.find(k => k.id === store.get('fasolka-skin')) || skins[0];
  const setSkin = k => { skin = k; skinMats.forEach(m => applySkin(m, k)); store.set('fasolka-skin', k.id); onSkin(k);
    skinGrid.querySelectorAll('.lb-skin').forEach(b => b.classList.toggle('sel', b.dataset.id === k.id)); };
  const skinPanel = $('lb-skins'), skinGrid = $('lb-skin-grid');
  skins.forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'lb-skin'; b.dataset.id = k.id;
    b.innerHTML = skinIcon(k) + '<span></span><small></small>'; b.querySelector('span').textContent = k.name; b.querySelector('small').textContent = k.tag || '';
    b.addEventListener('click', () => { setSkin(k); hopT = 0; }); skinGrid.appendChild(b); });
  const openSkins = () => { skinPanel.hidden = false; picker.hidden = true; };
  const closeSkins = () => { skinPanel.hidden = true; };
  $('lb-skin-close').addEventListener('click', closeSkins);
  addEventListener('keydown', e => { if (e.key === 'Escape' && !skinPanel.hidden) { closeSkins(); e.stopPropagation(); } }, true);
  let hopT = -1;
  setSkin(skin);
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
  let beanHover = false, hoverK = 0, downX = 0, downY = 0, moved = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const overBean = e => { const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera); return ray.intersectObject(hitProxy, false).length > 0; };
  canvas.addEventListener('pointerdown', e => { if (!active) return; dragging = true; lastX = downX = e.clientX; downY = e.clientY; moved = 0; try { canvas.setPointerCapture(e.pointerId); } catch {} });
  addEventListener('pointermove', e => {
    mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1;
    if (!active) return;
    beanHover = e.target === canvas && overBean(e); ui.classList.toggle('bean-hover', beanHover); plate.classList.toggle('hov', beanHover);
    if (!dragging) return;
    moved = Math.max(moved, Math.hypot(e.clientX - downX, e.clientY - downY));
    const dx = e.clientX - lastX; lastX = e.clientX; rotVel = dx * .012; rotY += rotVel;
  });
  addEventListener('pointerup', e => { if (dragging && active && moved < 6 && e.target === canvas && overBean(e)) { openSkins(); hopT = 0; } dragging = false; });
  canvas.style.cursor = '';
  const syncCursor = () => { canvas.style.cursor = active && beanHover ? 'pointer' : ''; };

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
    hoverK = THREE.MathUtils.damp(hoverK, beanHover ? 1 : !skinPanel.hidden ? .35 : 0, 10, dt); syncCursor();
    skinMats.forEach(m => { if (m.userData.skinU) m.userData.skinU.uRim.value = hoverK * (.75 + .25 * Math.sin(t * 6)); });
    ring.rotation.z = t * .25; ring.scale.setScalar(1 + hoverK * (.1 + .04 * Math.sin(t * 6)));
    ringM.opacity = .55 + .45 * hoverK; disc.scale.setScalar(1 + hoverK * .08);
    if (hopT >= 0) { hopT += dt * 2.8; const k = Math.min(hopT, 1); holder.position.y = Math.sin(k * Math.PI) * .35; if (hopT >= 1) { hopT = -1; holder.position.y = 0; } }

    cmx = THREE.MathUtils.damp(cmx, mx, 2.5, dt); cmy = THREE.MathUtils.damp(cmy, my, 2.5, dt);
    camera.position.set(cmx * .35, .8 - cmy * .1, camZ);
    camera.lookAt(lookAt);

    wind.value = t; village.update(t, dt); battle.update(t, dt);
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
  function hide() { active = false; dragging = false; hover = false; beanHover = false; picker.hidden = true; skinPanel.hidden = true; canvas.style.cursor = ''; ui.classList.add('lb-hidden'); }

  return { scene, camera, update, show, hide, get active() { return active; }, get mode() { return mode.id; }, get skin() { return skin; }, ui };
}
