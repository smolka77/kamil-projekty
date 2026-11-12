const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const zl=n=>n.toLocaleString('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2})+' zł';
const q=k=>new URLSearchParams(location.search).get(k);
const cat=id=>CATS.find(c=>c.id===id);

/* ---------- ilustracje produktów (SVG) ---------- */
function art(t){
 const R='#e10600',G='#9aa0a8',D='#3a3d42',L='#d7dade',W='#fff';
 const sv=b=>`<svg viewBox="0 0 200 200" aria-hidden="true">${b}</svg>`;
 const A={
 radal:()=>sv(Array.from({length:9},(_,i)=>`<rect x="${30+i*15}" y="40" width="11" height="120" rx="5" fill="${W}" stroke="${G}" stroke-width="2"/>`).join('')+`<rect x="24" y="52" width="152" height="8" rx="4" fill="${L}"/><rect x="24" y="140" width="152" height="8" rx="4" fill="${L}"/>`),
 radst:()=>sv(`<rect x="22" y="50" width="156" height="100" rx="6" fill="${W}" stroke="${G}" stroke-width="2.5"/>`+Array.from({length:12},(_,i)=>`<rect x="${34+i*12}" y="58" width="6" height="84" rx="3" fill="${L}"/>`).join('')+`<circle cx="30" cy="156" r="4" fill="${G}"/><circle cx="170" cy="156" r="4" fill="${G}"/>`),
 boiler:()=>sv(`<rect x="52" y="60" width="96" height="108" rx="6" fill="${R}"/><rect x="62" y="74" width="76" height="46" rx="4" fill="${D}"/><circle cx="78" cy="146" r="7" fill="${W}"/><rect x="96" y="140" width="34" height="12" rx="3" fill="${W}"/><path d="M60 60l-14-30h46l-8 30z" fill="${D}"/><rect x="144" y="44" width="10" height="30" fill="${G}"/>`),
 pump:()=>sv(`<rect x="60" y="86" width="80" height="28" rx="4" fill="${G}"/><circle cx="100" cy="100" r="44" fill="${R}"/><circle cx="100" cy="100" r="30" fill="${D}"/><circle cx="100" cy="100" r="10" fill="${W}"/><rect x="40" y="92" width="26" height="16" fill="${L}"/><rect x="134" y="92" width="26" height="16" fill="${L}"/>`),
 pumpd:()=>sv(`<rect x="76" y="20" width="48" height="150" rx="14" fill="${G}"/><rect x="82" y="36" width="36" height="10" fill="${D}"/><rect x="82" y="56" width="36" height="10" fill="${D}"/><rect x="82" y="76" width="36" height="10" fill="${D}"/><rect x="92" y="170" width="16" height="16" fill="${R}"/><path d="M100 20v-10" stroke="${D}" stroke-width="5"/>`),
 heater:()=>sv(`<rect x="62" y="24" width="76" height="140" rx="22" fill="${W}" stroke="${G}" stroke-width="3"/><rect x="82" y="50" width="36" height="16" rx="3" fill="${D}"/><circle cx="100" cy="92" r="10" fill="${R}"/><rect x="74" y="164" width="14" height="16" fill="${G}"/><rect x="112" y="164" width="14" height="16" fill="${G}"/>`),
 faucet:()=>sv(`<path d="M60 130V70a30 30 0 0 1 60 0v14" fill="none" stroke="${G}" stroke-width="16" stroke-linecap="round"/><rect x="48" y="128" width="26" height="40" rx="6" fill="${L}"/><circle cx="50" cy="112" r="12" fill="${R}"/><circle cx="134" cy="112" r="12" fill="${D}"/><path d="M150 112H62" stroke="${G}" stroke-width="12"/>`),
 coll:()=>sv(`<rect x="24" y="86" width="152" height="28" rx="5" fill="#c79b56"/>`+Array.from({length:6},(_,i)=>`<rect x="${38+i*24}" y="54" width="14" height="34" fill="${G}"/><circle cx="${45+i*24}" cy="48" r="9" fill="${i%2?R:'#2b8a3e'}"/>`).join('')+`<rect x="30" y="114" width="12" height="30" fill="${G}"/>`),
 head:()=>sv(`<rect x="62" y="64" width="76" height="72" rx="12" fill="${W}" stroke="${G}" stroke-width="3"/><circle cx="100" cy="100" r="22" fill="${R}"/><rect x="86" y="94" width="28" height="12" rx="3" fill="${W}"/><rect x="40" y="90" width="28" height="20" fill="${L}"/>`),
 filter:()=>sv(`<rect x="62" y="40" width="76" height="110" rx="14" fill="${L}" stroke="${G}" stroke-width="3"/><rect x="46" y="64" width="20" height="22" fill="${G}"/><rect x="134" y="64" width="20" height="22" fill="${G}"/><rect x="72" y="150" width="56" height="16" rx="3" fill="${R}"/>`),
 saw:()=>sv(`<rect x="30" y="86" width="90" height="48" rx="12" fill="#f08a00"/><rect x="40" y="94" width="36" height="22" rx="6" fill="${D}"/><rect x="118" y="100" width="62" height="14" rx="3" fill="${G}"/><path d="M118 100h62" stroke="${D}" stroke-width="3" stroke-dasharray="3 4" transform="translate(0 14)"/>`),
 drill:()=>sv(`<path d="M30 84h96v38H80l-8 36H46l8-36H30z" fill="#0097a7"/><rect x="126" y="92" width="38" height="22" fill="${D}"/><rect x="164" y="100" width="22" height="6" fill="${G}"/><rect x="40" y="136" width="26" height="22" rx="3" fill="${D}"/>`),
 fit:()=>sv(`<path d="M30 74h46V50h28v24h48v38h-48v28H76v-28H30z" fill="#c8793a" stroke="#9a5a22" stroke-width="3"/><circle cx="100" cy="93" r="10" fill="#e2a06a"/>`),
 valve:()=>sv(`<rect x="30" y="94" width="140" height="22" rx="4" fill="#c8793a"/><circle cx="100" cy="105" r="26" fill="#d9a05b"/><rect x="94" y="50" width="12" height="30" fill="${G}"/><rect x="70" y="46" width="60" height="12" rx="6" fill="${R}"/>`),
 tube:()=>sv(Array.from({length:3},(_,i)=>`<rect x="26" y="${54+i*34}" width="148" height="22" rx="11" fill="#2f9e5e" stroke="#237a49" stroke-width="3"/>`).join('')),
 plug:()=>sv(`<rect x="28" y="76" width="144" height="48" rx="10" fill="${W}" stroke="${G}" stroke-width="3"/>`+Array.from({length:5},(_,i)=>`<circle cx="${52+i*24}" cy="100" r="8" fill="${D}"/>`).join('')+`<rect x="90" y="124" width="4" height="40" fill="${D}"/>`),
 bulb:()=>sv(`<circle cx="100" cy="80" r="40" fill="#ffe9a0" stroke="#e0b93a" stroke-width="3"/><rect x="82" y="116" width="36" height="12" fill="${G}"/><rect x="84" y="128" width="32" height="12" fill="${D}"/><path d="M100 50v22" stroke="#e0b93a" stroke-width="3"/>`),
 cart:()=>sv(`<path d="M70 30h44v30l22 14v90H48V74l22-14z" fill="${W}" stroke="${G}" stroke-width="3"/><rect x="60" y="94" width="80" height="44" rx="4" fill="${R}"/><text x="100" y="124" font-size="22" font-family="Oswald,Arial" fill="#fff" text-anchor="middle">SILIKON</text>`),
 bag:()=>sv(`<path d="M44 40h112l10 130H34z" fill="#9aa0a8"/><rect x="58" y="76" width="84" height="56" rx="4" fill="${W}"/><text x="100" y="112" font-size="26" font-family="Oswald,Arial" fill="${D}" text-anchor="middle">FUGA</text>`),
 bucket:()=>sv(`<path d="M44 66h112l-12 104H56z" fill="${W}" stroke="${G}" stroke-width="3"/><path d="M44 66c8-30 104-30 112 0" fill="none" stroke="${G}" stroke-width="4"/><rect x="62" y="96" width="76" height="42" rx="4" fill="${R}"/>`),
 tape:()=>sv(`<circle cx="100" cy="100" r="62" fill="#e7c88a"/><circle cx="100" cy="100" r="24" fill="${W}" stroke="${G}" stroke-width="3"/><circle cx="100" cy="100" r="62" fill="none" stroke="#c9a763" stroke-width="3"/>`),
 frame:()=>sv(`<rect x="46" y="26" width="108" height="150" rx="6" fill="none" stroke="${R}" stroke-width="10"/><rect x="72" y="52" width="56" height="34" rx="4" fill="${L}"/><rect x="84" y="96" width="32" height="48" rx="12" fill="${W}" stroke="${G}" stroke-width="3"/>`)};
 return (A[t]||A.fit)();
}

/* ---------- koszyk ---------- */
const Cart={
 get(){try{return JSON.parse(localStorage.getItem('ziko_cart')||'[]')}catch(e){return[]}},
 set(c){try{localStorage.setItem('ziko_cart',JSON.stringify(c))}catch(e){}this.badge()},
 add(id,n=1){const c=this.get(),i=c.find(x=>x.id===id);i?i.n+=n:c.push({id,n});this.set(c)},
 setQty(id,n){let c=this.get();c=n<1?c.filter(x=>x.id!==id):c.map(x=>x.id===id?{...x,n}:x);this.set(c)},
 rm(id){this.set(this.get().filter(x=>x.id!==id))},
 clear(){this.set([])},
 lines(){return this.get().map(l=>({...l,p:P.find(p=>p.id===l.id)})).filter(l=>l.p)},
 count(){return this.get().reduce((a,b)=>a+b.n,0)},
 total(){return this.lines().reduce((a,l)=>a+l.p.p*l.n,0)},
 badge(){$$('.cartn').forEach(e=>e.textContent=this.count());$$('.carttot').forEach(e=>e.textContent=this.count()?zl(this.total()):'pusty')}
};
let toastT;function toast(msg){let t=$('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.append(t)}
 t.innerHTML=`${icon('check','')}<span>${msg}</span><a href="koszyk.html">Do koszyka</a>`;t.querySelector('svg').style.width='20px';t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2800)}
document.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(!b)return;e.preventDefault();
 const id=+b.dataset.add,n=+(b.dataset.qty||1);Cart.add(id,n);b.classList.add('done');setTimeout(()=>b.classList.remove('done'),900);
 toast('Dodano do koszyka: '+P.find(p=>p.id===id).n.slice(0,38)+'…')});

