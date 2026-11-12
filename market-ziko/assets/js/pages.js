const PG={};
PG.index=()=>{
 const sale=P.filter(p=>p.o).slice(0,8),neu=P.filter(p=>p.k).concat(P.filter(p=>!p.k).slice(0,3)).slice(0,8);
 $('#app').innerHTML=`
<section class="hero"><div class="wrap"><div><span class="eyebrow"><i></i>Hydraulika · ogrzewanie · łazienka · narzędzia</span>
<h1>Wszystko do domu <em>w jednym</em> sklepie</h1><p>Piece, grzejniki, pompy, armatura i narzędzia od sprawdzonych producentów. Doradzimy, dowieziemy i pomożemy w zleceniu.</p>
<div class="cta"><a class="btn" href="kategoria.html">Przeglądaj sklep ${icon('arrow','')}</a><a class="btn ghost" href="info.html?s=zlecenia">Zleć wykonanie</a></div>
<div class="hero-stats"><div><b>5000+</b><span>produktów</span></div><div><b>40+</b><span>marek</span></div><div><b>24 h</b><span>wysyłka</span></div></div></div>
<div class="hero-art">${[5,1,12,16].map(id=>{const p=P.find(x=>x.id===id);return `<a href="produkt.html?id=${p.id}">${art(p.t)}<b>${p.b}</b><span>${zl(p.p)}</span></a>`}).join('')}</div></div></section>
<section class="trust"><div class="wrap"><div>${icon('truck')}<span><b>Darmowa dostawa</b><small>przy zamówieniach od 500 zł</small></span></div><div>${icon('card')}<span><b>Raty Santander</b><small>decyzja online w kilka minut</small></span></div><div>${icon('shield')}<span><b>Gwarancja producentów</b><small>oryginalne towary z fakturą</small></span></div><div>${icon('phone')}<span><b>Doradztwo</b><small>+48 18 477 85 60</small></span></div></div></section>
<section class="sec"><div class="wrap">${sectionHead('Kategorie','Wybierz dział i znajdź to, czego potrzebujesz',['kategoria.html','Wszystkie produkty'])}
<div class="cats">${CATS.map(c=>`<a class="cat" href="kategoria.html?c=${c.id}"><div class="ic">${icon(c.i)}</div><h3>${c.n}</h3><ul>${c.s.map(s=>`<li>${s}</li>`).join('')}</ul><span class="go">Zobacz wszystkie ${icon('arrow','')}</span></a>`).join('')}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap">${sectionHead('Promocje','Obniżone ceny na wybrane produkty',['promocje.html','Wszystkie promocje'])}<div class="scroller">${sale.map(card).join('')}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="banner"><div class="t"><h2>Masz zlecenie? Wykonamy je za Ciebie</h2><p>Montaż instalacji c.o., wymiana grzejników, modernizacja łazienki – wyślij opis, a przygotujemy bezpłatną wycenę.</p><a class="btn" href="info.html?s=zlecenia">Poproś o wycenę</a></div><div class="art">${icon('tool')}</div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap">${sectionHead('Nowości','Świeżo w ofercie')}<div class="scroller">${neu.map(card).join('')}</div></div></section>
<section class="brands" aria-label="Marki"><div class="track">${BRANDS.concat(BRANDS).map(b=>`<span>${b}</span>`).join('')}</div></section>
<section class="sec"><div class="wrap">${sectionHead('Poradnik','Porady ekspertów: jak wybierać i montować',['blog.html','Wszystkie wpisy'])}<div class="posts">${POSTS.slice(0,3).map(postCard).join('')}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="news"><div><h2>Bądź na bieżąco</h2><p>Zapisz się do newslettera – promocje i nowości prosto na maila.</p></div><form id="nl"><input type="email" required placeholder="twój e-mail" aria-label="E-mail"><button class="btn">Zapisz się</button></form></div></div></section>`;
 $('#nl').onsubmit=e=>{e.preventDefault();e.target.innerHTML='<b style="font-size:18px">Dziękujemy! Sprawdź skrzynkę ✔</b>'};
};

