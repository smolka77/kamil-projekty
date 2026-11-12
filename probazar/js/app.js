/* ProBazar – logika prototypu: komponenty wspólne (header/footer/koszyk/wyszukiwarka) + renderery stron. Bez frameworków. */
(function(){
const {art:A}=PB, I=A.icon;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const zl=n=>n.toFixed(2).replace('.',',')+' zł';
const prod=id=>PB.products.find(p=>p.id===id), rec=id=>PB.recipes.find(r=>r.id===id), cat=id=>PB.categories.find(c=>c.id===id);
const qs=new URLSearchParams(location.search);
const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const page=document.body.dataset.page;

/* ---------- KOSZYK ---------- */
const Cart={
  get(){return store.get('pb_cart',{})},
  save(c){store.set('pb_cart',c);document.dispatchEvent(new Event('cart:change'))},
  add(id,n=1){const c=this.get();c[id]=Math.min(20,(c[id]||0)+n);this.save(c)},
  set(id,n){const c=this.get();if(n<=0)delete c[id];else c[id]=Math.min(20,n);this.save(c)},
  clear(){this.save({})},
  lines(){return Object.entries(this.get()).filter(([id])=>prod(id)).map(([id,q])=>({p:prod(id),q}))},
  count(){return this.lines().reduce((a,l)=>a+l.q,0)},
  sub(){return this.lines().reduce((a,l)=>a+l.p.price*l.q,0)},
  coupon(){return store.get('pb_coupon',null)},
  disc(){return this.coupon()?+(this.sub()*PB.coupon.pct/100).toFixed(2):0},
  shipPrice(id){const s=PB.ship.find(x=>x.id===id)||PB.ship[0];return (this.sub()-this.disc()>=PB.freeShip)?0:s.price},
  totals(shipId){const sub=this.sub(),d=this.disc(),sh=this.lines().length?this.shipPrice(shipId):0;return{sub,d,sh,total:sub-d+sh}}
};
function shipBar(){
  const left=PB.freeShip-(Cart.sub()-Cart.disc()),pct=Math.min(100,Math.round((Cart.sub()-Cart.disc())/PB.freeShip*100));
  return `<div class="ship-bar">${left>0?`Do <b>darmowej dostawy</b> brakuje <b>${zl(left)}</b>`:`<b>Gratulacje!</b> Masz darmową dostawę 🎉`}<div class="track"><i style="width:${pct}%"></i></div></div>`;
}

/* ---------- KOMPONENTY KART ---------- */
function stars(r){return `<span class="stars" aria-hidden="true">${I('star',14)}</span>`}
function pcard(p){
  const wish=store.get('pb_wish',[]).includes(p.id);
  const badges=[p.badge?`<span class="pill">${p.badge}</span>`:'',p.tags.includes('bio')?'<span class="pill">Bio</span>':''].join('');
  return `<article class="pcard"><div class="pcard-img"><a href="produkt.html?id=${p.id}" tabindex="-1" aria-hidden="true">${A.productArt(p)}</a><div class="pcard-badges">${badges}</div>
  <button class="wish" data-wish="${p.id}" aria-pressed="${wish}" aria-label="Dodaj do ulubionych: ${esc(p.name)}">${I('heart',20)}</button></div>
  <div class="pcard-body"><h3 class="pcard-title"><a href="produkt.html?id=${p.id}">${p.name}</a></h3>
  <div class="pcard-meta">${stars()}<span>${p.rating.toFixed(1).replace('.',',')} · ${p.size}</span></div>
  <div class="pcard-foot"><span class="price">${p.oldPrice?`<del>${zl(p.oldPrice)}</del><ins>${zl(p.price)}</ins>`:zl(p.price)}</span>
  <button class="add-btn" data-add="${p.id}" aria-label="Dodaj do koszyka: ${esc(p.name)}">${I('plus',20)}</button></div></div></article>`;
}
function rcard(r,pill=true){
  return `<article class="rcard"><div class="rcard-img">${A.recipeArt(r)}</div>
  <div class="rcard-body"><span class="kicker">${r.cat}</span><h3><a href="przepis.html?id=${r.id}">${r.title}</a></h3>
  <div class="meta"><span>${I('clock',16)} ${r.time} min</span><span>${I('users',16)} ${r.serv} porcji</span><span>${I('flame',16)} ${r.kcal} kcal</span></div>
  <span class="link-arrow" style="margin-top:auto">Zobacz przepis ${I('chevron',18)}</span></div></article>`;
}
function vcard(v,dark=false){
  return `<button class="vcard" data-video="${v.id}"><div class="vthumb">${A.videoArt(v)}<span class="pill soon">Wkrótce</span><span class="play"><span>${I('play',22)}</span></span><span class="dur">${v.dur}</span></div>
  <div><span class="vcat">${v.cat}</span><h3>${v.title}</h3></div></button>`;
}

/* ---------- CHROME: header, menu, szukajka, koszyk, stopka ---------- */
const NAV=[['sklep','Sklep','sklep.html'],['blog','Blog Moniki','blog.html'],['wideo','Wideo','wideo.html'],['o-nas','O nas','o-nas.html'],['kontakt','Kontakt','kontakt.html']];
function chrome(){
  const cur=k=>page===k||(k==='sklep'&&['produkt','koszyk','zamowienie'].includes(page)&&false)?' aria-current="page"':'';
  const curP=k=>({sklep:['sklep','produkt'],blog:['blog','przepis']}[k]||[k]).includes(page)?' aria-current="page"':'';
  document.body.insertAdjacentHTML('afterbegin',`
  <a class="skip" href="#main">Przejdź do treści</a>
  <div class="announce">Darmowa dostawa od ${PB.freeShip} zł · wysyłka w 24 h <span class="demo">Prototyp – dane demonstracyjne</span></div>
  <header class="site-header"><div class="container">
   <a class="logo" href="index.html" aria-label="ProBazar – strona główna">${A.logoMark(40)}<span class="logo-text">Pro<span>Bazar</span></span></a>
   <nav class="nav" aria-label="Główne">${NAV.map(n=>`<a href="${n[2]}"${curP(n[0])}>${n[1]}</a>`).join('')}</nav>
   <button class="icon-btn" id="openSearch" aria-label="Szukaj">${I('search',24)}</button>
   <button class="icon-btn" id="openCart" aria-label="Koszyk">${I('cart',24)}<span class="badge-count" id="cartCount" data-n="0"></span></button>
   <button class="icon-btn burger" id="openMenu" aria-label="Menu" aria-expanded="false">${I('menu',26)}</button>
  </div></header>
  <div class="mnav" id="mnav" role="dialog" aria-label="Menu"><div class="mnav-top"><a class="logo" href="index.html">${A.logoMark(40)}<span class="logo-text">Pro<span>Bazar</span></span></a><button class="icon-btn" data-close aria-label="Zamknij menu">${I('close',26)}</button></div>
   ${NAV.map(n=>`<a class="big" href="${n[2]}">${n[1]}${I('chevron',22)}</a>`).join('')}
   <div class="cats">${PB.categories.map(c=>`<a class="chip" href="sklep.html?kat=${c.id}">${c.name}</a>`).join('')}</div>
   <a class="btn btn--primary btn--block" href="koszyk.html">${I('cart',20)} Koszyk</a></div>
  <div class="overlay" id="overlay"></div>
  <div class="search-panel" id="searchPanel" role="dialog" aria-label="Wyszukiwarka"><div class="container">
   <form class="search-box" action="sklep.html" role="search"><label class="sr" for="q">Szukaj produktów i przepisów</label><input class="input" id="q" name="q" type="search" placeholder="Szukaj produktów i przepisów…" autocomplete="off">
   <button class="btn btn--navy" type="submit">Szukaj</button><button class="icon-btn" type="button" data-close aria-label="Zamknij wyszukiwarkę">${I('close',24)}</button></form>
   <div id="srRes"><div class="sr-group"><h3>Popularne</h3><div class="chips">${['Migdały','Miód','Matcha','Granola','Oliwa'].map(t=>`<a class="chip" href="sklep.html?q=${encodeURIComponent(t)}">${t}</a>`).join('')}</div></div></div></div></div>
  <aside class="drawer" id="drawer" aria-label="Koszyk"><div class="drawer-head"><h2>Twój koszyk</h2><button class="icon-btn" data-close aria-label="Zamknij koszyk">${I('close',24)}</button></div><div class="drawer-body" id="drawerBody"></div><div class="drawer-foot" id="drawerFoot"></div></aside>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>`);
  document.body.insertAdjacentHTML('beforeend',`
  <footer class="footer"><div class="container">
   <div class="footer-grid">
    <div class="footer-brand"><a class="logo" href="index.html" style="margin-bottom:14px">${A.logoMark(44)}<span class="logo-text">Pro<span>Bazar</span></span></a>
     <p style="max-width:36ch">Zdrowa żywność, prosta kuchnia i przepisy, które naprawdę wychodzą. Sklep, blog i wideo – wszystko w jednym miejscu.</p><div class="pay-row"><span>BLIK</span><span>Karta</span><span>Przelew</span><span>Pobranie</span></div></div>
    <div><h3>Sklep</h3><ul>${PB.categories.map(c=>`<li><a href="sklep.html?kat=${c.id}">${c.name}</a></li>`).join('')}</ul></div>
    <div><h3>ProBazar</h3><ul><li><a href="blog.html">Blog Moniki</a></li><li><a href="wideo.html">Wideo</a></li><li><a href="o-nas.html">O nas</a></li><li><a href="faq.html">FAQ i dostawa</a></li><li><a href="kontakt.html">Kontakt</a></li></ul></div>
   </div>
   <div class="footer-bottom"><span>© 2026 ProBazar · Prototyp wizualny – dane demonstracyjne · Zdjęcia: Unsplash</span><span><a href="faq.html">Regulamin</a> · <a href="faq.html">Polityka prywatności</a></span></div></div></footer>`);
  if(!$('main#main')){}
  bindChrome();
}
let toastT;
function toast(msg,link){const t=$('#toast');t.innerHTML=`${I('check',20)}<span>${msg}</span>${link?`<a href="${link[0]}" style="color:#fff;text-decoration:underline;margin-left:6px">${link[1]}</a>`:''}`;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),3200)}
const panels=()=>['#mnav','#searchPanel','#drawer'].map(s=>$(s));
function openP(sel){closeAll();$(sel).classList.add('open');if(sel!=='#mnav')$('#overlay').classList.add('open');document.body.style.overflow='hidden';
  if(sel==='#mnav')$('#openMenu').setAttribute('aria-expanded','true');if(sel==='#searchPanel')setTimeout(()=>$('#q').focus(),50);if(sel==='#drawer')renderDrawer()}
