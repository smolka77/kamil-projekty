/* Ilustracje SVG generowane w kodzie: logo, ikony, opakowania produktów, miski z przepisów, miniatury wideo. Bez zewnętrznych grafik. */
(function(){
let uid=0; const nid=p=>p+(++uid);
function rnd(seed){let s=0;for(const c of String(seed))s=(s*31+c.charCodeAt(0))>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function shade(hex,amt){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const f=v=>Math.max(0,Math.min(255,Math.round(amt<0?v*(1+amt):v+(255-v)*amt)));return '#'+[f(r),f(g),f(b)].map(v=>v.toString(16).padStart(2,'0')).join('');}

/* LOGO – odtworzenie znaku: sześciokąt, okrężne strzałki, liść, kropla, kryształ i fala */
function logoMark(size=48){
  const c=nid('lc');
  return `<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="ProBazar" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="${c}"><circle cx="50" cy="50" r="30"/></clipPath>
  <linearGradient id="${c}d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F7A44A"/><stop offset="1" stop-color="#D9610E"/></linearGradient>
  <linearGradient id="${c}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5DB04F"/><stop offset="1" stop-color="#2E7432"/></linearGradient></defs>
  <path d="M50 4 90 27v46L50 96 10 73V27z" fill="#fff" stroke="#17305E" stroke-width="5" stroke-linejoin="round"/>
  <path d="M50 11 83 30" stroke="#3C8D40" stroke-width="3" stroke-linecap="round"/><path d="M50 89 83 70" stroke="#E8731A" stroke-width="3" stroke-linecap="round"/>
  <circle cx="50" cy="50" r="34" fill="none" stroke="#17305E" stroke-width="4"/>
  <path d="M64 16.5l10 3-6 8z M36 83.5l-10-3 6-8z" fill="#17305E"/>
  <g clip-path="url(#${c})">
   <path d="M26 66C17 50 23 36 37 32c6 14 3 28-11 34z" fill="url(#${c}g)"/><path d="M27 63C30 52 33 44 37 36" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>
   <path d="M50 28S65 46 65 56a15 15 0 0 1-30 0C35 46 50 28 50 28z" fill="url(#${c}d)"/><ellipse cx="44" cy="54" rx="3" ry="6.5" fill="#fff" opacity=".45" transform="rotate(14 44 54)"/>
   <path d="M62 50l6-12 6 4 5-8 6 10v10H62z" fill="#8CC3E8" stroke="#2B7AB5" stroke-width="1.4" stroke-linejoin="round"/>
   <path d="M60 60q5-4 10 0t10 0t10 0v22H60z" fill="#2B7AB5"/><path d="M60 67q5-4 10 0t10 0t10 0" fill="none" stroke="#8CC3E8" stroke-width="1.6"/>
  </g></svg>`;
}
const ICONS={
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 cart:'<path d="M3 4h2.5l2.2 11h10.2l2-8H6.4"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>', close:'<path d="M6 6l12 12M18 6 6 18"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>',
 trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3"/>',
 heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.600-7 10-7 10z"/>',
 check:'<path d="m5 12.500 4.500 4.500L19 7.500"/>', chevron:'<path d="m9 6 6 6-6 6"/>', down:'<path d="m6 9 6 6 6-6"/>',
 truck:'<path d="M2 6h11v10H2zM13 10h4l3 3v3h-7"/><circle cx="6.500" cy="17.500" r="1.800"/><circle cx="16.500" cy="17.500" r="1.800"/>',
 shield:'<path d="M12 3 5 6v5.500c0 4.200 3 7.500 7 9.500 4-2 7-5.300 7-9.500V6z"/><path d="m9 12 2.200 2.200L15 10"/>',
 leaf:'<path d="M5 19C4 10 9 5 19 5c0 10-5 15-13 14z"/><path d="M5 19c3-5 6-8 10-10"/>',
 recycle:'<path d="M20 12a8 8 0 0 0-14-5.300M4 12a8 8 0 0 0 14 5.300"/><path d="M6 3v4h4M18 21v-4h-4"/>',
 play:'<path d="M8 5.500v13l11-6.500z" fill="currentColor"/>',
 clock:'<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>', users:'<circle cx="9" cy="8.500" r="3.500"/><path d="M2.500 20c.5-4 3-6 6.500-6s6 2 6.500 6M16 5.500a3.500 3.500 0 0 1 0 6.500M18 14.500c2 .8 3.200 2.600 3.500 5.500"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.500 7 8.500 6.500L20.500 7"/>', phone:'<path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
 pin:'<path d="M12 21s7-6 7-11.500a7 7 0 0 0-14 0C5 15 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.500"/>',
 filter:'<path d="M4 6h16M7 12h10M10 18h4"/>', star:'<path d="m12 3.500 2.600 5.500 6 .8-4.400 4.200 1.100 6-5.300-2.900-5.300 2.900 1.100-6L3.400 9.800l6-.8z" fill="currentColor"/>',
 book:'<path d="M4 5.500C7 4 10 4.300 12 6c2-1.700 5-2 8-.5V19c-3-1.500-6-1.200-8 .5-2-1.700-5-2-8-.5z"/><path d="M12 6v13.500"/>',
 flame:'<path d="M12 21c4 0 6.500-2.800 6.500-6.200 0-3.800-3-5.300-3.500-9.300-3 1.800-4 4.300-4 6.500-1-.5-1.700-1.500-1.800-3C7.300 10 5.500 12 5.500 14.800 5.500 18.200 8 21 12 21z"/>',
 chef:'<path d="M7 14V19h10v-5M7 14a4 4 0 1 1 1-7.800A4 4 0 0 1 16 6.200 4 4 0 1 1 17 14z"/>',
 gift:'<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M12 9v11M3 9h18M12 9C9 9 8 4 11 4c2 0 1 5 1 5zm0 0c3 0 4-5 1-5-2 0-1 5-1 5z"/>'
};
function icon(n,s=22,cls=''){return `<svg class="ic ${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]||''}</svg>`;}

/* motywy (orzech, nasiono, kropla, ziarno, liść, jagoda, miód) */
function motif(k,x,y,col,rot=0,s=1){
  const t=`transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"`;
  switch(k){
   case 'nut': return `<g ${t}><ellipse rx="9" ry="6.500" fill="${col}"/><path d="M-6 0q6-3 12 0" stroke="${shade(col,-.3)}" stroke-width="1.200" fill="none"/></g>`;
   case 'seed': return `<g ${t}><path d="M-7 0q7-7 14 0-7 7-14 0z" fill="${col}"/><path d="M-4 0h8" stroke="${shade(col,.45)}" stroke-width="1"/></g>`;
   case 'drop': return `<g ${t}><path d="M0-9q8 9 8 14a8 8 0 0 1-16 0q0-5 8-14z" fill="${col}"/><ellipse cx="-3" cy="3" rx="1.600" ry="3.500" fill="#fff" opacity=".5"/></g>`;
   case 'grain': return `<g ${t}><ellipse rx="3.500" ry="6" fill="${col}"/><path d="M0-5v10" stroke="${shade(col,-.25)}" stroke-width=".8"/></g>`;
   case 'leaf': return `<g ${t}><path d="M-11 0Q0-13 11 0 0 13-11 0z" fill="${col}"/><path d="M-11 0H9" stroke="${shade(col,.5)}" stroke-width="1.200"/></g>`;
   case 'berry': return `<g ${t}><circle r="6.500" fill="${col}"/><circle cx="-2" cy="-2" r="1.800" fill="#fff" opacity=".45"/></g>`;
   case 'honey': return `<g ${t}><path d="M-6-3.500h12l3.500 3.500-3.500 3.500h-12l-3.500-3.500z" fill="${col}"/></g>`;
  } return '';
}
function scatter(k,col,n,seed,y0,y1,x0=24,x1=176){const r=rnd(seed);let o='';for(let i=0;i<n;i++)o+=motif(k,x0+r()*(x1-x0),y0+r()*(y1-y0),i%3?col:shade(col,.25),r()*180,.8+r()*.5);return o;}

/* OPAKOWANIA PRODUKTÓW (viewBox 200x200) */
function label(x,y,w,h,txt,col){
  const t=txt.length>16?txt.slice(0,15)+'…':txt;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#fffdf8"/>
  <path d="M${x+w/2} ${y+7}l5 2.9v5.8l-5 2.9-5-2.9v-5.8z" fill="#fff" stroke="#17305E" stroke-width="1.200"/><circle cx="${x+w/2-1.500}" cy="${y+13}" r="1.600" fill="#3C8D40"/><circle cx="${x+w/2+1.500}" cy="${y+13.500}" r="1.600" fill="${col}"/>
  <text x="${x+w/2}" y="${y+h-11}" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="${t.length>13?7.6:t.length>9?9:11}" fill="#17305E">${t}</text>
  <rect x="${x+w/2-9}" y="${y+h-6}" width="18" height="2" rx="1" fill="${col}"/>`;
}
function packaging(p){
  const c=p.col, d=shade(c,-.25), l=shade(c,.35), tx=p.short;
  switch(p.pack){
   case 'bottle': return `<rect x="88" y="26" width="24" height="14" rx="3" fill="#17305E"/><path d="M90 40h20v22c0 8 22 12 22 34v66a8 8 0 0 1-8 8H76a8 8 0 0 1-8-8V96c0-22 22-26 22-34z" fill="${c}"/><path d="M76 98c0-10 5-14 10-20" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".4" fill="none"/>${label(76,108,48,50,tx,'#17305E').replace('#fffdf8','#fffdf8')}`;
   case 'jar': return `<rect x="66" y="40" width="68" height="20" rx="6" fill="#17305E"/><rect x="62" y="56" width="76" height="10" rx="3" fill="${d}"/><rect x="58" y="64" width="84" height="104" rx="18" fill="${c}"/><rect x="58" y="64" width="84" height="104" rx="18" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/><path d="M68 78v52" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".4"/>${label(70,92,60,56,tx,'#17305E')}`;
   case 'tin': return `<rect x="62" y="38" width="76" height="12" rx="4" fill="${d}"/><rect x="58" y="48" width="84" height="120" rx="8" fill="${c}"/><rect x="58" y="48" width="84" height="10" fill="${d}" opacity=".5"/><path d="M68 66v82" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".3"/>${label(70,84,60,56,tx,'#17305E')}`;
   case 'box': return `<path d="M56 56l8-14h72l8 14z" fill="${d}"/><rect x="56" y="56" width="88" height="112" rx="5" fill="${c}"/><path d="M56 56h88v10H56z" fill="${d}" opacity=".55"/>${label(68,82,64,64,tx,'#17305E')}`;
   default: return `<path d="M58 36h84l6 8-4 6v108a14 14 0 0 1-14 14H70a14 14 0 0 1-14-14V50l-4-6z" fill="${c}"/><path d="M52 44l6 6h84l6-6" fill="none" stroke="${d}" stroke-width="3"/><path d="M60 54h80" stroke="${d}" stroke-width="2" stroke-dasharray="3 3"/><path d="M68 66v76" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".28"/>${label(68,88,64,62,tx,'#17305E')}`;
  }
}
function productArt(p,opts={}){
  const g=nid('pg');
  return `<svg class="art" viewBox="0 0 200 200" role="img" aria-label="${p.name} – ilustracja opakowania" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
  <defs><radialGradient id="${g}" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="${p.tint}" stop-opacity="0"/></radialGradient></defs>
  <rect width="200" height="200" fill="${p.tint}"/><circle cx="100" cy="92" r="86" fill="url(#${g})"/>
  <ellipse cx="100" cy="176" rx="60" ry="8" fill="#17305E" opacity=".12"/>
  ${scatter(p.motif,p.col,5,p.id,168,188,22,178)}
  ${packaging(p)}
  ${motif(p.motif,38,70,p.col,-20,1.100)}${motif(p.motif,166,58,shade(p.col,.2),30,.9)}${motif(p.motif,160,150,p.col,10,1)}</svg>`;
}
function categoryArt(c){
  return `<svg class="art" viewBox="0 0 200 200" role="img" aria-label="${c.name}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><rect width="200" height="200" fill="${c.tint}"/><circle cx="100" cy="100" r="62" fill="#fff" opacity=".6"/>${scatter(c.motif,c.col,9,c.id,50,150,50,150).replace(/scale\(([\d.]+)\)/g,(m,s)=>`scale(${(+s*1.8).toFixed(2)})`)}</svg>`;
}

/* MISKA/TALERZ Z PRZEPISU (widok z góry) */
function recipeArt(r){
  const R=rnd(r.id), g=nid('rg'); let top='';
  for(let i=0;i<46;i++){const a=R()*6.283,d=Math.sqrt(R())*68,x=200+Math.cos(a)*d,y=150+Math.sin(a)*d,c=r.tops[i%r.tops.length];
    top+=i%3==0?`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${5+R()*5}" ry="${3+R()*4}" fill="${c}" transform="rotate(${(R()*180)|0} ${x.toFixed(1)} ${y.toFixed(1)})"/>`:`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${2.5+R()*4.500}" fill="${c}"/>`;}
  let leaves='';for(let i=0;i<5;i++){leaves+=motif('leaf',(R()<.5?25+R()*70:310+R()*70),20+R()*260,'#4F9B3F',R()*180,1.500);}
  return `<svg class="art" viewBox="0 0 400 300" role="img" aria-label="${r.title} – ilustracja dania" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
  <defs><radialGradient id="${g}" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="${r.tint}" stop-opacity="0"/></radialGradient></defs>
  <rect width="400" height="300" fill="${r.tint}"/><rect width="400" height="300" fill="url(#${g})"/>
  <path d="M0 250Q120 220 400 262V300H0z" fill="#17305E" opacity=".05"/>${leaves}
  <ellipse cx="206" cy="162" rx="112" ry="108" fill="#17305E" opacity=".12"/>
  <circle cx="200" cy="150" r="108" fill="#fffdf8"/><circle cx="200" cy="150" r="96" fill="#f3ecdc"/><circle cx="200" cy="150" r="82" fill="${r.base}"/>
  <circle cx="200" cy="150" r="82" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="3"/>${top}
  <path d="M318 214l50 22" stroke="#C9B48A" stroke-width="7" stroke-linecap="round"/><ellipse cx="312" cy="210" rx="11" ry="7" fill="#D8C49C" transform="rotate(25 312 210)"/></svg>`;
}
function videoArt(v){
  const R=rnd(v.id);let s='';for(let i=0;i<9;i++)s+=`<circle cx="${R()*400}" cy="${R()*225}" r="${20+R()*60}" fill="#fff" opacity="${(.04+R()*.1).toFixed(2)}"/>`;
  return `<svg class="art" viewBox="0 0 400 225" role="img" aria-label="Miniatura filmu: ${v.title}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="${nid('vg')}x" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${v.a}"/><stop offset="1" stop-color="${v.b}"/></linearGradient></defs><rect width="400" height="225" fill="${v.b}"/><rect width="400" height="225" fill="${v.a}" opacity=".55"/>${s}${motif('leaf',60,175,'#fff',-30,3)}${motif('drop',340,50,'#fff',20,3)}</svg>`;
}
function avatar(size=120){
  return `<svg class="art" width="${size}" height="${size}" viewBox="0 0 120 120" role="img" aria-label="Monika – ilustracyjny portret" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#FDE6D0"/><circle cx="60" cy="52" r="22" fill="#F2C6A0"/><path d="M36 50c0-20 12-28 26-28s24 10 22 30c-4-8-8-12-24-12S40 42 36 50z" fill="#7A4B2A"/><path d="M18 120c2-26 18-38 42-38s40 12 42 38z" fill="#3C8D40"/><path d="M42 84l18 14 18-14" fill="#fff"/><circle cx="52" cy="54" r="2" fill="#17305E"/><circle cx="68" cy="54" r="2" fill="#17305E"/><path d="M53 63q7 5 14 0" stroke="#B5651D" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
}
PB.art={logoMark,icon,productArt,categoryArt,recipeArt,videoArt,avatar,shade};
})();