PG.kategoria=()=>{
 const cid=q('c'),sub=q('sub'),sq=(q('q')||'').toLowerCase(),c=cid&&cat(cid);
 let st={subs:sub?[sub]:[],brands:[],max:5000,sort:'def'};
 const base=()=>P.filter(p=>(!cid||p.c===cid)&&(!sq||(p.n+p.b+p.s).toLowerCase().includes(sq)));
 const b0=base(),maxP=Math.ceil(Math.max(...b0.map(p=>p.p),100)/50)*50;st.max=maxP;
 $('#app').innerHTML=`<div class="wrap"><div class="crumbs"><a href="index.html">Strona główna</a>›<a href="kategoria.html">Sklep</a>${c?`›<span>${c.n}</span>`:''}</div>
<div class="phead"><h1>${sq?`Wyniki: „${q('q')}”`:c?c.n:'Wszystkie produkty'}</h1><p id="cnt"></p></div>
<div class="layout"><aside class="side" id="side"></aside><div><div class="toolbar"><button class="btn ghost sm fbtn" id="fb">Filtry</button><span class="cnt" id="cnt2"></span>
<select id="sort" aria-label="Sortuj"><option value="def">Sortuj: polecane</option><option value="asc">Cena: rosnąco</option><option value="desc">Cena: malejąco</option><option value="az">Nazwa A–Z</option></select></div><div class="pgrid" id="grid"></div></div></div></div>`;
 const brands=[...new Set(b0.map(p=>p.b))].sort(),subs=c?c.s:[...new Set(b0.map(p=>p.s))];
 const draw=()=>{let r=b0.filter(p=>(!st.subs.length||st.subs.includes(p.s))&&(!st.brands.length||st.brands.includes(p.b))&&p.p<=st.max);
  if(st.sort==='asc')r.sort((a,b)=>a.p-b.p);if(st.sort==='desc')r.sort((a,b)=>b.p-a.p);if(st.sort==='az')r.sort((a,b)=>a.n.localeCompare(b.n,'pl'));
  $('#grid').innerHTML=r.length?r.map(card).join(''):'<div class="empty"><h3>Brak produktów</h3><p>Zmień filtry lub wróć do <a class="link-more" href="kategoria.html">całej oferty</a>.</p></div>';
  $('#cnt').textContent=$('#cnt2').textContent=r.length+' produktów';$('#maxv').textContent=zl(st.max)};
 $('#side').innerHTML=`<div class="grp"><h4>Kategorie</h4>${CATS.map(x=>`<a class="chk" href="kategoria.html?c=${x.id}" style="${x.id===cid?'color:var(--red);font-weight:700':''}">${x.n}</a>`).join('')}</div>
 <div class="grp"><h4>Podkategoria</h4>${subs.map(s=>`<label class="chk"><input type="checkbox" data-f="subs" value="${s}" ${st.subs.includes(s)?'checked':''}>${s}<small>${b0.filter(p=>p.s===s).length}</small></label>`).join('')}</div>
 <div class="grp"><h4>Marka</h4>${brands.map(b=>`<label class="chk"><input type="checkbox" data-f="brands" value="${b}">${b}<small>${b0.filter(p=>p.b===b).length}</small></label>`).join('')}</div>
 <div class="grp"><h4>Cena do: <span id="maxv"></span></h4><input type="range" id="rng" min="10" max="${maxP}" step="10" value="${maxP}" aria-label="Cena maksymalna"></div>`;
 $('#side').onchange=e=>{const f=e.target.dataset.f;if(f){st[f]=$$(`[data-f=${f}]:checked`).map(i=>i.value);draw()}};
 $('#rng').oninput=e=>{st.max=+e.target.value;draw()};$('#sort').onchange=e=>{st.sort=e.target.value;draw()};
 $('#fb').onclick=()=>$('#side').classList.toggle('on');draw();
};

PG.promocje=()=>{const r=P.filter(p=>p.o);$('#app').innerHTML=`<div class="wrap"><div class="crumbs"><a href="index.html">Strona główna</a>›<span>Promocje</span></div><div class="phead"><h1>Promocje</h1><p>${r.length} produktów w obniżonych cenach</p></div><div class="pgrid" style="margin-bottom:40px">${r.map(card).join('')}</div></div>`};