function closeAll(){panels().forEach(p=>p.classList.remove('open'));$('#overlay').classList.remove('open');$('#openMenu').setAttribute('aria-expanded','false');document.body.style.overflow='';$$('.modal.open').forEach(m=>m.classList.remove('open'));$('.filters.open')?.classList.remove('open')}
function renderDrawer(){
  const L=Cart.lines();
  $('#drawerBody').innerHTML=L.length?shipBar()+L.map(l=>`<div class="citem" style="grid-template-columns:72px 1fr"><div class="th" style="width:72px;height:72px">${A.productArt(l.p)}</div><div><h3><a href="produkt.html?id=${l.p.id}">${l.p.name}</a></h3><small style="color:var(--muted)">${l.p.size}</small>
   <div class="ctl"><div class="qty"><button data-dec="${l.p.id}" aria-label="Mniej">${I('minus',16)}</button><output>${l.q}</output><button data-inc="${l.p.id}" aria-label="Więcej">${I('plus',16)}</button></div><b>${zl(l.p.price*l.q)}</b></div></div></div>`).join(''):
   `<div class="empty"><div class="art-wrap">${A.productArt(prod('miod'))}</div><h3>Koszyk jest pusty</h3><p>Zajrzyj do sklepu – na pewno coś Ci posmakuje.</p><a class="btn btn--primary" href="sklep.html">Idź do sklepu</a></div>`;
  $('#drawerFoot').innerHTML=L.length?`<div class="sum-row total" style="border:0;margin:0;padding:0 0 12px"><span>Razem</span><span>${zl(Cart.sub()-Cart.disc())}</span></div><div style="display:grid;gap:8px"><a class="btn btn--primary btn--block" href="zamowienie.html">Do kasy</a><a class="btn btn--ghost btn--block" href="koszyk.html">Zobacz koszyk</a></div>`:'';
}
function updateBadge(){const n=Cart.count(),b=$('#cartCount');b.textContent=n||'';b.dataset.n=n;if($('#drawer.open'))renderDrawer()}
function search(v){
  v=v.trim().toLowerCase();const R=$('#srRes');if(v.length<2){return}
  const P=PB.products.filter(p=>(p.name+p.desc+cat(p.cat).name).toLowerCase().includes(v)).slice(0,4);
  const Rc=PB.recipes.filter(r=>(r.title+r.intro+r.cat).toLowerCase().includes(v)).slice(0,3);
  R.innerHTML=(P.length||Rc.length)?(P.length?`<div class="sr-group"><h3>Produkty</h3>${P.map(p=>`<a class="sr-item" href="produkt.html?id=${p.id}"><span class="th">${A.productArt(p)}</span><span><b>${p.name}</b><small>${p.size} · ${zl(p.price)}</small></span></a>`).join('')}</div>`:'')+
   (Rc.length?`<div class="sr-group"><h3>Przepisy Moniki</h3>${Rc.map(r=>`<a class="sr-item" href="przepis.html?id=${r.id}"><span class="th">${A.recipeArt(r)}</span><span><b>${r.title}</b><small>${r.time} min · ${r.cat}</small></span></a>`).join('')}</div>`:'')+
   `<p style="margin-top:14px"><a class="link-arrow" href="sklep.html?q=${encodeURIComponent(v)}">Zobacz wszystkie wyniki w sklepie ${I('chevron',18)}</a></p>`:
   `<div class="sr-group"><p>Brak wyników dla „${esc(v)}”. Spróbuj np. <a href="sklep.html?q=migdały">migdały</a> lub <a href="sklep.html?q=miód">miód</a>.</p></div>`;
}
function bindChrome(){
  $('#openMenu').onclick=()=>openP('#mnav');$('#openSearch').onclick=()=>openP('#searchPanel');$('#openCart').onclick=()=>openP('#drawer');
  $('#overlay').onclick=closeAll;
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()});
  $('#q').addEventListener('input',e=>search(e.target.value));
  document.addEventListener('cart:change',updateBadge);updateBadge();
  /* delegowane akcje */
  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-add],[data-close],[data-wish],[data-inc],[data-dec],[data-video],[data-rm]');if(!t)return;
    if(t.dataset.close!==undefined){closeAll();return}
    if(t.dataset.add){Cart.add(t.dataset.add);t.classList.add('done');setTimeout(()=>t.classList.remove('done'),900);toast(`Dodano: ${prod(t.dataset.add).short}`,['koszyk.html','Koszyk'])}
    if(t.dataset.wish){const w=store.get('pb_wish',[]),i=w.indexOf(t.dataset.wish);i<0?w.push(t.dataset.wish):w.splice(i,1);store.set('pb_wish',w);t.setAttribute('aria-pressed',i<0);if(i<0)toast('Dodano do ulubionych')}
    if(t.dataset.inc){Cart.add(t.dataset.inc)}if(t.dataset.dec){Cart.add(t.dataset.dec,-1)}
    if(t.dataset.rm){Cart.set(t.dataset.rm,0)}
    if(t.dataset.video)openVideo(t.dataset.video);
  });
  $$('form[data-newsletter]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();toast('Dziękujemy! Zapisaliśmy Twój adres (demo).');f.reset()}));
  $$('form[data-demo]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();toast('Wiadomość wysłana (demo – nic nie opuszcza przeglądarki).');f.reset()}));
}
function openVideo(id){
  const v=PB.videos.find(x=>x.id===id);let m=$('#vmodal');if(!m){document.body.insertAdjacentHTML('beforeend','<div class="modal" id="vmodal" role="dialog" aria-modal="true" aria-label="Podgląd filmu"><div class="modal-box"></div></div>');m=$('#vmodal');m.addEventListener('click',e=>{if(e.target===m)closeAll()})}
  const r=v.recipe&&rec(v.recipe);
  $('.modal-box',m).innerHTML=`<button class="icon-btn" data-close aria-label="Zamknij">${I('close',24)}</button><div class="vthumb">${A.videoArt(v)}<div class="play"><span style="background:rgba(255,255,255,.55)">${I('play',26)}</span></div></div>
  <div class="body"><span class="vcat">${v.cat} · ${v.dur}</span><h2 style="font-size:1.5rem;margin:6px 0 10px">${v.title}</h2><p>To <b>miejsce na film z YouTube</b>. Kanał ProBazar dopiero powstaje – w tym miejscu pojawi się odtwarzacz (osadzenie YouTube z trybem prywatności).</p>
  <div style="display:flex;gap:10px;flex-wrap:wrap">${r?`<a class="btn btn--primary btn--sm" href="przepis.html?id=${r.id}">Zobacz przepis</a>`:''}<button class="btn btn--ghost btn--sm" data-close>Zamknij</button></div></div>`;
  m.classList.add('open');document.body.style.overflow='hidden';
}

/* ---------- STRONY ---------- */
const $main=()=>$('#main');
const R={};

R.home=()=>{
  const feat=['migdaly','miod','matcha','granola','oliwa','czekolada','mix-goji','platki-owsiane'].map(prod);
  const V=[['leaf','Naturalne składy','Czytamy etykiety za Ciebie – bez zbędnej chemii i ukrytego cukru.'],['shield','Sprawdzeni dostawcy','Mali producenci i certyfikowane uprawy, które znamy z imienia.'],['book','Przepis do każdego produktu','Od razu wiesz, co ugotować z tego, co kupujesz.'],['recycle','Mniej odpadów','Szkło i papier wszędzie tam, gdzie to możliwe.']];
  $main().innerHTML=`
  <section class="hero"><div class="container hero-grid">
   <div class="hero-tx"><span class="eyebrow">Sklep ze zdrową żywnością i blog kulinarny</span>
    <h1>Dobre jedzenie<br>zaczyna się od <em>dobrych składników</em></h1>
    <p class="lead">Wybieramy proste, naturalne produkty, a Monika pokazuje na blogu, co z nich ugotować.</p>
    <div class="hero-cta"><a class="btn btn--navy" href="sklep.html">Zobacz sklep</a><a class="btn btn--ghost" href="blog.html">Przepisy Moniki</a></div>
    <ul class="trust"><li>${I('leaf',18)} Naturalne składy</li><li>${I('truck',18)} Wysyłka w 24 h</li><li>${I('shield',18)} 30 dni na zwrot</li></ul></div>
   <div class="hero-art"><div class="hero-main">${A.img('hero','Stół ze śniadaniem: miseczki z owsianką, owocami i miodem',1100,1300,1)}</div>
    <a class="hero-note" href="przepis.html?id=owsianka"><span class="th">${A.recipeArt(rec('owsianka'))}</span><span><small>Przepis tygodnia</small><b>Kremowa owsianka z owocami</b></span></a></div>
  </div></section>

  <section class="section"><div class="container"><div class="sec-head"><div><span class="eyebrow">Kategorie</span><h2>Czego dziś szukasz?</h2></div><a class="link-arrow" href="sklep.html">Cały sklep ${I('chevron',16)}</a></div>
   <div class="catgrid">${PB.categories.map(c=>`<a class="cat" href="sklep.html?kat=${c.id}"><div class="im">${A.categoryArt(c)}</div><b>${c.name}</b><small>${PB.products.filter(p=>p.cat===c.id).length} produktów</small></a>`).join('')}</div></div></section>

  <section class="section section--tint"><div class="container"><div class="sec-head"><div><span class="eyebrow">Polecamy</span><h2>Ulubione w naszej spiżarni</h2><p>Produkty, do których wracacie najczęściej – sprawdzone w kuchni Moniki.</p></div><a class="link-arrow" href="sklep.html">Zobacz wszystkie ${I('chevron',16)}</a></div>
   <div class="pgrid p4">${feat.map(pcard).join('')}</div></div></section>

  <section class="section"><div class="container"><div class="sec-head"><div><span class="eyebrow">Blog kulinarny</span><h2>Najnowsze od Moniki</h2><p>Przepisy z produktami z naszego sklepu – składniki dodasz do koszyka jednym kliknięciem.</p></div><a class="link-arrow" href="blog.html">Wszystkie przepisy ${I('chevron',16)}</a></div>
   <div class="rgrid r3">${PB.recipes.slice(0,3).map(r=>rcard(r)).join('')}</div></div></section>

  <section class="section section--sand"><div class="container about-teaser"><div class="ph">${A.avatar()}</div>
   <div><span class="eyebrow">Poznaj Monikę</span><p class="quote">„Zdrowe jedzenie nie musi być nudne ani drogie. Wystarczą dobre składniki i pięć minut dobrego pomysłu.”</p><p class="muted" style="max-width:54ch">Monika od lat gotuje dla rodziny i znajomych. W ProBazarze dzieli się przepisami i wybiera produkty, które sama kładzie do swojego koszyka.</p><a class="link-arrow" href="o-nas.html">Poznaj naszą historię ${I('chevron',16)}</a></div></div></section>

  <section class="section"><div class="container"><div class="sec-head"><div><span class="eyebrow">Wideo</span><h2>Kanał ProBazar już wkrótce</h2><p>Gotujemy, testujemy i pokazujemy, skąd bierzemy nasze produkty. Poniżej zapowiedź tego, co przygotowujemy.</p></div><a class="link-arrow" href="wideo.html">Zobacz zapowiedzi ${I('chevron',16)}</a></div>
   <div class="grid grid-3">${PB.videos.slice(0,3).map(v=>vcard(v)).join('')}</div></div></section>

  <section class="section section--tint"><div class="container"><div class="values">${V.map(v=>`<div class="value"><div class="vi">${I(v[0],26)}</div><div><h3>${v[1]}</h3><p>${v[2]}</p></div></div>`).join('')}</div></div></section>

  <section class="news-band">${A.img('news','',1400,700)}<div class="container"><div class="news"><span class="eyebrow">Newsletter</span><h2>Jeden przepis w każdy czwartek</h2><p>Zapisz się i odbierz 10% rabatu na pierwsze zakupy (kod ${PB.coupon.code}).</p>
   <form data-newsletter><label class="sr" for="nl">Adres e-mail</label><input class="input" id="nl" type="email" required placeholder="Twój adres e-mail"><button class="btn btn--navy" type="submit">Zapisz mnie</button></form></div></div></section>`;
};

R.sklep=()=>{
  const S={cat:qs.get('kat')||'',tags:new Set(),max:60,sort:'pop',q:qs.get('q')||''};
  const cnt=id=>PB.products.filter(p=>p.cat===id).length;
  $main().innerHTML=`<div class="container"><nav class="crumbs" aria-label="Okruszki"><a href="index.html">Strona główna</a>${I('chevron',14)}<span>Sklep</span></nav>
  <div class="page-head"><span class="eyebrow">Sklep</span><h1 id="shopTitle">Sklep</h1><p class="lead" id="shopLead">Zdrowa żywność wybrana przez Monikę. Filtruj, sortuj i dodawaj do koszyka.</p></div>
  <div class="catpills" id="pills"></div>
  <div class="shop"><aside class="filters" id="filters" aria-label="Filtry"><div class="fhead"><h2 style="font-size:1.4rem;margin:0">Filtry</h2><button class="icon-btn" data-close aria-label="Zamknij filtry">${I('close',24)}</button></div>
   <h3>Kategoria</h3><label class="fopt"><span class="l"><input type="radio" name="cat" value="" ${!S.cat?'checked':''}>Wszystkie</span><small>${PB.products.length}</small></label>
   ${PB.categories.map(c=>`<label class="fopt"><span class="l"><input type="radio" name="cat" value="${c.id}" ${S.cat===c.id?'checked':''}>${c.name}</span><small>${cnt(c.id)}</small></label>`).join('')}
   <h3>Dieta i certyfikaty</h3>${Object.entries(PB.tags).map(([k,v])=>`<label class="fopt"><span class="l"><input type="checkbox" name="tag" value="${k}">${v}</span><small>${PB.products.filter(p=>p.tags.includes(k)).length}</small></label>`).join('')}
   <h3>Cena do: <span id="maxv">60 zł</span></h3><input type="range" id="max" min="10" max="60" step="5" value="60" aria-label="Maksymalna cena"><button class="btn btn--ghost btn--sm" id="reset" style="margin-top:18px">Wyczyść filtry</button>
   <div class="apply"><button class="btn btn--primary btn--block" data-close id="applyBtn">Pokaż produkty</button></div></aside>
   <div><div class="toolbar"><div style="display:flex;gap:10px;align-items:center"><button class="btn btn--ghost btn--sm m-only" id="openF">${I('filter',18)} Filtry</button><span id="count" aria-live="polite" style="color:var(--muted)"></span></div>
    <div style="display:flex;gap:8px;align-items:center"><label for="sort" class="sr">Sortuj</label><select class="input" id="sort"><option value="pop">Najpopularniejsze</option><option value="asc">Cena: od najniższej</option><option value="desc">Cena: od najwyższej</option><option value="name">Nazwa A–Z</option></select></div></div>
    <div class="active-f" id="activeF"></div><div class="pgrid p3d" id="list"></div></div></div></div>`;
  const render=()=>{
    let L=PB.products.filter(p=>(!S.cat||p.cat===S.cat)&&[...S.tags].every(t=>p.tags.includes(t))&&p.price<=S.max&&(!S.q||(p.name+p.desc+cat(p.cat).name).toLowerCase().includes(S.q.toLowerCase())));
    L.sort({pop:(a,b)=>b.rev-a.rev,asc:(a,b)=>a.price-b.price,desc:(a,b)=>b.price-a.price,name:(a,b)=>a.name.localeCompare(b.name,'pl')}[S.sort]);
    $('#list').innerHTML=L.length?L.map(pcard).join(''):`<div class="empty" style="grid-column:1/-1"><div class="art-wrap">${A.productArt(prod('migdaly'))}</div><h3>Nic nie znaleźliśmy</h3><p>Zmień filtry lub wyszukaj coś innego.</p><button class="btn btn--navy" id="reset2">Wyczyść filtry</button></div>`;
    $('#count').textContent=`${L.length} ${L.length===1?'produkt':L.length<5&&L.length>1?'produkty':'produktów'}`;$('#applyBtn').textContent=`Pokaż produkty (${L.length})`;
    const c=cat(S.cat);$('#shopTitle').textContent=S.q?`Wyniki: „${S.q}”`:c?c.name:'Sklep';$('#shopLead').textContent=c?c.desc:'Zdrowa żywność wybrana przez Monikę. Filtruj, sortuj i dodawaj do koszyka.';document.title=($('#shopTitle').textContent)+' – ProBazar';
    $('#pills').innerHTML=`<button class="chip" aria-pressed="${!S.cat}" data-pill="">Wszystko</button>`+PB.categories.map(c=>`<button class="chip" aria-pressed="${S.cat===c.id}" data-pill="${c.id}">${c.name}</button>`).join('');
    const act=[];if(S.q)act.push(['q',`Szukaj: ${S.q}`]);[...S.tags].forEach(t=>act.push(['t'+t,PB.tags[t]]));if(S.max<60)act.push(['max',`do ${S.max} zł`]);
    $('#activeF').innerHTML=act.map(a=>`<button class="chip" data-x="${a[0]}">${a[1]} ${I('close',14)}</button>`).join('');
    $$('input[name=cat]').forEach(i=>i.checked=i.value===S.cat);
  };
  $('#filters').addEventListener('change',e=>{const t=e.target;if(t.name==='cat')S.cat=t.value;if(t.name==='tag')t.checked?S.tags.add(t.value):S.tags.delete(t.value);if(t.id==='max'){S.max=+t.value}render()});
  $('#max').addEventListener('input',e=>{$('#maxv').textContent=e.target.value+' zł';S.max=+e.target.value;render()});
  $('#sort').onchange=e=>{S.sort=e.target.value;render()};
  $('#openF').onclick=()=>{$('#filters').classList.add('open');document.body.style.overflow='hidden'};
  const reset=()=>{S.cat='';S.tags.clear();S.max=60;S.q='';$$('input[name=tag]').forEach(i=>i.checked=false);$('#max').value=60;$('#maxv').textContent='60 zł';render()};
  document.addEventListener('click',e=>{const t=e.target.closest('[data-pill],[data-x],#reset,#reset2');if(!t)return;
    if(t.dataset.pill!==undefined){S.cat=t.dataset.pill}else if(t.dataset.x){const x=t.dataset.x;if(x==='q')S.q='';else if(x==='max'){S.max=60;$('#max').value=60;$('#maxv').textContent='60 zł'}else{S.tags.delete(x.slice(1));$$('input[name=tag]').forEach(i=>{if(i.value===x.slice(1))i.checked=false})}}else reset();
    render()});
  render();
};

R.produkt=()=>{
  const p=prod(qs.get('id'))||PB.products[0],c=cat(p.cat);document.title=p.name+' – ProBazar';
  const rs=PB.recipes.filter(r=>r.ing.some(i=>i[1]===p.id));
  const sim=PB.products.filter(x=>x.cat===p.cat&&x.id!==p.id).concat(PB.products.filter(x=>x.cat!==p.cat&&x.id!==p.id)).slice(0,4);
  const N=['Wartość energetyczna','Tłuszcz','w tym kwasy nasycone','Węglowodany','w tym cukry','Błonnik','Białko','Sól'],U=[' kcal',' g',' g',' g',' g',' g',' g',' g'];
  $main().innerHTML=`<div class="container"><nav class="crumbs" aria-label="Okruszki"><a href="index.html">Strona główna</a>${I('chevron',14)}<a href="sklep.html">Sklep</a>${I('chevron',14)}<a href="sklep.html?kat=${c.id}">${c.name}</a>${I('chevron',14)}<span>${p.name}</span></nav>
  <div class="pdp"><div class="pdp-gal">${A.productArt(p,1)}</div>
   <div class="pdp-info"><div class="chips" style="margin-bottom:12px">${p.badge?`<span class="pill pill--line">${p.badge}</span>`:''}${p.tags.map(t=>`<span class="pill pill--line">${PB.tags[t]}</span>`).join('')}</div>
    <h1>${p.name}</h1><div class="meta"><span class="stars" style="gap:2px">${[1,2,3,4,5].map(()=>I('star',14)).join('')}</span><span><b>${p.rating.toFixed(1).replace('.',',')}</b> (${p.rev} opinii)</span><span>${c.name}</span></div>
    <div class="pdp-price"><span class="price">${p.oldPrice?`<del>${zl(p.oldPrice)}</del><ins>${zl(p.price)}</ins>`:zl(p.price)}</span><span style="color:var(--muted)">${p.size} · ${zl(p.price/(p.per||parseFloat(p.size))*100)}/100 ${p.size.includes('ml')?'ml':'g'}</span></span></div>
    <p class="lead" style="color:var(--muted)">${p.desc}</p>
    <div class="pdp-buy"><div class="qty"><button id="qm" aria-label="Mniej">${I('minus',18)}</button><output id="qv" aria-live="polite">1</output><button id="qp" aria-label="Więcej">${I('plus',18)}</button></div><button class="btn btn--primary" id="buy">${I('cart',20)} Dodaj do koszyka</button></div>
    <ul class="perks"><li>${I('truck',22)} Wysyłka w 24 h · darmowa od ${PB.freeShip} zł</li><li>${I('shield',22)} 30 dni na zwrot bez podania przyczyny</li><li>${I('leaf',22)} Pakowane w opakowania nadające się do recyklingu</li></ul></div></div>
  <div><div class="tabs" role="tablist">${['Opis','Skład','Wartości odżywcze','Dostawa'].map((t,i)=>`<button role="tab" id="t${i}" aria-selected="${i==0}" aria-controls="tp${i}" data-tab="${i}">${t}</button>`).join('')}</div>
   <div class="tabpanel prose" id="tp0" role="tabpanel"><p>${p.desc}</p><p>Produkt wybrany przez Monikę i sprawdzony w jej kuchni. Przechowuj w suchym, chłodnym miejscu, z dala od światła. Po otwarciu zamknij szczelnie.</p></div>
   <div class="tabpanel prose" id="tp1" role="tabpanel" hidden><p><b>Skład:</b> ${p.ing}</p><p>Wartości i skład to dane demonstracyjne.</p></div>
   <div class="tabpanel" id="tp2" role="tabpanel" hidden><table class="nutri"><caption style="text-align:left;color:var(--muted);padding-bottom:8px">Wartości odżywcze w 100 ${p.size.includes('ml')?'ml':'g'}</caption><tbody>${N.map((n,i)=>`<tr class="${i==2||i==4?'sub':''}"><th scope="row">${n}</th><td>${p.n[i]}${U[i]}</td></tr>`).join('')}</tbody></table></div>
   <div class="tabpanel prose" id="tp3" role="tabpanel" hidden><p>Kurier (14,99 zł) lub Paczkomat (11,99 zł) – dostawa w 1–2 dni robocze. Odbiór osobisty w Poznaniu bezpłatny. Od ${PB.freeShip} zł dostawa gratis. <a href="faq.html">Szczegóły dostawy i zwrotów</a>.</p></div></div>
  ${rs.length?`<section class="section--tight" style="margin-top:20px"><div class="sec-head"><div><span class="eyebrow">Z przepisów Moniki</span><h2>Co z tego ugotujesz?</h2></div></div><div class="rgrid r3">${rs.slice(0,3).map(r=>rcard(r)).join('')}</div></section>`:''}
  <section class="section--tight" style="padding-bottom:56px"><div class="sec-head"><div><h2>Zobacz też</h2></div></div><div class="pgrid p4">${sim.map(pcard).join('')}</div></div></div>
  <div class="sticky-buy" id="sticky"><span class="price">${zl(p.price)}</span><button class="btn btn--primary" data-add="${p.id}">Dodaj do koszyka</button></div>`;
  let q=1;const set=n=>{q=Math.max(1,Math.min(20,n));$('#qv').textContent=q};$('#qm').onclick=()=>set(q-1);$('#qp').onclick=()=>set(q+1);
  $('#buy').onclick=()=>{Cart.add(p.id,q);toast(`Dodano ${q} × ${p.short}`,['koszyk.html','Koszyk'])};
  $$('[data-tab]').forEach(b=>b.onclick=()=>{$$('[data-tab]').forEach(x=>x.setAttribute('aria-selected',x===b));$$('.tabpanel').forEach((t,i)=>t.hidden=i!=b.dataset.tab)});
  const sb=$('#sticky');new IntersectionObserver(([e])=>sb.classList.toggle('show',!e.isIntersecting&&e.boundingClientRect.top<0)).observe($('#buy'));
};

R.koszyk=()=>{
  const draw=()=>{
    const L=Cart.lines(),T=Cart.totals(),cp=Cart.coupon();
    $main().innerHTML=`<div class="container"><nav class="crumbs" aria-label="Okruszki"><a href="index.html">Strona główna</a>${I('chevron',14)}<span>Koszyk</span></nav>
    <div class="stepper"><span class="s on"><span class="n">1</span>Koszyk</span><span class="sep"></span><span class="s"><span class="n">2</span>Dane i dostawa</span><span class="sep"></span><span class="s"><span class="n">3</span>Potwierdzenie</span></div>
    <div class="page-head" style="padding-top:8px"><h1>Twój koszyk</h1></div>
    ${L.length?`<div class="cart-layout"><div>${shipBar()}${L.map(l=>`<div class="citem"><div class="th">${A.productArt(l.p)}</div><div><h3><a href="produkt.html?id=${l.p.id}">${l.p.name}</a></h3><small style="color:var(--muted)">${l.p.size} · ${zl(l.p.price)}</small>
      <div class="ctl"><div class="qty"><button data-dec="${l.p.id}" aria-label="Mniej: ${esc(l.p.name)}">${I('minus',16)}</button><output>${l.q}</output><button data-inc="${l.p.id}" aria-label="Więcej: ${esc(l.p.name)}">${I('plus',16)}</button></div><b style="font-size:1.1rem">${zl(l.p.price*l.q)}</b><button class="remove" data-rm="${l.p.id}">${I('trash',16)} Usuń</button></div></div></div>`).join('')}
      <p style="margin-top:20px"><a class="link-arrow" href="sklep.html">← Kontynuuj zakupy</a></p></div>
     <aside class="summary"><h2>Podsumowanie</h2><div class="sum-row"><span>Produkty</span><span>${zl(T.sub)}</span></div>
      ${T.d?`<div class="sum-row disc"><span>Rabat ${PB.coupon.code} (−${PB.coupon.pct}%)</span><span>−${zl(T.d)}</span></div>`:''}
      <div class="sum-row"><span>Dostawa</span><span>${T.sh?'od '+zl(Math.min(...PB.ship.map(s=>s.price||99))):'0,00 zł'}</span></div>
      <form class="coupon" id="cpf"><label class="sr" for="cp">Kod rabatowy</label><input class="input" id="cp" placeholder="Kod rabatowy" value="${cp?PB.coupon.code:''}"><button class="btn btn--ghost btn--sm" type="submit">${cp?'Usuń':'Zastosuj'}</button></form><small id="cpm" style="color:var(--muted)">Wypróbuj kod <b>${PB.coupon.code}</b> (demo).</small>
      <div class="sum-row total"><span>Razem</span><span>${zl(T.sub-T.d)}</span></div><small style="color:var(--muted)">Koszt dostawy wybierzesz w następnym kroku.</small>
      <a class="btn btn--primary btn--block" style="margin-top:16px" href="zamowienie.html">Przejdź do zamówienia</a></aside></div>`
     :`<div class="empty"><div class="art-wrap">${A.productArt(prod('miod'))}</div><h2>Twój koszyk jest pusty</h2><p>Dodaj coś pysznego – zacznij od naszych ulubieńców.</p><a class="btn btn--primary" href="sklep.html">Idź do sklepu</a></div>
     <section class="section--tight" style="padding-bottom:56px"><h2>Polecamy</h2><div class="pgrid p4">${['migdaly','miod','matcha','oliwa'].map(i=>pcard(prod(i))).join('')}</div></section>`}</div>`;
    const f=$('#cpf');if(f)f.onsubmit=e=>{e.preventDefault();if(Cart.coupon()){store.set('pb_coupon',null);draw();return}const v=$('#cp').value.trim().toUpperCase();if(v===PB.coupon.code){store.set('pb_coupon',true);draw();toast('Kod rabatowy zastosowany')}else{$('#cpm').textContent='Nieprawidłowy kod.';$('#cpm').style.color='#B02A1D'}};
  };
  draw();document.addEventListener('cart:change',draw);
};

R.zamowienie=()=>{
  const last=store.get('pb_last_order',null);let ship=PB.ship[0].id;
  const f=(id,l,t='text',x='',ac='')=>`<div class="field"><label for="${id}">${l}</label><input class="input" id="${id}" name="${id}" type="${t}" ${x} autocomplete="${ac}"><div class="err-msg">Uzupełnij to pole.</div></div>`;
  const form=()=>{
    const L=Cart.lines();
    if(!L.length)return `<div class="container"><div class="empty"><div class="art-wrap">${A.productArt(prod('migdaly'))}</div><h2>Brak produktów do zamówienia</h2><p>Dodaj produkty do koszyka, aby przejść dalej.</p><a class="btn btn--primary" href="sklep.html">Idź do sklepu</a></div></div>`;
    const T=Cart.totals(ship);
    return `<div class="container"><div class="stepper"><span class="s done"><span class="n">${I('check',14)}</span>Koszyk</span><span class="sep"></span><span class="s on"><span class="n">2</span>Dane i dostawa</span><span class="sep"></span><span class="s"><span class="n">3</span>Potwierdzenie</span></div>
    <div class="page-head" style="padding-top:8px"><h1>Zamówienie</h1></div>
    <div class="demo-ban">${I('shield',20)}<span><b>Tryb demonstracyjny.</b> To prototyp – nie pobieramy płatności, a dane zostają tylko w Twojej przeglądarce.</span></div>
    <form class="co-layout" id="coForm" novalidate><div>
     <fieldset class="fs"><legend>1. Dane kontaktowe</legend><div class="row2">${f('name','Imię i nazwisko','text','required','name')}${f('email','E-mail','email','required','email')}</div>${f('phone','Telefon','tel','required','tel')}</fieldset>
     <fieldset class="fs"><legend>2. Adres dostawy</legend>${f('street','Ulica i numer','text','required','street-address')}<div class="row2">${f('zip','Kod pocztowy','text','required placeholder="00-000" inputmode="numeric"','postal-code')}${f('city','Miasto','text','required','address-level2')}</div></fieldset>
     <fieldset class="fs"><legend>3. Sposób dostawy</legend>${PB.ship.map((s,i)=>`<label class="opt"><input type="radio" name="ship" value="${s.id}" ${s.id===ship?'checked':''}><span class="t">${s.name}</span><b>${Cart.shipPrice(s.id)?zl(s.price):'Gratis'}</b></label>`).join('')}</fieldset>
     <fieldset class="fs"><legend>4. Płatność</legend>${[['blik','BLIK','Kod z aplikacji banku'],['card','Karta płatnicza','Visa, Mastercard'],['transfer','Szybki przelew','Wybierz swój bank'],['cod','Płatność przy odbiorze','+ 5,00 zł (demo)']].map((o,i)=>`<label class="opt"><input type="radio" name="pay" value="${o[0]}" ${i==0?'checked':''}><span class="t">${o[1]}<small>${o[2]}</small></span></label>`).join('')}</fieldset>
     <label class="check" style="margin-bottom:12px"><input type="checkbox" id="terms" required><span>Akceptuję <a href="faq.html">regulamin</a> i <a href="faq.html">politykę prywatności</a>.</span></label><div class="err-msg" id="termsErr">Zaakceptuj regulamin, aby kontynuować.</div></div>
     <aside class="summary"><h2>Twoje zamówienie</h2>${L.map(l=>`<div style="display:flex;gap:12px;align-items:center;padding:8px 0"><div style="width:52px;height:52px;border-radius:10px;overflow:hidden;flex:none">${A.productArt(l.p)}</div><div style="flex:1;line-height:1.3;font-size:.92rem">${l.p.name}<br><small style="color:var(--muted)">${l.q} × ${zl(l.p.price)}</small></div><b>${zl(l.p.price*l.q)}</b></div>`).join('')}
      <div style="border-top:1px solid var(--line);margin-top:10px;padding-top:10px"><div class="sum-row"><span>Produkty</span><span>${zl(T.sub)}</span></div>${T.d?`<div class="sum-row disc"><span>Rabat</span><span>−${zl(T.d)}</span></div>`:''}<div class="sum-row"><span>Dostawa</span><span>${T.sh?zl(T.sh):'Gratis'}</span></div><div class="sum-row total"><span>Do zapłaty</span><span>${zl(T.total)}</span></div></div>
      <button class="btn btn--primary btn--block" type="submit" style="margin-top:16px">Zamawiam i płacę (demo)</button><p style="font-size:.8rem;color:var(--muted);margin:12px 0 0;text-align:center">${I('shield',14)} Bezpieczne zamówienie</p></aside></form></div>`;
  };
  const thanks=o=>`<div class="container"><div class="stepper"><span class="s done"><span class="n">${I('check',14)}</span>Koszyk</span><span class="sep"></span><span class="s done"><span class="n">${I('check',14)}</span>Dane i dostawa</span><span class="sep"></span><span class="s on"><span class="n">3</span>Potwierdzenie</span></div>
   <div class="thanks"><div class="ok">${I('check',44)}</div><h1 style="font-size:clamp(1.9rem,5vw,2.8rem)">Dziękujemy za zamówienie!</h1><p class="lead">Numer zamówienia: <b>${o.no}</b>.<br>Potwierdzenie wysłaliśmy na adres <b>${esc(o.email)}</b> (demo).</p>
   <div class="card"><h3>Podsumowanie</h3>${o.lines.map(l=>`<div class="sum-row"><span>${l.q} × ${l.name}</span><span>${zl(l.q*l.price)}</span></div>`).join('')}<div class="sum-row"><span>Dostawa (${o.ship})</span><span>${o.sh?zl(o.sh):'Gratis'}</span></div><div class="sum-row total"><span>Razem</span><span>${zl(o.total)}</span></div><p style="margin:14px 0 0;color:var(--muted)">Dostawa pod adres: ${esc(o.addr)}</p></div>
   <p>Na czas oczekiwania zajrzyj do przepisów Moniki – znajdziesz tam pomysły na swoje nowe produkty.</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><a class="btn btn--primary" href="blog.html">Przepisy Moniki</a><a class="btn btn--ghost" href="index.html">Strona główna</a></div></div></div>`;
  const draw=()=>{
    if(qs.get('ok')&&last){$main().innerHTML=thanks(last);return}
    $main().innerHTML=form();const F=$('#coForm');if(!F)return;
    bind();
  };
  function bind(){const F=$('#coForm');F.addEventListener('change',e=>{if(e.target.name==='ship'){ship=e.target.value;const keep=Object.fromEntries(new FormData(F));const sc=scrollY;$main().innerHTML=form();const G=$('#coForm');Object.entries(keep).forEach(([k,v])=>{const el=G.elements[k];if(!el)return;if(el.length)[...el].forEach(r=>r.checked=r.value===v);else if(el.type!=='checkbox')el.value=v});scrollTo(0,sc);bind()}},{once:true});
   F.addEventListener('submit',e=>{e.preventDefault();let ok=true,first=null;
    $$('.input[required]',F).forEach(i=>{const bad=!i.value.trim()||(i.type==='email'&&!/^\S+@\S+\.\S+$/.test(i.value));i.classList.toggle('err',bad);if(bad){ok=false;first=first||i}});
    const t=$('#terms');$('#termsErr').style.display=t.checked?'none':'block';if(!t.checked){ok=false;first=first||t}
    if(!ok){first.focus();return}
    const d=Object.fromEntries(new FormData(F)),T=Cart.totals(ship),sh=PB.ship.find(s=>s.id===ship);
    const o={no:'PB-'+Math.floor(10000+Math.random()*89999),email:d.email,addr:`${d.street}, ${d.zip} ${d.city}`,ship:sh.name.split(' (')[0],sh:T.sh,total:T.total,lines:Cart.lines().map(l=>({q:l.q,name:l.p.name,price:l.p.price}))};
    store.set('pb_last_order',o);Cart.clear();store.set('pb_coupon',null);location.href='zamowienie.html?ok=1'});
   $$('.input',F).forEach(i=>i.addEventListener('input',()=>i.classList.remove('err')))}
  draw();
};

R.blog=()=>{
  const cats=['Wszystkie',...new Set(PB.recipes.map(r=>r.cat))];let cur='Wszystkie';
  $main().innerHTML=`<div class="container"><nav class="crumbs" aria-label="Okruszki"><a href="index.html">Strona główna</a>${I('chevron',14)}<span>Blog Moniki</span></nav>
  <div class="page-head page-head--img">${A.img('blog','',1400,700,1)}<div><span class="eyebrow">Blog kulinarny</span><h1>Kuchnia Moniki</h1><p class="lead">Proste, sezonowe przepisy z produktami, które znajdziesz w naszym sklepie. Do każdego – lista zakupów jednym kliknięciem.</p></div></div>
  <div id="feat"></div><div class="chips" style="margin:28px 0 24px" id="bchips"></div><div class="rgrid r3" id="blist" style="padding-bottom:56px"></div></div>`;
  const draw=()=>{const f=PB.recipes[0];
    $('#feat').innerHTML=cur==='Wszystkie'?`<article class="feat"><div class="im">${A.recipeArt(f)}</div><div class="tx"><span class="eyebrow">Przepis tygodnia</span><h2><a href="przepis.html?id=${f.id}">${f.title}</a></h2><p style="color:var(--muted)">${f.intro}</p><div class="meta"><span>${I('clock',16)} ${f.time} min</span><span>${I('users',16)} ${f.serv} porcji</span><span>${I('flame',16)} ${f.kcal} kcal</span></div><span class="link-arrow">Czytaj przepis ${I('chevron',18)}</span></div></article>`:'';
    const L=PB.recipes.filter((r,i)=>cur==='Wszystkie'?i>0:r.cat===cur);$('#blist').innerHTML=L.map(r=>rcard(r)).join('')||'<p>Brak przepisów w tej kategorii.</p>';
    $('#bchips').innerHTML=cats.map(c=>`<button class="chip" aria-pressed="${c===cur}" data-c="${c}">${c}</button>`).join('')};
  $main().addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(b){cur=b.dataset.c;draw()}});draw();
};

