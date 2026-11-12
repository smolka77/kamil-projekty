/* ProBazar – dane DEMO (produkty, przepisy, filmy). W WordPressie: produkty = WooCommerce, przepisy = CPT "przepis", filmy = CPT "wideo". */
window.PB = window.PB || {};
PB.categories = [
  {id:'orzechy-nasiona', name:'Orzechy i nasiona', tint:'#F6E7D0', col:'#B9824A', motif:'nut',   desc:'Migdały, nerkowce, chia – energia na cały dzień.'},
  {id:'oleje',           name:'Oleje i oliwy',     tint:'#FBF0C9', col:'#C99A1B', motif:'drop',  desc:'Tłoczone na zimno, w szkle i w całości naturalne.'},
  {id:'kasze-maki',      name:'Kasze i mąki',      tint:'#EFE9D6', col:'#9A8A52', motif:'grain', desc:'Pełne ziarno, bez zbędnych dodatków.'},
  {id:'slodkie',         name:'Słodkie bez wyrzutów', tint:'#FDE6D0', col:'#D9791E', motif:'honey', desc:'Miód, syropy, daktyle i masła orzechowe.'},
  {id:'herbaty',         name:'Herbaty i napary',  tint:'#E3F0DD', col:'#4C9A4F', motif:'leaf',  desc:'Matcha, rooibos i ziołowe rytuały.'},
  {id:'superfoods',      name:'Superfoods',        tint:'#E0EEF7', col:'#2B7AB5', motif:'berry', desc:'Spirulina, kakao, goji – mały dodatek, duża moc.'}
];
PB.tags = {bio:'Bio', wegan:'Wegańskie', bezgl:'Bez glutenu', raw:'Surowe'};
/* n = [kcal, tłuszcz, w tym nasycone, węglowodany, w tym cukry, błonnik, białko, sól] na 100 g/ml */
PB.products = [
 {id:'migdaly', name:'Migdały naturalne', short:'Migdały', cat:'orzechy-nasiona', price:19.90, size:'250 g', pack:'bag', tint:'#F6E7D0', col:'#B9824A', motif:'nut', tags:['wegan','bezgl','raw'], badge:'Bestseller', rating:4.9, rev:128,
  desc:'Chrupiące migdały w całości, bez soli i bez prażenia. Idealne do owsianki, granoli i jako przekąska.', ing:'Migdały (100%). Może zawierać ślady innych orzechów i orzeszków ziemnych.', n:[612,53,4,5.4,4.2,12,21,0.01]},
 {id:'nerkowce', name:'Orzechy nerkowca', short:'Nerkowce', cat:'orzechy-nasiona', price:22.90, size:'250 g', pack:'bag', tint:'#F9EBD2', col:'#D2A15B', motif:'nut', tags:['wegan','bezgl','raw'], rating:4.8, rev:74,
  desc:'Kremowe, delikatnie słodkie nerkowce. Z ich pomocą zrobisz roślinną śmietankę i sosy.', ing:'Orzechy nerkowca (100%). Może zawierać ślady innych orzechów.', n:[574,46,8,30,6,3.3,18,0.02]},
 {id:'chia', name:'Nasiona chia', short:'Chia', cat:'orzechy-nasiona', price:14.90, size:'300 g', pack:'bag', tint:'#ECE8E1', col:'#5C5448', motif:'seed', tags:['bio','wegan','bezgl'], badge:'Nowość', rating:4.7, rev:51,
  desc:'Źródło kwasów omega-3 i błonnika. Po namoczeniu tworzą naturalny żel – baza puddingów.', ing:'Nasiona szałwii hiszpańskiej chia (100%) z uprawy ekologicznej.', n:[486,31,3.3,8,0,34,17,0.02]},
 {id:'pestki-dyni', name:'Pestki dyni łuskane', short:'Pestki dyni', cat:'orzechy-nasiona', price:12.90, size:'250 g', pack:'bag', tint:'#E5F0DA', col:'#6E9B3C', motif:'seed', tags:['wegan','bezgl','raw'], rating:4.6, rev:39,
  desc:'Zielone, aromatyczne pestki – dużo cynku i magnezu. Świetne do sałatek, zup-kremów i pieczywa.', ing:'Pestki dyni łuskane (100%).', n:[559,49,8.7,10.7,1.4,6,30,0.01]},
 {id:'olej-kokosowy', name:'Olej kokosowy tłoczony na zimno', short:'Olej kokosowy', cat:'oleje', price:29.90, oldPrice:34.90, size:'500 ml', pack:'jar', tint:'#FBF3DE', col:'#E7CF8A', motif:'drop', tags:['bio','wegan','bezgl'], badge:'Promocja', rating:4.8, rev:96,
  desc:'Nierafinowany, o delikatnym kokosowym aromacie. Do pieczenia, smażenia i domowych kosmetyków.', ing:'Olej kokosowy nierafinowany, tłoczony na zimno (100%) z uprawy ekologicznej.', n:[900,100,89,0,0,0,0,0]},
 {id:'oliwa', name:'Oliwa extra virgin', short:'Oliwa EV', cat:'oleje', price:39.90, size:'500 ml', pack:'bottle', tint:'#EDF1D2', col:'#8DA032', motif:'drop', tags:['bio','wegan','bezgl'], badge:'Bestseller', rating:4.9, rev:142,
  desc:'Zielonkawa, lekko pieprzna oliwa z pierwszego tłoczenia. Do sałatek, pieczywa i gotowych dań.', ing:'Oliwa z oliwek najwyższej jakości, kategoria extra virgin (100%).', n:[824,91.6,14,0,0,0,0,0]},
 {id:'olej-lniany', name:'Olej lniany zimnotłoczony', short:'Olej lniany', cat:'oleje', price:18.90, size:'250 ml', pack:'bottle', tint:'#F8EDC3', col:'#D1A524', motif:'drop', tags:['wegan','bezgl','raw'], rating:4.5, rev:33,
  desc:'Złocisty olej bogaty w omega-3. Przechowuj w lodówce, używaj na zimno – do twarożków i sałatek.', ing:'Olej lniany tłoczony na zimno (100%).', n:[900,100,9,0,0,0,0,0]},
 {id:'jaglana', name:'Kasza jaglana bio', short:'Kasza jaglana', cat:'kasze-maki', price:8.90, size:'500 g', pack:'bag', tint:'#F7EDC6', col:'#E1B93B', motif:'grain', tags:['bio','wegan','bezgl'], rating:4.7, rev:88,
  desc:'Lekka, naturalnie bezglutenowa kasza o łagodnym smaku. Na słodko i na słono.', ing:'Proso łuskane (100%) z uprawy ekologicznej.', n:[378,4.2,0.7,73,1.7,8.5,11,0.01]},
 {id:'platki-owsiane', name:'Płatki owsiane górskie', short:'Płatki owsiane', cat:'kasze-maki', price:6.90, size:'500 g', pack:'bag', tint:'#F1E8D8', col:'#B79C6E', motif:'grain', tags:['wegan'], rating:4.8, rev:157,
  desc:'Pełnoziarniste płatki o wyraźnej, orzechowej nucie. Baza owsianki, granoli i ciastek.', ing:'Płatki owsiane pełnoziarniste (100%). Może zawierać gluten innych zbóż.', n:[372,7,1.3,60,1.1,10,13.5,0.02]},
 {id:'make-migdalowa', name:'Mąka migdałowa', short:'Mąka migdałowa', cat:'kasze-maki', price:21.90, size:'300 g', pack:'bag', tint:'#F5E6D3', col:'#C79A67', motif:'nut', tags:['wegan','bezgl'], badge:'Nowość', rating:4.6, rev:27,
  desc:'Drobno zmielone migdały bez skórki. Do ciast i ciasteczek bez glutenu.', ing:'Migdały bez skórki, zmielone (100%).', n:[590,50,4,9,4,10,22,0.01]},
 {id:'komosa', name:'Komosa ryżowa (quinoa)', short:'Quinoa', cat:'kasze-maki', price:17.90, size:'500 g', pack:'bag', tint:'#F6EAD0', col:'#C76E3E', motif:'grain', tags:['bio','wegan','bezgl'], rating:4.7, rev:62,
  desc:'Pełnowartościowe białko roślinne. Delikatna, sypka – do miseczek i sałatek.', ing:'Komosa ryżowa biała (100%) z uprawy ekologicznej.', n:[368,6,0.7,64,0,7,14,0.02]},
 {id:'miod', name:'Miód wielokwiatowy', short:'Miód', cat:'slodkie', price:28.90, size:'400 g', pack:'jar', tint:'#FDE9C2', col:'#E39A1B', motif:'honey', tags:[], badge:'Bestseller', rating:4.9, rev:171,
  desc:'Płynny miód z lokalnych pasiek, nieprzegrzewany. Do herbaty, owsianki i dressingów.', ing:'Miód pszczeli naturalny (100%).', n:[320,0,0,79,78,0,0.3,0.01]},
 {id:'maslo-orzechowe', name:'Masło orzechowe 100%', short:'Masło orzechowe', cat:'slodkie', price:17.90, size:'350 g', pack:'jar', tint:'#F4E0C7', col:'#B97A3B', motif:'nut', tags:['wegan','bezgl'], rating:4.8, rev:119,
  desc:'Tylko prażone orzeszki ziemne – bez cukru, soli i oleju palmowego. Kremowe i intensywne.', ing:'Orzeszki ziemne prażone (100%).', n:[622,51,9,12,5,7,27,0.01]},
 {id:'daktyle', name:'Daktyle suszone', short:'Daktyle', cat:'slodkie', price:13.90, size:'250 g', pack:'box', tint:'#EADCCB', col:'#7A4B2A', motif:'berry', tags:['wegan','bezgl','raw'], rating:4.7, rev:80,
  desc:'Miękkie, karmelowe daktyle bez pestek. Naturalny słodzik do deserów i koktajli.', ing:'Daktyle suszone drylowane (100%).', n:[282,0.4,0.1,75,63,8,2.5,0.02]},
 {id:'syrop-klonowy', name:'Syrop klonowy klasa A', short:'Syrop klonowy', cat:'slodkie', price:34.90, size:'250 ml', pack:'bottle', tint:'#F9DFBE', col:'#B5651D', motif:'drop', tags:['wegan','bezgl'], rating:4.8, rev:45,
  desc:'Bursztynowy syrop z soku klonowego. Do naleśników, owsianki i pieczenia.', ing:'Syrop klonowy (100%).', n:[260,0.1,0,67,60,0,0,0.01]},
 {id:'matcha', name:'Matcha ceremonialna', short:'Matcha', cat:'herbaty', price:49.90, size:'50 g', pack:'tin', tint:'#E0EEDA', col:'#4F9B3F', motif:'leaf', tags:['bio','wegan','bezgl'], badge:'Nowość', rating:4.8, rev:58,
  desc:'Jasnozielony proszek herbaciany z pierwszych zbiorów. Gładki smak bez goryczy.', ing:'Sproszkowana zielona herbata matcha (100%) z uprawy ekologicznej.', n:[324,5.3,0.9,39,0,38,30,0.03]},
 {id:'rooibos', name:'Rooibos z pomarańczą', short:'Rooibos', cat:'herbaty', price:16.90, size:'80 g', pack:'box', tint:'#F9E2CB', col:'#C4571E', motif:'leaf', tags:['bio','wegan','bezgl'], rating:4.6, rev:36,
  desc:'Aksamitny napar bez kofeiny z nutą skórki pomarańczowej. Pasuje na wieczór.', ing:'Rooibos (90%), skórka pomarańczy (7%), aromat naturalny pomarańczy (3%).', n:[0,0,0,0,0,0,0,0]},
 {id:'spirulina', name:'Spirulina w proszku', short:'Spirulina', cat:'superfoods', price:32.90, size:'150 g', pack:'bag', tint:'#D9ECE3', col:'#1F7A5A', motif:'leaf', tags:['bio','wegan','bezgl','raw'], rating:4.4, rev:29,
  desc:'Intensywnie zielona mikroalga, bogata w białko. Łyżeczka do koktajlu to dobry początek.', ing:'Spirulina (Arthrospira platensis) w proszku (100%).', n:[290,7.7,2.7,24,3.1,3.6,57,1.6]},
 {id:'kakao', name:'Kakao surowe', short:'Kakao surowe', cat:'superfoods', price:24.90, size:'200 g', pack:'bag', tint:'#EADBD1', col:'#6A3B24', motif:'berry', tags:['bio','wegan','bezgl','raw'], rating:4.9, rev:67,
  desc:'Nieprażone, odtłuszczone kakao o głębokim czekoladowym aromacie. Do deserów i napojów.', ing:'Kakao surowe w proszku, odtłuszczone (100%).', n:[355,11,6.5,12,0.5,33,28,0.04]},
 {id:'goji', name:'Jagody goji', short:'Goji', cat:'superfoods', price:19.90, size:'150 g', pack:'box', tint:'#FADDD4', col:'#D3402B', motif:'berry', tags:['bio','wegan','bezgl'], rating:4.5, rev:41,
  desc:'Suszone, lekko kwaskowate jagody goji. Dodaj do kasz, musli i wypieków.', ing:'Jagody goji suszone (100%) z uprawy ekologicznej.', n:[349,0.4,0.1,64,45,13,14,0.03]}
];
/* składnik: [tekst, id produktu ze sklepu | null] */
PB.recipes = [
 {id:'owsianka-daktyle', title:'Kremowa owsianka z daktylami i migdałami', cat:'Śniadania', time:15, serv:2, level:'Łatwy', kcal:380, tags:['wegan'], tint:'#F6E7D0', base:'#E7D2AE', tops:['#7A4B2A','#C79A67','#E39A1B','#F5E6D3'],
  intro:'Ciepła owsianka, która pachnie jak domowy deser. Daktyle słodzą ją naturalnie, a migdały dodają chrupiącej tekstury. Moje ulubione śniadanie na chłodne poranki.',
  ing:[['80 g płatków owsianych górskich','platki-owsiane'],['400 ml napoju roślinnego',null],['4 daktyle, pokrojone','daktyle'],['2 łyżki płatków migdałowych lub posiekanych migdałów','migdaly'],['1 łyżka nasion chia','chia'],['1 łyżeczka miodu lub syropu klonowego (opcjonalnie)','miod'],['szczypta cynamonu',null]],
  steps:['Płatki zalej napojem roślinnym, dodaj chia i szczyptę cynamonu. Gotuj na małym ogniu 5–6 minut, często mieszając.','Dodaj połowę pokrojonych daktyli i gotuj jeszcze minutę – lekko się rozpuszczą i nadadzą owsiance kremowość.','Przełóż do miseczek, posyp pozostałymi daktylami i migdałami.','Jeśli lubisz słodziej, skrop odrobiną miodu. Podawaj od razu.'],
  tip:'Wieczorem możesz zalać płatki napojem i zostawić w lodówce – rano wystarczy podgrzać.'},
 {id:'pudding-chia', title:'Pudding chia z syropem klonowym i malinami', cat:'Desery', time:10, serv:2, level:'Bardzo łatwy', kcal:290, tags:['wegan','bezgl'], tint:'#FADDD4', base:'#F3E3E8', tops:['#D3402B','#E8758A','#FFFFFF','#8A5FA8'],
  intro:'Pudding, który robi się sam, kiedy śpisz. Potrzebujesz trzech składników i szklanki – a rano czeka na Ciebie deser udający śniadanie.',
  ing:[['6 łyżek nasion chia','chia'],['300 ml mleka kokosowego lub migdałowego',null],['2 łyżki syropu klonowego','syrop-klonowy'],['garść malin',null],['1 łyżka pestek dyni do posypania','pestki-dyni']],
  steps:['W słoiku wymieszaj chia z mlekiem i syropem klonowym. Odstaw na 5 minut i wymieszaj ponownie, żeby nie powstały grudki.','Wstaw do lodówki na minimum 4 godziny, najlepiej na całą noc.','Przed podaniem wymieszaj, przełóż do szklanek i udekoruj malinami oraz pestkami dyni.'],
  tip:'Po dodaniu łyżeczki kakao surowego otrzymasz wersję czekoladową.'},
 {id:'zielona-miska', title:'Zielona miska mocy z komosą i pestkami dyni', cat:'Obiady', time:30, serv:2, level:'Łatwy', kcal:520, tags:['wegan','bezgl'], tint:'#E5F0DA', base:'#CFE3B8', tops:['#3C8D40','#E8731A','#F2E3A4','#7A4B2A','#C94A3A'],
  intro:'Kolorowa miska pełna warzyw, białka z komosy i zdrowych tłuszczów. Lekka, ale sycąca – idealna na lunch do pracy.',
  ing:[['150 g komosy ryżowej','komosa'],['1 awokado',null],['1 mała marchewka, starta',null],['garść szpinaku baby',null],['3 łyżki pestek dyni','pestki-dyni'],['2 łyżki oliwy extra virgin','oliwa'],['sok z połowy cytryny',null],['sól i pieprz',null]],
  steps:['Komosę przepłucz na sicie i gotuj w podwójnej ilości wody 12–15 minut, aż woda się wchłonie. Odstaw pod przykryciem na 5 minut.','Pestki dyni uprażyć na suchej patelni, aż zaczną pykać.','Wymieszaj oliwę z sokiem z cytryny, solą i pieprzem – to dressing.','Do misek włóż szpinak, komosę, startą marchewkę i plastry awokado. Polej dressingiem i posyp pestkami.'],
  tip:'Komosę ugotuj na zapas – w lodówce wytrzyma 4 dni.'},
 {id:'granola-maslo-orzechowe', title:'Domowa granola z masłem orzechowym', cat:'Śniadania', time:35, serv:8, level:'Łatwy', kcal:310, tags:['wegan'], tint:'#F4E0C7', base:'#DDB783', tops:['#B97A3B','#8A5A2B','#F1E8D8','#E39A1B'],
  intro:'Chrupiące klastry, które możesz robić co tydzień i jeść z jogurtem, mlekiem lub prosto ze słoika. Zapach w kuchni jest nie do opisania.',
  ing:[['300 g płatków owsianych','platki-owsiane'],['100 g migdałów, posiekanych','migdaly'],['4 łyżki masła orzechowego','maslo-orzechowe'],['3 łyżki miodu lub syropu klonowego','miod'],['3 łyżki oleju kokosowego','olej-kokosowy'],['1 łyżeczka cynamonu',null]],
  steps:['Piekarnik nagrzej do 160°C. Blachę wyłóż papierem do pieczenia.','W garnku rozpuść olej kokosowy z masłem orzechowym i miodem, wymieszaj na gładko.','Wsyp płatki, migdały i cynamon, dokładnie wymieszaj. Rozłóż cienko na blasze i mocno dociśnij.','Piecz 25 minut, w połowie ostrożnie obracając. Wystudź bez ruszania – dzięki temu powstaną klastry. Przechowuj w słoiku do 3 tygodni.'],
  tip:'Po upieczeniu dodaj garść goji lub rodzynek.'},
 {id:'matcha-latte', title:'Latte matcha z miodem', cat:'Napoje', time:5, serv:1, level:'Bardzo łatwy', kcal:120, tags:['bezgl'], tint:'#E0EEDA', base:'#B7D8A4', tops:['#4F9B3F','#F6F1E4','#E39A1B'],
  intro:'Delikatna, pianka na wierzchu, piękny zielony kolor. Matcha daje spokojną energię bez kofeinowego „strzału”.',
  ing:[['1 łyżeczka matchy','matcha'],['50 ml gorącej wody (ok. 80°C)',null],['200 ml ciepłego mleka (np. owsianego)',null],['1 łyżeczka miodu','miod']],
  steps:['Matchę przesiej do miseczki. Zalej gorącą (nie wrzącą) wodą i energicznie wymieszaj bambusową miotełką lub małym trzepaczką, aż powstanie piana.','Mleko podgrzej i spień.','Do kubka wlej mleko, dodaj miód, a na wierzch delikatnie wlej matchę.'],
  tip:'Wrzątek robi z matchy gorzką – woda powinna mieć ok. 80°C.'},
 {id:'ciasteczka-migdalowe', title:'Ciasteczka migdałowe bez glutenu', cat:'Desery', time:25, serv:12, level:'Łatwy', kcal:140, tags:['wegan','bezgl'], tint:'#F5E6D3', base:'#E2BE8E', tops:['#6A3B24','#C79A67','#F5E6D3'],
  intro:'Kruche z zewnątrz, miękkie w środku. Tylko cztery składniki i jedna miska – a kuchnia będzie pachnieć jak cukiernia.',
  ing:[['200 g mąki migdałowej','make-migdalowa'],['4 łyżki syropu klonowego','syrop-klonowy'],['3 łyżki oleju kokosowego, roztopionego','olej-kokosowy'],['2 łyżki kakao surowego (opcjonalnie)','kakao'],['szczypta soli',null]],
  steps:['Piekarnik nagrzej do 175°C. Blachę wyłóż papierem.','W misce połącz mąkę, kakao i sól, dodaj syrop oraz olej kokosowy. Wymieszaj na gładkie ciasto.','Formuj kulki wielkości orzecha włoskiego, układaj na blasze i spłaszcz widelcem.','Piecz 10–12 minut. Zostaw na blasze do całkowitego ostygnięcia – ciastka stwardnieją.'],
  tip:'Przechowywane w puszce zachowują chrupkość do 5 dni.'},
 {id:'jaglanka', title:'Jaglanka z goji i miodem', cat:'Śniadania', time:25, serv:2, level:'Łatwy', kcal:340, tags:['bezgl'], tint:'#F7EDC6', base:'#F0DC8C', tops:['#D3402B','#E39A1B','#FFFFFF','#8A5A2B'],
  intro:'Złota, kremowa kasza jaglana na słodko – jak ryżowy pudding, tylko lżejszy. Idealna na początek dnia.',
  ing:[['100 g kaszy jaglanej','jaglana'],['500 ml mleka roślinnego',null],['2 łyżki jagód goji','goji'],['1 łyżka miodu','miod'],['1 łyżka orzechów nerkowca, posiekanych','nerkowce']],
  steps:['Kaszę wypłucz kilkukrotnie na sicie, a na koniec przelej wrzątkiem – dzięki temu nie będzie gorzka.','Zalej mlekiem i gotuj na małym ogniu 15–18 minut, mieszając, aż zgęstnieje.','Przełóż do miseczek, dodaj goji, nerkowce i polej miodem.'],
  tip:'Do kaszy możesz dodać łyżkę masła orzechowego – będzie jeszcze bardziej kremowa.'}
];
PB.videos = [
 {id:'v1', title:'Tydzień ze zdrowym śniadaniem – 5 szybkich pomysłów', dur:'12:40', cat:'Przepisy', tint:'#F6E7D0', a:'#E39A1B', b:'#17305E', recipe:'owsianka-daktyle'},
 {id:'v2', title:'Jak czytać etykiety? Poradnik zakupowy Moniki', dur:'09:15', cat:'Poradniki', tint:'#E0EEDA', a:'#4F9B3F', b:'#17305E'},
 {id:'v3', title:'Granola krok po kroku – chrupiące klastry', dur:'08:02', cat:'Przepisy', tint:'#F4E0C7', a:'#B97A3B', b:'#223E73', recipe:'granola-maslo-orzechowe'},
 {id:'v4', title:'Zakupy w ProBazarze: co warto mieć w spiżarni', dur:'11:30', cat:'Zakupy', tint:'#E0EEF7', a:'#2B7AB5', b:'#17305E'},
 {id:'v5', title:'Matcha bez tajemnic – jak przygotować idealne latte', dur:'06:48', cat:'Przepisy', tint:'#E0EEDA', a:'#4F9B3F', b:'#223E73', recipe:'matcha-latte'},
 {id:'v6', title:'Kulisy: wybieramy producentów do naszego sklepu', dur:'14:20', cat:'Kulisy', tint:'#FDE6D0', a:'#E8731A', b:'#17305E'}
];
PB.coupon = {code:'ZDROWIE10', pct:10};
PB.freeShip = 150;
PB.ship = [
 {id:'kurier', name:'Kurier (1–2 dni robocze)', price:14.99},
 {id:'paczkomat', name:'Paczkomat 24/7 (1–2 dni)', price:11.99},
 {id:'odbior', name:'Odbiór osobisty – Poznań', price:0}
];