PG.produkt=()=>{
 const p=P.find(x=>x.id==q('id'))||P[0],c=cat(p.c),rel=P.filter(x=>x.c===p.c&&x.id!==p.id).concat(P.filter(x=>x.c!==p.c)).slice(0,4);
 $('#app').innerHTML=`<div class="wrap"><div class="crumbs"><a href="index.html">Strona główna</a>›<a href="kategoria.html?c=${c.id}">${c.n}</a>›<span>${p.s}</span></div>
<div class="pp"><div class="gal"><div class="big">${art(p.t)}</div><div class="th"><i></i><i></i><i></i><i></i></div></div>
<div class="info"><span class="br">${p.b}</span><h1>${p.n}</h1><span class="stock">Dostępny – wysyłka w 24 h</span>
<p class="lead" style="margin-top:14px">Produkt z kategorii <b>${p.s}</b>. Oryginalny towar z polskiej dystrybucji, z fakturą VAT i gwarancją producenta.</p>
<div class="pbox"><div class="price">${p.o?`<span class="old">${zl(p.o)}</span>`:''}${zl(p.p)}</div><div class="vat">cena brutto, zawiera 23% VAT</div>
<div class="buyrow"><div class="qty"><button id="m" aria-label="Mniej">−</button><input id="qn" value="1" inputmode="numeric" aria-label="Ilość"><button id="pl" aria-label="Więcej">+</button></div><button class="btn" id="buy">${icon('cart')} Dodaj do koszyka</button></div></div>
<div class="perks"><div>${icon('check')}Darmowa dostawa od 500 zł</div><div>${icon('check')}Raty Santander od ${zl(Math.max(p.p/10,1))} / mies.</div><div>${icon('check')}14 dni na zwrot</div><div>${icon('check')}Odbiór osobisty w sklepie</div></div></div></div>
<div class="tabs"><div class="tabbar"><button class="on" data-t="0">Opis</button><button data-t="1">Parametry</button><button data-t="2">Dostawa i zwroty</button></div>
<div class="tabpane on"><p>${p.n} to sprawdzone rozwiązanie dla instalacji domowych i warsztatowych. Solidne wykonanie, łatwy montaż i szeroka dostępność akcesoriów. Zapytaj naszych doradców o dobór pozostałych elementów systemu.</p></div>
<div class="tabpane"><table class="spec"><tr><td>Producent</td><td>${p.b}</td></tr><tr><td>Kategoria</td><td>${c.n}</td></tr><tr><td>Typ</td><td>${p.s}</td></tr><tr><td>Kod produktu</td><td>ZK-${String(p.id).padStart(4,'0')}</td></tr><tr><td>Gwarancja</td><td>24 miesiące</td></tr></table></div>
<div class="tabpane"><p>Wysyłamy kurierem, Pocztą Polską oraz transportem paletowym JAS-FBG (towary ciężkie). Zamówienia złożone do 14:00 wysyłamy tego samego dnia. Na zwrot masz 14 dni od otrzymania przesyłki.</p></div></div>
<section class="sec" style="padding-bottom:0">${sectionHead('Podobne produkty')}<div class="pgrid">${rel.map(card).join('')}</div></section></div>`;
 const qn=$('#qn');$('#m').onclick=()=>qn.value=Math.max(1,+qn.value-1);$('#pl').onclick=()=>qn.value=+qn.value+1;
 $('#buy').onclick=()=>{Cart.add(p.id,Math.max(1,+qn.value||1));toast('Dodano do koszyka')};
 $$('.tabbar button').forEach(b=>b.onclick=()=>{$$('.tabbar button').forEach(x=>x.classList.toggle('on',x===b));$$('.tabpane').forEach((t,i)=>t.classList.toggle('on',i==b.dataset.t))});
};