R.przepis=()=>{
  const r=rec(qs.get('id'))||PB.recipes[0];document.title=r.title+' – ProBazar';
  const ids=[...new Set(r.ing.map(i=>i[1]).filter(Boolean))],shop=ids.map(prod),sum=shop.reduce((a,p)=>a+p.price,0);
  const others=PB.recipes.filter(x=>x.id!==r.id).slice(0,3);
  $main().innerHTML=`<div class="container"><nav class="crumbs" aria-label="Okruszki"><a href="index.html">Strona główna</a>${I('chevron',14)}<a href="blog.html">Blog</a>${I('chevron',14)}<span>${r.cat}</span></nav>
  <div class="recipe-hero"><div><span class="eyebrow">${r.cat}</span><h1 style="font-size:clamp(1.9rem,5vw,3rem)">${r.title}</h1><p class="lead" style="color:var(--muted)">${r.intro}</p>
   <div class="stat-row"><div class="stat">${I('clock',24)}<span><b>${r.time} min</b><small>czas</small></span></div><div class="stat">${I('users',24)}<span><b>${r.serv}</b><small>porcji</small></span></div><div class="stat">${I('chef',24)}<span><b>${r.level}</b><small>poziom</small></span></div><div class="stat">${I('flame',24)}<span><b>${r.kcal} kcal</b><small>na porcję</small></span></div></div>
   <div class="chips">${r.tags.map(t=>`<span class="pill pill--line">${PB.tags[t]}</span>`).join('')}<button class="chip" onclick="window.print()">Drukuj przepis</button></div></div><div class="im">${A.recipeArt(r,1)}</div></div>
  <div class="recipe-body"><aside><div class="card" style="margin-bottom:20px"><h2 style="font-size:1.5rem">Składniki</h2><ul class="ings">${r.ing.map((i,k)=>`<li><label><input type="checkbox"><span>${i[0]}${i[1]?` <a class="shop-tag" href="produkt.html?id=${i[1]}" title="Kup w sklepie">${I('cart',12)} sklep</a>`:''}</span></label></li>`).join('')}</ul></div>
   ${shop.length?`<div class="buy-box"><h3>${I('cart',24)} Kup składniki</h3><p style="color:var(--muted);font-size:.92rem;margin-bottom:6px">Produkty z tego przepisu dostępne w ProBazarze:</p>${shop.map(p=>`<a class="buy-item" href="produkt.html?id=${p.id}"><span class="th">${A.productArt(p)}</span><span><b>${p.name}</b><small>${p.size}</small></span><span class="price">${zl(p.price)}</span></a>`).join('')}
    <button class="btn btn--primary btn--block" id="addAll" style="margin-top:16px">Dodaj wszystko do koszyka · ${zl(sum)}</button></div>`:''}</aside>
   <div><h2>Przygotowanie</h2><ol class="steps">${r.steps.map(s=>`<li><p>${s}</p></li>`).join('')}</ol><div class="tip"><b>Wskazówka Moniki:</b> ${r.tip}</div>
   <div class="author" style="margin-top:28px"><div class="ph">${A.avatar()}</div><div><b>Monika</b><br><span style="color:var(--muted);font-size:.92rem">Autorka bloga. Gotuje prosto, sezonowo i bez kompromisów w smaku.</span> <a href="o-nas.html">Poznaj ją</a></div></div></div></div>
  <section class="section"><div class="sec-head"><h2>Zobacz też</h2></div><div class="rgrid r3">${others.map(x=>rcard(x)).join('')}</div></section></div>`;
  const b=$('#addAll');if(b)b.onclick=()=>{ids.forEach(i=>Cart.add(i));toast(`Dodano ${ids.length} produkty do koszyka`,['koszyk.html','Koszyk'])};
};

