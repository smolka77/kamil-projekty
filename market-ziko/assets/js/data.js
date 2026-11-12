/* DANE DEMO – produkty i ceny poglądowe (w PrestaShop pochodzą z bazy sklepu) */
const IC={
flame:'<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/>',
rad:'<path d="M5 6v12M9 6v12M13 6v12M17 6v12M3 8h18M3 16h18"/>',
panel:'<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M7 9v6M11 9v6M15 9v6"/>',
floor:'<path d="M3 8c3-3 3 3 6 0s3 3 6 0 3 3 6 0M3 14c3-3 3 3 6 0s3 3 6 0 3 3 6 0M3 19h18"/>',
pump:'<circle cx="12" cy="12" r="6"/><path d="M12 6v-3M18 12h3M12 9l3 3-3 3"/>',
heater:'<rect x="6" y="3" width="12" height="18" rx="4"/><path d="M12 8v5M10 11l2 2 2-2"/>',
bath:'<path d="M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9z"/><path d="M10 13a2 2 0 0 0 2 2"/>',
saw:'<path d="M3 15h12l6-4v6l-6 2H3zM6 15v-3h6v3"/>',
pipe:'<path d="M3 9h7v-4h4v4h7v6h-7v4h-4v-4H3z"/>',
bolt:'<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
paint:'<rect x="4" y="3" width="14" height="6" rx="1.5"/><path d="M18 6h2v5h-8v3M12 14v7"/>',
cart:'<path d="M3 4h3l2.4 11h10.4l2.2-8H7"/><circle cx="10" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/>',
search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',
user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 5-7 8-7s7 2 8 7"/>',
truck:'<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
phone:'<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
pin:'<path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
doc:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
tool:'<path d="M14 6a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3l9-9a4 4 0 0 0-2-2z"/>'
};
const icon=(n,c="")=>`<svg class="ic-s ${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;

const CATS=[
{id:'piece',n:'Piece węglowe c.o. i akcesoria',i:'flame',s:['Piec DEFRO','Piec SAS','Piec STALMARK','Akcesoria do pieca']},
{id:'grzejniki-aluminiowe',n:'Grzejniki aluminiowe',i:'rad',s:['Super Serir','Alice','Altech','Wulkan']},
{id:'grzejniki-stalowe',n:'Grzejniki stalowe',i:'panel',s:['Diamond','Purmo','Radson','Drabinki Scano']},
{id:'ogrzewanie-podlogowe',n:'System ogrzewania podłogowego',i:'floor',s:['Rozdzielacze','Szafki','Głowice termostatyczne','Zawory']},
{id:'pompy',n:'Pompy ciepła, obiegowe c.o., głębinowe',i:'pump',s:['Pompy obiegowe','Pompy ciepła','Pompy głębinowe','Akcesoria do pomp']},
{id:'podgrzewacze',n:'Podgrzewacze wody',i:'heater',s:['Kotły gazowe','Gazowe podgrzewacze wody','Elektryczne podgrzewacze wody','Przepływowe podgrzewacze wody']},
{id:'lazienka',n:'Łazienka',i:'bath',s:['Baterie','Natryski, rączki, węże','Stelaże podtynkowe','Akcesoria łazienkowe']},
{id:'dom-i-ogrod',n:'Dom i ogród',i:'saw',s:['Pilarki i kosiarki','Narzędzia','Nagrzewnice','Elektronarzędzia']},
{id:'hydraulika',n:'Hydraulika',i:'pipe',s:['Zawory','Instalacje stalowe','Instalacje miedziowe CU','Instalacje mosiężne']},
{id:'systemy-instalacyjne',n:'Systemy instalacyjne',i:'pipe',s:['Instalacje PP','Instalacje PE','Instalacje PCV']},
{id:'elektrycznosc',n:'Elektryczność',i:'bolt',s:['Gniazda i wyłączniki','Przedłużacze','Przewody','Żarówki']},
{id:'fuga-silikon-farba',n:'Fuga, silikon, farba',i:'paint',s:['Silikony','Fugi','Grunty','Gładzie i gipsy']}
];
const BRANDS=['Defro','Purmo','Radson','Makita','Stihl','Fiskars','Afriso','Coval','Dekoral','Śnieżka','Pattex','Galmet','SAS','Stalmark','Scano','Tadmar','Karlik','Vulcan'];

/* id,nazwa,marka,kat,podkat,cena,stara,rysunek,znacznik */
const P=[
[1,'Kocioł c.o. na paliwo stałe DEFRO Optima Komfort 17 kW','Defro','piece','Piec DEFRO',7490,0,'boiler','nowy'],
[2,'Piec SAS NWB Pellet Eco 20 kW z podajnikiem','SAS','piece','Piec SAS',9990,10990,'boiler',''],
[3,'Grzejnik aluminiowy Alice 600/80 – 10 żeber','Alice','grzejniki-aluminiowe','Alice',389,0,'radal',''],
[4,'Grzejnik aluminiowy Super Serir 500/80 – 8 żeber','Super Serir','grzejniki-aluminiowe','Super Serir',329,369,'radal',''],
[5,'Grzejnik stalowy panelowy Purmo C22 600×1000','Purmo','grzejniki-stalowe','Purmo',459,0,'radst','nowy'],
[6,'Grzejnik stalowy Radson Ventil Compact 21 500×800','Radson','grzejniki-stalowe','Radson',349,0,'radst',''],
[7,'Rozdzielacz ogrzewania podłogowego 8 obwodów z przepływomierzami','Afriso','ogrzewanie-podlogowe','Rozdzielacze',749,829,'coll',''],
[8,'Głowica termostatyczna z czujnikiem cieczowym M30×1,5','Afriso','ogrzewanie-podlogowe','Głowice termostatyczne',64,0,'head',''],
[9,'Pompa obiegowa c.o. elektroniczna 25-60 130 mm','Tadmar','pompy','Pompy obiegowe',389,0,'pump',''],
[10,'Pompa głębinowa 4" 1,1 kW z kablem 20 m','Karlik','pompy','Pompy głębinowe',1290,1450,'pumpd',''],
[11,'Obudowa filtra 1" USTM do pomp','Afriso','pompy','Akcesoria do pomp',34.41,38.23,'filter',''],
[12,'Elektryczny podgrzewacz wody pojemnościowy 80 l','Scano','podgrzewacze','Elektryczne podgrzewacze wody',629,0,'heater','nowy'],
[13,'Gazowy przepływowy podgrzewacz wody 11 l/min','Vulcan','podgrzewacze','Gazowe podgrzewacze wody',1149,1290,'heater',''],
[14,'Bateria wannowa z natryskiem, chrom','Coval','lazienka','Baterie',249,0,'faucet',''],
[15,'Stelaż podtynkowy do WC z przyciskiem spłukującym','Scano','lazienka','Stelaże podtynkowe',399,459,'frame',''],
[16,'Pilarka łańcuchowa spalinowa Stihl MS 180','Stihl','dom-i-ogrod','Pilarki i kosiarki',1099,0,'saw','nowy'],
[17,'Wiertarko-wkrętarka akumulatorowa Makita 18 V 2×2,0 Ah','Makita','dom-i-ogrod','Elektronarzędzia',699,0,'drill',''],
[18,'Nagrzewnica wodna Volcano MINI z termostatem','Vulcan','dom-i-ogrod','Nagrzewnice',1390,0,'radal',''],
[19,'Zestaw kształtek miedzianych CU 15 mm – 40 szt.','Galmet','hydraulika','Instalacje miedziowe CU',129,0,'fit',''],
[20,'Zawór kulowy mosiężny 1/2" gwint wewn./zewn.','Galmet','hydraulika','Zawory',17.9,0,'valve',''],
[21,'Rura PP-R PN20 20 mm × 4 m','Tadmar','systemy-instalacyjne','Instalacje PP',12.5,0,'tube',''],
[22,'Przedłużacz 5 gniazd 3 m z wyłącznikiem','Karlik','elektrycznosc','Przedłużacze',39,0,'plug',''],
[23,'Żarówka LED E27 12 W ciepła biała – 4 szt.','Karlik','elektrycznosc','Żarówki',29,34,'bulb',''],
[24,'Silikon sanitarny biały Pattex 280 ml','Pattex','fuga-silikon-farba','Silikony',18.9,0,'cart',''],
[25,'Fuga elastyczna 5 kg – szara','Śnieżka','fuga-silikon-farba','Fugi',34,0,'bag',''],
[26,'Farba emulsyjna Dekoral biała 10 l','Dekoral','fuga-silikon-farba','Grunty',89,0,'bucket','nowy'],
[27,'Taśma malarska papierowa maskująca 19 mm × 25 m, 48 szt.','Pattex','fuga-silikon-farba','Silikony',63,72,'tape',''],
[28,'Zestaw opasek zaciskowych SL 26 szt. Corona C0414','Fiskars','dom-i-ogrod','Narzędzia',27,0,'fit','nowy']
].map(a=>({id:a[0],n:a[1],b:a[2],c:a[3],s:a[4],p:a[5],o:a[6],t:a[7],k:a[8]}));

const POSTS=[
{id:1,t:'Kotły c.o. DEFRO – jak wybrać moc i typ kotła',d:'12 listopada 2026',i:'flame',c:'#c9302c',x:'P.W. DEFRO to największy w Polsce producent urządzeń grzewczych na paliwa stałe. Sprawdź, jak dobrać kocioł do metrażu domu i rodzaju paliwa.',
body:['Dobór kotła zaczyna się od zapotrzebowania domu na ciepło. Dla starszych budynków przyjmuje się ok. 100–120 W/m², a dla nowych, dobrze ocieplonych – nawet 50–60 W/m².','<h2>Na co zwrócić uwagę</h2><ul><li>moc kotła dopasowana do powierzchni i izolacji,</li><li>rodzaj paliwa – węgiel, ekogroszek, pellet, drewno,</li><li>klasa energetyczna i norma 5 klasy,</li><li>automatyka i podajnik paliwa.</li></ul>','Jeśli nie masz pewności, jaki kocioł wybrać – napisz do nas. Doradzimy i przygotujemy wycenę wraz z osprzętem.']},
{id:2,t:'Podgrzewacze wody do łazienki – przepływowy czy pojemnościowy?',d:'3 listopada 2026',i:'heater',c:'#2b6cb0',x:'Ciepła woda w łazience wymaga dobrania odpowiedniego podgrzewacza. Porównujemy modele przepływowe i pojemnościowe oraz zasilanie gazem lub prądem.',
body:['Modele przepływowe dostarczają ciepłą wodę od razu po odkręceniu kranu i są uznawane za ekonomiczne. Ich wadą jest ograniczona ilość ciepłej wody jednocześnie.','<h2>Pojemnościowe</h2>','Zbiornik 50–100 l sprawdzi się w domu z kilkoma punktami poboru. Wymaga miejsca i czasu nagrzewania, ale daje stabilną temperaturę.','<h2>Gaz czy prąd?</h2>','Gaz jest tańszy w eksploatacji, prąd – prostszy w montażu. Decyzja zależy od instalacji w budynku.']},
{id:3,t:'Nagrzewnice Volcano MINI – ciepło do garażu i warsztatu',d:'21 października 2026',i:'rad',c:'#1f7a4d',x:'Aparat grzewczo-wentylacyjny Volcano MINI łączy estetykę, funkcjonalność i optymalne parametry. Obudowa z polipropylenu jest odporna na korozję.',
body:['Volcano MINI to nowatorska konstrukcja, w której obudowę wykonano z polipropylenu odpornego na wysokie temperatury czynnika grzewczego.','<h2>Zastosowanie</h2><ul><li>garaże i warsztaty,</li><li>hale magazynowe,</li><li>szklarnie i obiekty gospodarcze.</li></ul>','Przestrzeń tylnej płyty została zoptymalizowana, co ułatwia montaż nawet w ciasnych miejscach.']},
{id:4,t:'Ogrzewanie podłogowe – od czego zacząć remont instalacji',d:'9 października 2026',i:'floor',c:'#7a3bb0',x:'Rozdzielacz, szafka, głowice i zawory – lista elementów, bez których ogrzewanie podłogowe nie zadziała poprawnie.',body:['Podstawą instalacji jest rozdzielacz z przepływomierzami, który pozwala wyregulować każdy obwód.','<h2>Kompletna lista</h2><ul><li>rozdzielacz i szafka,</li><li>głowice termostatyczne,</li><li>zawory i pompa mieszająca,</li><li>rury i izolacja.</li></ul>']},
{id:5,t:'Jak dobrać grzejnik do pokoju – krótki poradnik',d:'28 września 2026',i:'panel',c:'#d97706',x:'Moc, typ przyłącza i wysokość – trzy parametry, które decydują o dobrym doborze grzejnika.',body:['Moc grzejnika dobierasz do kubatury pomieszczenia i strat ciepła. Orientacyjnie: 1 m² to ok. 100 W.','<h2>Stal czy aluminium?</h2>','Aluminium szybko reaguje na zmiany temperatury, stal jest tańsza i dobrze oddaje ciepło promieniowaniem.']},
{id:6,t:'Przygotowanie do sezonu – lista kontrolna dla instalacji c.o.',d:'15 września 2026',i:'tool',c:'#0e7490',x:'Odpowietrzenie, wymiana filtra, kontrola ciśnienia – o czym pamiętać przed zimą.',body:['Przed sezonem grzewczym warto sprawdzić ciśnienie w instalacji, odpowietrzyć grzejniki i wyczyścić filtry.','<h2>Szybka lista</h2><ul><li>ciśnienie 1,5–2 bar,</li><li>odpowietrzenie grzejników,</li><li>przegląd kotła,</li><li>test pompy obiegowej.</li></ul>']}
];

const FLOW=[
['kurier','Kurier (FedEx / DPD)','1–2 dni robocze',19.9],
['poczta','Poczta Polska – paczka','2–3 dni robocze',14.9],
['jas','Transport paletowy JAS-FBG','Duże i ciężkie towary, 2–4 dni',89],
['odbior','Odbiór osobisty w sklepie','Gotowe w 2 godziny',0]];
const PAY=[
['przelew','Szybki przelew / BLIK','Przelewy24 – płatność online'],
['karta','Karta płatnicza','Visa, Mastercard'],
['raty','Raty Santander','Kup na raty – decyzja online'],
['pobranie','Płatność przy odbiorze','Za pobraniem (+5 zł)']];