PG.koszyk=()=>{
 const draw=()=>{const L=Cart.lines(),t=Cart.total(),free=500;
 $('#app').innerHTML=`<div class="wrap"><div class="crumbs"><a href="index.html">Strona główna</a>›<span>Koszyk</span></div><div class="phead"><h1>Koszyk</h1></div>`+(!L.length?`<div class="empty box" style="padding:64px;text-align:center"><h3 style="margin-bottom:10px">Twój koszyk jest pusty</h3><p style="margin-bottom:20px;color:var(--mut)">Dodaj produkty, aby złożyć zamówienie.</p><a class="btn" href="kategoria.html">Przejdź do sklepu</a></div></div>`:
 `<div class="cartl"><div class="box">${L.map(l=>`<div class="ci"><a class="im" href="produkt.html?id=${l.p.id}">${art(l.p.t)}</a><div><h4><a href="produkt.html?id=${l.p.id}">${l.p.n}</a></h4><small>${l.p.b} · ${zl(l.p.p)} / szt.</small></div>
 <div class="rt"><div class="price">${zl(l.p.p*l.n)}</div><div class="qty"><button data-q="${l.p.id}" data-d="-1" aria-label="Mniej">−</button><input value="${l.n}" readonly><button data-q="${l.p.id}" data-d="1" aria-label="Więcej">+</button></div><button class="rm" data-rm="${l.p.id}">Usuń</button></div></div>`).join('')}</div>
 <aside class="box sum"><h3>Podsumowanie</h3><div class="row"><span>Produkty</span><span>${zl(t)}</span></div><div class="row"><span>Dostawa</span><span>${t>=free?'0,00 zł':'od 14,90 zł'}</span></div>
 <div class="ship">${t>=free?'🎉 Masz darmową dostawę!':`Do darmowej dostawy brakuje <b>${zl(free-t)}</b>`}<div class="bar"><i style="width:${Math.min(100,t/free*100)}%"></i></div></div>
 <div class="row tot"><span>Razem</span><span>${zl(t)}</span></div><a class="btn full" href="zamowienie.html">Przejdź do zamówienia ${icon('arrow','')}</a><a class="btn ghost full" style="margin-top:10px" href="kategoria.html">Kontynuuj zakupy</a></aside></div></div>`);};
 draw();document.addEventListener('click',e=>{const b=e.target.closest('[data-q],[data-rm]');if(!b)return;
  if(b.dataset.rm)Cart.rm(+b.dataset.rm);else{const l=Cart.get().find(x=>x.id==b.dataset.q);Cart.setQty(+b.dataset.q,l.n+ +b.dataset.d)}draw()});
};

PG.zamowienie=()=>{
 const L=Cart.lines(),t=Cart.total();
 if(q('konto')){$('#app').innerHTML=`<div class="wrap"><div class="crumbs"><a href="index.html">Strona główna</a>›<span>Moje konto</span></div><div class="phead"><h1>Moje konto</h1></div><div class="contact"><div class="box"><h3>Zaloguj się</h3><form class="fgrid" onsubmit="event.preventDefault();location.href='index.html'"><div class="fld w"><label>E-mail</label><input type="email" required></div><div class="fld w"><label>Hasło</label><input type="password" required></div><div class="w"><button class="btn full">Zaloguj</button></div></form></div><div class="box"><h3>Nowy klient</h3><p style="margin-bottom:16px;color:var(--ink2)">Załóż konto, aby śledzić zamówienia, zapisywać adresy i zamawiać szybciej.</p><a class="btn dark" href="#">Zarejestruj się</a></div></div></div>`;return}
 if(!L.length){$('#app').innerHTML=`<div class="wrap"><div class="box" style="margin:40px 0;text-align:center;padding:60px"><h3>Koszyk jest pusty</h3><p style="margin:10px 0 20px;color:var(--mut)">Dodaj produkty, aby złożyć zamówienie.</p><a class="btn" href="kategoria.html">Do sklepu</a></div></div>`;return}
 $('#app').innerHTML=`<div class="wrap"><div class="crumbs"><a href="index.html">Strona główna</a>›<a href="koszyk.html">Koszyk</a>›<span>Zamówienie</span></div><div class="phead"><h1>Zamówienie</h1></div>
 <div class="steps"><span class="on"><i>1</i>Koszyk</span><span class="on"><i>2</i>Dane i dostawa</span><span><i>3</i>Potwierdzenie</span></div>
 <form class="cartl" id="of"><div style="display:grid;gap:20px"><div class="box"><h3>Dane odbiorcy</h3><div class="fgrid"><div class="fld"><label>Imię</label><input required></div><div class="fld"><label>Nazwisko</label><input required></div><div class="fld"><label>E-mail</label><input type="email" required></div><div class="fld"><label>Telefon</label><input type="tel" required></div><div class="fld w"><label>Ulica i numer</label><input required></div><div class="fld"><label>Kod pocztowy</label><input required pattern="[0-9]{2}-[0-9]{3}" placeholder="00-000"></div><div class="fld"><label>Miejscowość</label><input required></div></div></div>
 <div class="box"><h3>Dostawa</h3>${FLOW.map((f,i)=>`<label class="opt"><input type="radio" name="ship" value="${f[3]}" ${i==0?'checked':''}><span><b>${f[1]}</b><small>${f[2]}</small></span><span class="pr">${f[3]?zl(f[3]):'0,00 zł'}</span></label>`).join('')}</div>
 <div class="box"><h3>Płatność</h3>${PAY.map((f,i)=>`<label class="opt"><input type="radio" name="pay" value="${f[0]}" ${i==0?'checked':''}><span><b>${f[1]}</b><small>${f[2]}</small></span></label>`).join('')}</div></div>
 <aside class="box sum"><h3>Twoje zamówienie</h3>${L.map(l=>`<div class="row"><span>${l.n}× ${l.p.n.slice(0,30)}…</span><span>${zl(l.p.p*l.n)}</span></div>`).join('')}<div class="row"><span>Dostawa</span><span id="sh"></span></div><div class="row tot"><span>Razem</span><span id="tt"></span></div>
 <label class="chk" style="margin-top:10px"><input type="checkbox" required> Akceptuję regulamin sklepu</label><button class="btn full" style="margin-top:8px">Zamawiam i płacę</button></aside></form></div>`;
 const upd=()=>{const s=t>=500&&+$('[name=ship]:checked').value<80?0:+$('[name=ship]:checked').value;const pb=$('[name=pay]:checked').value==='pobranie'?5:0;$('#sh').textContent=zl(s+pb);$('#tt').textContent=zl(t+s+pb)};
 $('#of').onchange=upd;upd();
 $('#of').onsubmit=e=>{e.preventDefault();const no='ZK/'+new Date().getFullYear()+'/'+Math.floor(10000+Math.random()*89999);Cart.clear();
  $('#app').innerHTML=`<div class="wrap"><div class="box done-box" style="margin:40px 0"><div class="ok">${icon('check')}</div><h2>Dziękujemy za zamówienie!</h2><p style="color:var(--ink2);margin-bottom:6px">Numer zamówienia: <b>${no}</b></p><p style="color:var(--mut);margin-bottom:24px">Potwierdzenie wysłaliśmy na Twój adres e-mail. To prototyp – zamówienie nie zostało zapisane.</p><a class="btn" href="index.html">Wróć na stronę główną</a></div></div>`;scrollTo(0,0)};
};