R.wideo=()=>{
  const f=PB.videos[0],cats=['Wszystkie',...new Set(PB.videos.map(v=>v.cat))];let cur='Wszystkie';
  $main().innerHTML=`<div class="container"><nav class="crumbs" aria-label="Okruszki"><a href="index.html">Strona główna</a>${I('chevron',14)}<span>Wideo</span></nav>
  <div class="page-head"><span class="eyebrow">Kanał ProBazar</span><h1>Wideo</h1><p class="lead">Kanał na YouTube dopiero powstaje. Poniżej zapowiedź tego, co przygotowujemy – miniatury i tytuły są poglądowe.</p></div>
  <div class="video-hero" style="margin-bottom:40px"><button class="vcard" data-video="${f.id}" style="flex:1"><div class="vthumb">${A.videoArt(f)}<span class="pill soon">Wkrótce</span><span class="play"><span>${I('play',22)}</span></span><span class="dur">${f.dur}</span></div></button>
   <div><span class="eyebrow">Na start</span><h2>${f.title}</h2><p style="color:var(--muted)">Pierwszy odcinek pokaże pięć śniadań, które przygotujesz w kwadrans – z produktów ze sklepu ProBazar.</p><a class="btn btn--ghost" href="#" onclick="return false" aria-disabled="true">Subskrybuj kanał (wkrótce)</a></div></div>
  <div class="chips" id="vchips" style="margin-bottom:24px"></div><div class="grid grid-3" id="vlist" style="padding-bottom:56px"></div></div>`;
  const draw=()=>{$('#vchips').innerHTML=cats.map(c=>`<button class="chip" aria-pressed="${c===cur}" data-c="${c}">${c}</button>`).join('');$('#vlist').innerHTML=PB.videos.filter(v=>cur==='Wszystkie'||v.cat===cur).map(v=>vcard(v)).join('')};
  $main().addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(b){cur=b.dataset.c;draw()}});draw();
};

R.static=()=>{const m=$('[data-ph="avatar"]');if(m)m.innerHTML=A.avatar();$$('[data-icon]').forEach(e=>e.innerHTML=I(e.dataset.icon,+e.dataset.size||24));
  $$('[data-recipes]').forEach(e=>e.innerHTML=PB.recipes.slice(0,3).map(r=>rcard(r)).join(''))};

chrome();
(R[page]||R.static)();
})();