/* ---------- komponenty ---------- */
const card=p=>`<article class="pcard">${p.o?`<span class="badge">-${Math.round((1-p.p/p.o)*100)}%</span>`:p.k?'<span class="badge new">NOWOŚĆ</span>':''}
<a class="im" href="produkt.html?id=${p.id}" aria-label="${p.n}">${art(p.t)}</a><span class="br">${p.b}</span>
<h3><a href="produkt.html?id=${p.id}">${p.n}</a></h3>
<div class="bot"><div class="price">${p.o?`<span class="old">${zl(p.o)}</span>`:''}${zl(p.p)}</div>
<button class="add" data-add="${p.id}" aria-label="Dodaj do koszyka">${icon('cart')}</button></div></article>`;
const postCard=p=>`<a class="post" href="wpis.html?id=${p.id}"><div class="cv" style="background:${p.c}">${icon(p.i)}</div><div class="bd"><span class="meta">Poradnik · ${p.d}</span><h3>${p.t}</h3><p>${p.x}</p><span class="link-more">Czytaj dalej ${icon('arrow','')}</span></div></a>`;
const NAV=[['index.html','Strona główna','home'],['promocje.html','Promocje','promo'],['info.html?s=zlecenia','Zlecenia','zlecenia'],['info.html?s=o-firmie','O firmie','o-firmie'],['info.html?s=dostawa','Dostawa','dostawa'],['blog.html','Poradnik','blog'],['kontakt.html','Kontakt','kontakt']];