PG.blog=()=>{$('#app').innerHTML=`<div class="wrap"><div class="crumbs"><a href="index.html">Strona główna</a>›<span>Poradnik</span></div><div class="phead"><h1>Poradnik</h1><p>Porady, jak wybierać, montować i konserwować</p></div><div class="posts" style="margin-bottom:40px">${POSTS.map(postCard).join('')}</div></div>`};
PG.wpis=()=>{const p=POSTS.find(x=>x.id==q('id'))||POSTS[0];$('#app').innerHTML=`<div class="wrap"><div class="crumbs"><a href="index.html">Strona główna</a>›<a href="blog.html">Poradnik</a>›<span>${p.t}</span></div><div class="article" style="margin-bottom:40px"><div class="cv" style="background:${p.c}">${icon(p.i)}</div><span class="meta">Poradnik · ${p.d}</span><h1>${p.t}</h1><p><b>${p.x}</b></p>${p.body.map(b=>b.startsWith('<')?b:`<p>${b}</p>`).join('')}<div style="margin-top:28px"><a class="btn" href="kategoria.html">Zobacz produkty ${icon('arrow','')}</a></div></div>
<section class="sec" style="padding-top:0">${sectionHead('Czytaj także')}<div class="posts">${POSTS.filter(x=>x.id!==p.id).slice(0,3).map(postCard).join('')}</div></section></div>`};

