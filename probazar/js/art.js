/* Logo SVG, ikony liniowe i pomocnicze funkcje zdjęć. */
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
function icon(n,s=22,cls=''){return `<svg class="ic ${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]||''}</svg>`;}

/* ZDJĘCIA – w motywie WP zastąpią je miniatury (the_post_thumbnail / woocommerce_get_product_thumbnail) */
function img(file,alt,w,h,eager){return `<img class="art" src="assets/img/${file}.webp" alt="${String(alt).replace(/"/g,'&quot;')}" width="${w}" height="${h}" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async">`;}
const productArt=(p,e)=>img('p-'+p.id,p.name,800,800,e);
const categoryArt=c=>img(c.img,c.name,800,800);
const recipeArt=(r,e)=>img('r-'+r.id,r.title,1200,900,e);
const videoArt=v=>img(v.id,'Kadr z filmu: '+v.title,960,540);
const avatar=()=>img('about','Dłonie mieszające warzywa na patelni – kuchnia Moniki',1000,1100);
PB.art={logoMark,icon,img,productArt,categoryArt,recipeArt,videoArt,avatar};
})();