function layout(){
 const pg=document.body.dataset.page||'',sec=q('s')||'';
 const key=pg==='info'?sec:pg;
 const mega=CATS.map(c=>`<div class="mc"><h4>${icon(c.i)}<a href="kategoria.html?c=${c.id}">${c.n}</a></h4>${c.s.map(s=>`<a href="kategoria.html?c=${c.id}&sub=${encodeURIComponent(s)}">${s}</a>`).join('')}</div>`).join('');
 $('#hdr').outerHTML=`<div class="topbar"><div class="wrap"><div class="l"><span>${icon('truck')}<b>Darmowa dostawa</b> od 500 zł</span><span>${icon('card')}Kup na raty – Santander</span><span>${icon('star')}Sprawdzony sklep – Opineo</span></div><div class="r"><span>${icon('phone')}<b>+48 18 477 85 60</b> · pn–pt 7–17</span></div></div></div>
<div class="demo">Prototyp do akceptacji wyglądu – produkty i ceny są poglądowe</div>
<header class="site"><div class="wrap hmain">
<button class="burger" id="burger" aria-label="Menu">${icon('menu')}</button>
<a class="logo" href="index.html"><img src="assets/img/logo.svg" alt="ZIKO – sklep budowlany"></a>
<form class="search" action="kategoria.html" role="search"><input id="sq" name="q" placeholder="Czego szukasz? np. grzejnik, pompa, silikon…" autocomplete="off" aria-label="Szukaj"><button aria-label="Szukaj">${icon('search')}</button><div class="sugg" id="sugg"></div></form>
<div class="hact"><a class="iconbtn" href="zamowienie.html?konto=1">${icon('user')}<span>Zaloguj</span></a>
<a class="cartbtn" href="koszyk.html">${icon('cart')}<span class="lbl carttot">pusty</span><span class="n cartn">0</span></a></div></div>
<nav class="main"><div class="wrap"><button class="catbtn" id="catbtn" aria-expanded="false">${icon('menu')} Kategorie</button>${NAV.map(n=>`<a href="${n[0]}" class="${n[2]===key?'on':''}">${n[1]}</a>`).join('')}</div><div class="mega" id="mega"><div class="wrap">${mega}</div></div></nav></header>
<div class="mnav" id="mnav"><div class="pnl">${NAV.map(n=>`<a href="${n[0]}">${n[1]}</a>`).join('')}<div style="height:12px"></div>${CATS.map(c=>`<a href="kategoria.html?c=${c.id}">${c.n}</a>`).join('')}</div></div>`;
 $('#ftr').outerHTML=`<footer class="site"><div class="wrap"><div class="cols"><div class="lg"><img src="assets/img/logo.svg" alt="ZIKO"><p>Sklep budowlany z hydrauliką, ogrzewaniem, łazienką i narzędziami. Doradzamy, dowozimy, pomagamy w zleceniach.</p></div>
<div><h4>Informacje</h4><ul><li><a href="info.html?s=o-firmie">O firmie</a></li><li><a href="kontakt.html">Kontakt</a></li><li><a href="info.html?s=regulamin">Regulamin</a></li><li><a href="blog.html">Poradnik</a></li></ul></div>
<div><h4>Dostawa</h4><ul><li><a href="info.html?s=dostawa">Koszt wysyłki</a></li><li><a href="info.html?s=reklamacje">Reklamacje</a></li><li><a href="info.html?s=zwrot">Zwrot</a></li><li><a href="info.html?s=wymiana">Wymiana</a></li></ul></div>
<div><h4>Moje konto</h4><ul><li><a href="zamowienie.html?konto=1">Zaloguj się</a></li><li><a href="zamowienie.html?konto=1">Zarejestruj się</a></li><li><a href="koszyk.html">Koszyk</a></li></ul></div>
<div class="ct"><h4>Kontakt</h4><p>+48 (18) 477 85 60</p><p>+48 507 013 078</p><p>sklep@market-ziko.pl</p></div></div>
<div class="fb"><span>© 2026 Market ZIKO. Wszystkie prawa zastrzeżone.</span><div class="pay"><span>Przelewy24</span><span>BLIK</span><span>VISA</span><span>Santander Raty</span><span>Poczta Polska</span><span>FedEx</span><span>JAS-FBG</span></div></div></div></footer>`;
 const cb=$('#catbtn'),mg=$('#mega');cb.onclick=e=>{e.stopPropagation();const o=mg.classList.toggle('on');cb.setAttribute('aria-expanded',o)};
 document.addEventListener('click',e=>{if(!e.target.closest('#mega,#catbtn'))mg.classList.remove('on');if(!e.target.closest('.search'))$('#sugg').classList.remove('on')});
 $('#burger').onclick=()=>$('#mnav').classList.add('on');$('#mnav').onclick=e=>{if(e.target.id==='mnav')e.currentTarget.classList.remove('on')};
 const sq=$('#sq'),sg=$('#sugg');sq.addEventListener('input',()=>{const v=sq.value.trim().toLowerCase();if(v.length<2){sg.classList.remove('on');return}
  const r=P.filter(p=>(p.n+p.b+p.s).toLowerCase().includes(v)).slice(0,6);
  sg.innerHTML=r.length?r.map(p=>`<a href="produkt.html?id=${p.id}"><span class="th">${art(p.t)}</span><span>${p.n}<small>${cat(p.c).n}</small></span><span class="pr">${zl(p.p)}</span></a>`).join(''):'<a href="#" onclick="return false">Brak wyników</a>';sg.classList.add('on')});
 Cart.badge();
}
function sectionHead(t,sub,link){return `<div class="sec-head"><div><h2>${t}</h2>${sub?`<p>${sub}</p>`:''}</div>${link?`<a class="link-more" href="${link[0]}">${link[1]} ${icon('arrow','')}</a>`:''}</div>`}
