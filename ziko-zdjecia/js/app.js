/* Wspólny układ strony: nagłówek, stopka, koszyk, wyszukiwarka, ulubione */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const zl=n=>n.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d),)/g,' ')+' zł';
const qs=new URLSearchParams(location.search);
const ls={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let cart=ls.get('zikoCart',{}),favs=ls.get('zikoFav',[]);
const ICON={
 phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
 cart:'<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/>',
 heart:'<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 22l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 check:'<path d="m5 12 5 5 9-10"/>',
 menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
 grid:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
 pin:'<path d="M12 22s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
const ic=(n,st='')=>`<svg class="i" viewBox="0 0 24 24" style="${st}">${ICON[n]}</svg>`;
const page=document.body.dataset.page||'';
const NAV=[['index.html','Strona główna','home'],['kategoria.html?promo=1','Promocje','promo'],['zlecenia.html','Zlecenia','zlecenia'],['poradnik.html','Poradnik','poradnik'],['o-firmie.html','O firmie','o-firmie'],['dostawa.html','Dostawa','dostawa'],['kontakt.html','Kontakt','kontakt']];

function layout(){
 const mega=CATS.map(c=>`<div><a class="mh" href="kategoria.html?c=${c.id}"><img src="${cimg(c.id)}" alt="">${c.n}</a>${c.s.map(s=>`<a href="kategoria.html?c=${c.id}">${s}</a>`).join('')}</div>`).join('');
 document.body.insertAdjacentHTML('afterbegin',`
<div class="topbar"><div class="wrap"><div class="l"><span>${ic('phone')}<b>+48 (18) 477 85 60</b></span><span><b>+48 507 013 078</b></span><span>${ic('mail')}sklep@market-ziko.pl</span></div><div class="r l"><a href="dostawa.html">Darmowa dostawa od 500 zł</a><a href="dostawa.html#raty">Kupuj na raty</a></div></div></div>
<header class="main" id="hdr"><div class="wrap"><div class="hrow">
 <button class="hbtn burger" id="burger" aria-label="Menu">${ic('menu')}</button>
 <a class="logo" href="index.html"><img src="assets/logo.png" alt="ZIKO"></a>
 <form class="search" id="searchBox" action="kategoria.html"><input id="q" name="q" type="search" placeholder="Czego szukasz? np. grzejnik, bateria, pompa…" autocomplete="off"><button aria-label="Szukaj">${ic('search')}</button><div class="sugg" id="sugg"></div></form>
 <div class="hact">
  <a class="hbtn" href="konto.html">${ic('user')}<span class="t">Zaloguj</span></a>
  <a class="hbtn" href="ulubione.html" aria-label="Ulubione">${ic('heart')}<span class="badge fb" id="favCount" style="background:var(--red);color:#fff">0</span></a>
  <button class="hbtn cartbtn" id="cartBtn">${ic('cart')}<span class="t" id="cartTotalH">0,00 zł</span><span class="badge" id="cartCount">0</span></button>
 </div></div></div>
 <nav class="menu"><div class="wrap">
  <div class="mega-wrap"><a href="kategoria.html" class="allcat">${ic('grid','width:18px;height:18px')}Wszystkie kategorie</a><div class="mega"><div class="wrap megag">${mega}</div></div></div>
  ${NAV.map(n=>`<a href="${n[0]}" class="${n[2]==='promo'?'promo ':''}${page===n[2]?'on':''}">${n[1]}</a>`).join('')}
 </div></nav></header>`);
 document.body.insertAdjacentHTML('beforeend',`
<footer><div class="wrap">
 <div class="fgrid">
  <div><img src="assets/logo_footer.png" alt="ZIKO"><p>Market ZIKO to sklep z artykułami grzewczymi, hydraulicznymi, elektrycznymi i budowlanymi. Wszystko do domu i ogrodu w jednym miejscu.</p><div class="pay"><span>PRZELEW</span><span>KARTA</span><span>BLIK</span><span>RATY</span><span>POBRANIE</span></div></div>
  <div><h4>Informacje</h4><ul><li><a href="o-firmie.html">O firmie</a></li><li><a href="kontakt.html">Kontakt</a></li><li><a href="regulamin.html">Regulamin</a></li><li><a href="poradnik.html">Poradnik</a></li><li><a href="dostawa.html">Dostawa</a></li><li><a href="dostawa.html#koszt">Koszt wysyłki</a></li><li><a href="dostawa.html#reklamacje">Reklamacje</a></li><li><a href="dostawa.html#zwrot">Zwrot i wymiana</a></li></ul></div>
  <div><h4>Moje konto</h4><ul><li><a href="konto.html">Zaloguj się</a></li><li><a href="konto.html#rejestracja">Zarejestruj się</a></li><li><a href="konto.html">Moje konto</a></li><li><a href="konto.html#zamowienia">Historia zamówień</a></li><li><a href="ulubione.html">Ulubione</a></li></ul></div>
  <div class="ct"><h4>Kontakt</h4><ul><li>${ic('phone')}+48 (18) 477 85 60</li><li>${ic('phone')}+48 507 013 078</li><li>${ic('mail')}sklep@market-ziko.pl</li></ul>
   <form class="nl" id="nform"><input type="email" required placeholder="Newsletter: Twój e-mail"><button>Zapisz</button></form><div class="nlok" id="nok">✓ Dziękujemy za zapis!</div></div>
 </div>
 <div class="copy"><span>© 2026 Market ZIKO. Wszystkie prawa zastrzeżone.</span><span>Wersja demonstracyjna – projekt nowej strony</span></div>
</div></footer>
<div class="ov" id="ov"></div>
<aside class="drawer" id="drawer" aria-label="Koszyk"><div class="dh"><h3>Twój koszyk</h3><button class="x" data-close aria-label="Zamknij">✕</button></div><div class="db" id="cartItems"></div><div class="df" id="cartFoot"></div></aside>
<aside class="mm" id="mm"><img src="assets/logo.png" alt="ZIKO" style="height:50px;margin-bottom:12px"><a href="index.html">Strona główna</a><a href="kategoria.html">Wszystkie produkty</a><a href="kategoria.html?promo=1" style="color:var(--red)">Promocje</a>${CATS.map(c=>`<a href="kategoria.html?c=${c.id}" style="font-weight:500;padding-left:14px;font-size:14px">${c.n}</a>`).join('')}<a href="zlecenia.html">Zlecenia</a><a href="poradnik.html">Poradnik</a><a href="o-firmie.html">O firmie</a><a href="dostawa.html">Dostawa</a><a href="regulamin.html">Regulamin</a><a href="kontakt.html">Kontakt</a><a href="konto.html">Moje konto</a></aside>
<div class="toast" id="toast">${ic('check')}<span id="toastTxt"></span></div>
<a href="#" class="totop" id="totop" aria-label="Do góry"><svg class="i" viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg></a>`);
}
layout();

/* produkt: karta */
const disc=p=>p.o?Math.round((1-p.p/p.o)*100):0;
const find=id=>P.find(x=>x.id==id);
function card(p){
 return `<article class="card"><a class="im" href="produkt.html?id=${p.id}">${p.o?`<span class="pb">-${disc(p)}%</span>`:p.nw?'<span class="pb new">Nowość</span>':''}<img src="${p.im}" alt="${p.n}" loading="lazy"></a>
 <button class="fav ${favs.includes(p.id)?'on':''}" data-fav="${p.id}" aria-label="Ulubione">${ic('heart','width:18px;height:18px')}</button>
 <div class="bd"><span class="k">${p.b}</span><h3><a href="produkt.html?id=${p.id}">${p.n}</a></h3><div class="price ${p.o?'sale':''}"><b>${zl(p.p)}</b>${p.o?`<s>${zl(p.o)}</s>`:''}</div>
 <button class="add" data-add="${p.id}">${ic('cart','width:18px;height:18px')}Do koszyka</button></div></article>`;
}
function crumbs(arr){return `<nav class="crumbs"><a href="index.html">Strona główna</a>${arr.map(a=>a[1]?`<span>›</span><a href="${a[1]}">${a[0]}</a>`:`<span>›</span><b>${a[0]}</b>`).join('')}</nav>`}

/* koszyk */
const count=()=>Object.values(cart).reduce((a,b)=>a+b,0);
const sum=()=>Object.entries(cart).reduce((a,[id,q])=>a+find(id).p*q,0);
function drawCart(){
 $('#cartCount').textContent=count();$('#cartTotalH').textContent=zl(sum());$('#favCount').textContent=favs.length;
 $('#favCount').style.display=favs.length?'grid':'none';
 const e=Object.entries(cart);
 $('#cartItems').innerHTML=e.length?e.map(([id,q])=>{const p=find(id);return `<div class="ci"><img src="${p.im}" alt=""><div><h4><a href="produkt.html?id=${id}">${p.n}</a></h4><div class="qty"><button data-q="${id}" data-d="-1">−</button><span>${q}</span><button data-q="${id}" data-d="1">+</button></div></div><div class="pr">${zl(p.p*q)}<button class="rm" data-rm="${id}">Usuń</button></div></div>`}).join(''):`<div class="cempty">${ic('cart','width:56px;height:56px')}Koszyk jest pusty<br><br><a class="btn btn-red" href="kategoria.html">Zacznij zakupy</a></div>`;
 const s=sum(),left=Math.max(0,500-s);
 $('#cartFoot').innerHTML=e.length?`<div class="free">${left?`Do darmowej dostawy brakuje <b>${zl(left)}</b>`:'🎉 Masz darmową dostawę!'}<div class="bar"><i style="width:${Math.min(100,s/5)}%"></i></div></div><div class="tot"><span>Razem</span><span>${zl(s)}</span></div><a class="btn btn-red" href="koszyk.html">Przejdź do koszyka</a>`:'';
 ls.set('zikoCart',cart);
 if(window.onCartChange)window.onCartChange();
}
function toast(t){$('#toastTxt').textContent=t;$('#toast').classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>$('#toast').classList.remove('on'),2200)}
function addCart(id,q=1){cart[id]=(cart[id]||0)+q;drawCart();toast('Dodano do koszyka')}
function openEl(el){closeAll();$(el).classList.add('on');$('#ov').classList.add('on');document.body.style.overflow='hidden'}
function closeAll(){$$('.drawer,.modal,.mm').forEach(e=>e.classList.remove('on'));$('#ov').classList.remove('on');document.body.style.overflow=''}

document.addEventListener('click',e=>{
 const t=e.target.closest('[data-add],[data-fav],[data-q],[data-rm],[data-close],#cartBtn,#burger,#ov');
 if(!t)return;
 if(t.dataset.add){addCart(+t.dataset.add)}
 else if(t.dataset.fav){const id=+t.dataset.fav;favs=favs.includes(id)?favs.filter(x=>x!==id):[...favs,id];ls.set('zikoFav',favs);$$(`[data-fav="${id}"]`).forEach(b=>b.classList.toggle('on',favs.includes(id)));toast(favs.includes(id)?'Dodano do ulubionych':'Usunięto z ulubionych');drawCart();if(window.onFavChange)window.onFavChange()}
 else if(t.dataset.q){const id=t.dataset.q;cart[id]+=+t.dataset.d;if(cart[id]<1)delete cart[id];drawCart()}
 else if(t.dataset.rm){delete cart[t.dataset.rm];drawCart()}
 else if(t.id==='cartBtn'){openEl('#drawer')}
 else if(t.id==='burger'){openEl('#mm')}
 else closeAll();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()});

/* wyszukiwarka z podpowiedziami */
$('#q').addEventListener('input',e=>{
 const v=e.target.value.trim().toLowerCase(),s=$('#sugg');
 if(v.length<2){s.classList.remove('on');return}
 const r=P.filter(p=>(p.n+p.b).toLowerCase().includes(v)).slice(0,6);
 s.innerHTML=(r.length?r.map(p=>`<a href="produkt.html?id=${p.id}"><img src="${p.im}" alt="">${p.n}<small>${zl(p.p)}</small></a>`).join(''):'<a style="color:var(--gray-m)">Brak wyników</a>')+`<a href="kategoria.html?q=${encodeURIComponent(v)}" style="justify-content:center;font-weight:700;color:var(--red)">Pokaż wszystkie wyniki →</a>`;
 s.classList.add('on');
});
document.addEventListener('click',e=>{if(!e.target.closest('#searchBox'))$('#sugg').classList.remove('on')});
if(qs.get('q'))$('#q').value=qs.get('q');
$('#nform').onsubmit=e=>{e.preventDefault();e.target.style.display='none';$('#nok').style.display='block'};

/* efekty */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.06});
function observe(){$$('.reveal:not(.in)').forEach(e=>io.observe(e))}
observe();
addEventListener('scroll',()=>{$('#hdr').classList.toggle('stuck',scrollY>10);$('#totop').classList.toggle('on',scrollY>600)},{passive:true});
$('#totop').onclick=e=>{e.preventDefault();scrollTo({top:0,behavior:'smooth'})};
drawCart();