const INFO={
'o-firmie':['O firmie','<p>Market ZIKO to rodzinny sklep budowlany z wieloletnim doświadczeniem. Specjalizujemy się w ogrzewaniu, hydraulice i wyposażeniu łazienek, ale w ofercie znajdziesz też narzędzia, elektrykę i chemię budowlaną.</p><h2>Dlaczego my</h2><ul><li>ponad 5000 produktów od renomowanych marek,</li><li>fachowe doradztwo przy doborze urządzeń,</li><li>szybka wysyłka i odbiór osobisty,</li><li>realizacja zleceń montażowych.</li></ul>'],
'dostawa':['Dostawa','<p>Zamówienia złożone do 14:00 wysyłamy tego samego dnia roboczego.</p><h2>Koszty wysyłki</h2><ul><li>Kurier (FedEx / DPD) – 19,90 zł,</li><li>Poczta Polska – 14,90 zł,</li><li>Transport paletowy JAS-FBG – od 89 zł,</li><li>Odbiór osobisty – 0 zł.</li></ul><p>Przy zamówieniach od <b>500 zł</b> wysyłka kurierem i pocztą jest darmowa.</p>'],
'regulamin':['Regulamin','<p>Pełny regulamin sklepu zostanie zamieszczony tutaj. Prototyp zawiera treść poglądową.</p><h2>§1 Postanowienia ogólne</h2><p>Regulamin określa zasady korzystania ze sklepu internetowego Market ZIKO.</p>'],
'reklamacje':['Reklamacje','<p>Masz problem z zakupionym towarem? Napisz na <b>sklep@market-ziko.pl</b> lub zadzwoń. Reklamację rozpatrujemy w ciągu 14 dni.</p>'],
'zwrot':['Zwrot','<p>Masz 14 dni na odstąpienie od umowy bez podania przyczyny. Towar odeślij w oryginalnym opakowaniu.</p>'],
'wymiana':['Wymiana','<p>Chcesz wymienić towar na inny rozmiar lub model? Skontaktuj się z nami – ustalimy szczegóły i pokryjemy różnicę w cenie.</p>'],
'zlecenia':['Zlecenia','<p>Wykonujemy instalacje c.o., wod-kan, łazienki oraz montaż urządzeń grzewczych. Wyślij opis zlecenia, a wrócimy z bezpłatną wyceną.</p>@FORM']};
PG.info=()=>{const s=INFO[q('s')]?q('s'):'o-firmie',[t,b]=INFO[s];
 $('#app').innerHTML=`<div class="wrap"><div class="crumbs"><a href="index.html">Strona główna</a>›<span>${t}</span></div><div class="iplay" style="margin-bottom:40px"><nav class="inav">${Object.entries(INFO).map(([k,v])=>`<a href="info.html?s=${k}" class="${k===s?'on':''}">${v[0]}</a>`).join('')}</nav>
 <div class="article"><span class="meta">Informacje</span><h1>${t}</h1>${b.replace('@FORM',`<form class="fgrid" id="zf" style="margin-top:20px"><div class="fld"><label>Imię i nazwisko</label><input required></div><div class="fld"><label>Telefon</label><input type="tel" required></div><div class="fld w"><label>E-mail</label><input type="email" required></div><div class="fld w"><label>Opis zlecenia</label><textarea required placeholder="Np. wymiana 5 grzejników w domu 120 m²…"></textarea></div><div class="w"><button class="btn">Wyślij zapytanie</button></div></form>`)}</div></div></div>`;
 const f=$('#zf');if(f)f.onsubmit=e=>{e.preventDefault();f.innerHTML='<div class="w"><b style="font-size:20px">Dziękujemy! Odezwiemy się w ciągu 24 h ✔</b></div>'}};
PG.kontakt=()=>{$('#app').innerHTML=`<div class="wrap"><div class="crumbs"><a href="index.html">Strona główna</a>›<span>Kontakt</span></div><div class="phead"><h1>Kontakt</h1><p>Chętnie pomożemy – zadzwoń lub napisz</p></div><div class="contact" style="margin-bottom:40px"><div class="cinfo"><div class="box">${icon('phone')}<div><b>+48 (18) 477 85 60</b><span>+48 507 013 078 · pn–pt 7:00–17:00</span></div></div><div class="box">${icon('mail')}<div><b>sklep@market-ziko.pl</b><span>Odpowiadamy w ciągu 24 godzin</span></div></div><div class="box">${icon('pin')}<div><b>Odbiór osobisty</b><span>Adres sklepu – do uzupełnienia</span></div></div><div class="map">Mapa (placeholder)</div></div>
<form class="box" id="cf"><h3>Napisz do nas</h3><div class="fgrid"><div class="fld"><label>Imię</label><input required></div><div class="fld"><label>E-mail</label><input type="email" required></div><div class="fld w"><label>Temat</label><input required></div><div class="fld w"><label>Wiadomość</label><textarea required></textarea></div><div class="w"><button class="btn">Wyślij</button></div></div></form></div></div>`;
 $('#cf').onsubmit=e=>{e.preventDefault();e.target.innerHTML='<h3>Dziękujemy!</h3><p>Wiadomość wysłana (prototyp).</p>'}};

document.addEventListener('DOMContentLoaded',()=>{layout();const f=PG[document.body.dataset.page];f&&f()});
