/* ProBazar – dane DEMO (produkty, przepisy, filmy). W WordPressie: produkty = WooCommerce, przepisy = CPT "przepis", filmy = CPT "wideo".
   Zdjęcia: assets/img (p-<id> produkty, r-<id> przepisy, v<n> wideo) – Unsplash, do podmiany na własne. */
window.PB = window.PB || {};
PB.categories = [
  {id:'orzechy',  name:'Orzechy i bakalie',      img:'p-migdaly', desc:'Migdały, pistacje i mieszanki – chrupiąca energia na cały dzień.'},
  {id:'kasze',    name:'Kasze, mąki i płatki',   img:'p-orkisz',  desc:'Pełne ziarno, bez zbędnych dodatków.'},
  {id:'slodkie',  name:'Miody i słodkości',      img:'p-miod',    desc:'Miód z małych pasiek, syrop klonowy i dobra czekolada.'},
  {id:'herbaty',  name:'Herbaty i napary',       img:'p-rooibos', desc:'Matcha, rooibos i herbaty liściaste na spokojne chwile.'},
  {id:'oliwy',    name:'Oliwy i przyprawy',      img:'p-oliwa',   desc:'Oliwa z pierwszego tłoczenia i aromatyczne dodatki.'}
];
PB.tags = {bio:'Bio', wegan:'Wegańskie', bezgl:'Bez glutenu'};
/* n = [kcal, tłuszcz, w tym nasycone, węglowodany, w tym cukry, błonnik, białko, sól] na 100 g/ml */
PB.products = [
 {id:'migdaly', name:'Migdały naturalne', short:'Migdały', cat:'orzechy', price:19.90, size:'250 g', tags:['wegan','bezgl'], badge:'Bestseller', rating:4.9, rev:128,
  desc:'Chrupiące migdały w całości, bez soli i bez prażenia. Do owsianki, wypieków i jako przekąska.', ing:'Migdały (100%). Może zawierać ślady innych orzechów.', n:[612,53,4,5.4,4.2,12,21,0.01]},
 {id:'bakalie', name:'Trio bakalii: nerkowce, orzechy, daktyle', short:'Trio bakalii', cat:'orzechy', price:27.90, size:'300 g', tags:['wegan','bezgl'], rating:4.8, rev:74,
  desc:'Trzy klasyki w jednym zestawie: kremowe nerkowce, orzechy laskowe i miękkie daktyle. Gotowa przekąska do pracy.', ing:'Orzechy nerkowca (34%), orzechy laskowe (33%), daktyle suszone (33%).', n:[498,34,5,36,24,6,13,0.02]},
 {id:'pistacje', name:'Pistacje łuskane', short:'Pistacje', cat:'orzechy', price:34.90, size:'200 g', tags:['wegan','bezgl'], badge:'Nowość', rating:4.7, rev:39,
  desc:'Zielone, lekko słodkie pistacje bez łupin i bez soli. Świetne do sałatek, deserów i pesto.', ing:'Pistacje łuskane (100%).', n:[562,45,5.6,18,7.7,10,20,0.01]},
 {id:'mix-goji', name:'Mieszanka śniadaniowa z goji', short:'Mieszanka z goji', cat:'orzechy', price:22.90, size:'300 g', tags:['bio','wegan'], rating:4.6, rev:41,
  desc:'Migdały, jagody goji, pestki dyni i płatki – wystarczy dosypać do jogurtu albo owsianki.', ing:'Migdały (30%), płatki owsiane (30%), jagody goji (20%), pestki dyni (20%).', n:[452,24,3,42,14,9,16,0.03]},
 {id:'platki-owsiane', name:'Płatki owsiane górskie', short:'Płatki owsiane', cat:'kasze', price:6.90, size:'500 g', tags:['wegan'], badge:'Bestseller', rating:4.8, rev:157,
  desc:'Pełnoziarniste płatki o wyraźnej, orzechowej nucie. Baza owsianki, granoli i ciastek.', ing:'Płatki owsiane pełnoziarniste (100%).', n:[372,7,1.3,60,1.1,10,13.5,0.02]},
 {id:'granola', name:'Granola orzechowa pieczona z miodem', short:'Granola', cat:'kasze', price:18.90, size:'350 g', tags:[], rating:4.8, rev:96,
  desc:'Chrupiące klastry z płatków, orzechów i miodu – pieczone w małych partiach.', ing:'Płatki owsiane (55%), miód (15%), orzechy laskowe (12%), migdały (10%), olej kokosowy, cynamon.', n:[455,19,5,56,17,8,11,0.05]},
 {id:'maka', name:'Mąka orkiszowa pełnoziarnista', short:'Mąka orkiszowa', cat:'kasze', price:9.90, size:'1 kg', tags:['bio','wegan'], rating:4.7, rev:62,
  desc:'Mielona na żarnach, o lekko orzechowym smaku. Do chleba, naleśników i ciast.', ing:'Mąka orkiszowa pełnoziarnista typ 2000 (100%) z uprawy ekologicznej.', n:[338,2.4,0.4,62,2.3,10.7,14.6,0.01], per:1000},
 {id:'ryz', name:'Ryż basmati bio', short:'Ryż basmati', cat:'kasze', price:14.90, size:'500 g', tags:['bio','wegan','bezgl'], rating:4.6, rev:48,
  desc:'Długoziarnisty, aromatyczny ryż z podnóża Himalajów. Sypki po ugotowaniu.', ing:'Ryż basmati biały (100%) z uprawy ekologicznej.', n:[352,0.9,0.2,78,0.2,1.4,8.1,0.01]},
 {id:'orkisz', name:'Ziarno orkiszu bio', short:'Orkisz', cat:'kasze', price:8.90, size:'500 g', tags:['bio','wegan'], rating:4.5, rev:27,
  desc:'Całe ziarno do sałatek, zup i kaszotto. Sprężyste, o orzechowym posmaku.', ing:'Ziarno orkiszu (100%) z uprawy ekologicznej.', n:[338,2.4,0.4,60,2,10.7,14.6,0.01]},
 {id:'komosa', name:'Komosa ryżowa (quinoa)', short:'Quinoa', cat:'kasze', price:17.90, size:'500 g', tags:['bio','wegan','bezgl'], rating:4.7, rev:66,
  desc:'Pełnowartościowe białko roślinne. Delikatna i sypka – do miseczek i sałatek.', ing:'Komosa ryżowa biała (100%) z uprawy ekologicznej.', n:[368,6,0.7,64,0,7,14,0.02]},
 {id:'miod', name:'Miód wielokwiatowy', short:'Miód', cat:'slodkie', price:28.90, size:'400 g', tags:['bezgl'], badge:'Bestseller', rating:4.9, rev:171,
  desc:'Płynny miód z lokalnych pasiek, nieprzegrzewany. Do herbaty, owsianki i dressingów.', ing:'Miód pszczeli nektarowy wielokwiatowy (100%).', n:[320,0,0,79,78,0,0.3,0.01]},
 {id:'miod-akacjowy', name:'Miód akacjowy', short:'Miód akacjowy', cat:'slodkie', price:36.90, size:'400 g', tags:['bezgl'], rating:4.8, rev:58,
  desc:'Jasny, łagodny i długo płynny. Najdelikatniejszy z naszych miodów – idealny do deserów.', ing:'Miód pszczeli nektarowy akacjowy (100%).', n:[322,0,0,80,79,0,0.2,0.01]},
 {id:'syrop-klonowy', name:'Syrop klonowy klasa A', short:'Syrop klonowy', cat:'slodkie', price:34.90, oldPrice:39.90, size:'250 ml', tags:['wegan','bezgl'], badge:'Promocja', rating:4.8, rev:45,
  desc:'Bursztynowy syrop z soku klonowego. Do naleśników, owsianki i pieczenia.', ing:'Syrop klonowy (100%).', n:[260,0.1,0,67,60,0,0,0.01]},
 {id:'czekolada', name:'Czekolada gorzka 85% łamana', short:'Czekolada 85%', cat:'slodkie', price:16.90, size:'200 g', tags:['wegan','bezgl'], rating:4.9, rev:83,
  desc:'Grube, nieregularne kawałki ciemnej czekolady. Do pieczenia i do podjadania.', ing:'Miazga kakaowa, cukier trzcinowy, tłuszcz kakaowy. Masa kakaowa min. 85%.', n:[592,48,29,22,14,13,10,0.02]},
 {id:'biala-czekolada', name:'Biała czekolada z migdałami', short:'Biała czekolada', cat:'slodkie', price:17.90, size:'150 g', tags:['bezgl'], badge:'Nowość', rating:4.6, rev:31,
  desc:'Kremowa biała czekolada z całymi prażonymi migdałami i wanilią.', ing:'Tłuszcz kakaowy, cukier trzcinowy, mleko w proszku, migdały (15%), wanilia.', n:[568,38,20,48,46,2,9,0.2]},
 {id:'matcha', name:'Matcha ceremonialna', short:'Matcha', cat:'herbaty', price:49.90, size:'50 g', tags:['bio','wegan','bezgl'], rating:4.8, rev:58,
  desc:'Jasnozielony proszek herbaciany z pierwszych zbiorów. Gładki smak bez goryczy.', ing:'Sproszkowana zielona herbata matcha (100%) z uprawy ekologicznej.', n:[324,5.3,0.9,39,0,38,30,0.03]},
 {id:'rooibos', name:'Rooibos z pomarańczą', short:'Rooibos', cat:'herbaty', price:16.90, size:'80 g', tags:['bio','wegan','bezgl'], rating:4.6, rev:36,
  desc:'Aksamitny napar bez kofeiny z nutą skórki pomarańczowej. Pasuje na wieczór.', ing:'Rooibos (90%), skórka pomarańczy (7%), naturalny aromat pomarańczy (3%).', n:[0,0,0,0,0,0,0,0]},
 {id:'czarna', name:'Herbata czarna liściasta Assam', short:'Herbata Assam', cat:'herbaty', price:21.90, size:'100 g', tags:['wegan','bezgl'], rating:4.7, rev:44,
  desc:'Mocny, słodowy napar z całych liści. Dobra do śniadania, także z mlekiem.', ing:'Herbata czarna liściasta Assam (100%).', n:[0,0,0,0,0,0,0,0]},
 {id:'oliwa', name:'Oliwa extra virgin', short:'Oliwa', cat:'oliwy', price:39.90, size:'500 ml', tags:['bio','wegan','bezgl'], badge:'Bestseller', rating:4.9, rev:142,
  desc:'Zielonkawa, lekko pieprzna oliwa z pierwszego tłoczenia. Do sałatek, pieczywa i gotowych dań.', ing:'Oliwa z oliwek najwyższej jakości z pierwszego tłoczenia (100%).', n:[824,91.6,14,0,0,0,0,0]},
 {id:'przyprawy', name:'Zestaw przypraw korzennych', short:'Przyprawy korzenne', cat:'oliwy', price:24.90, size:'120 g', tags:['wegan','bezgl'], rating:4.5, rev:22,
  desc:'Cynamon, kurkuma i ziele angielskie – trzy słoiczki do owsianek, wypieków i curry.', ing:'Cynamon cejloński mielony, kurkuma mielona, ziele angielskie całe.', n:[310,6,1.5,50,3,25,8,0.05]}
];
/* składnik: [tekst, id produktu ze sklepu | null] */
PB.recipes = [
 {id:'owsianka', title:'Kremowa owsianka z owocami i migdałami', cat:'Śniadania', time:15, serv:2, level:'Łatwy', kcal:380, tags:['wegan'],
  intro:'Ciepła owsianka, która pachnie jak domowy deser. Owoce dodają świeżości, a migdały chrupkości. Moje ulubione śniadanie na chłodne poranki.',
  ing:[['80 g płatków owsianych górskich','platki-owsiane'],['400 ml napoju roślinnego',null],['garść borówek i truskawek',null],['2 łyżki posiekanych migdałów','migdaly'],['2 łyżki mieszanki śniadaniowej z goji','mix-goji'],['1 łyżeczka miodu','miod'],['szczypta cynamonu','przyprawy']],
  steps:['Płatki zalej napojem roślinnym, dodaj szczyptę cynamonu. Gotuj na małym ogniu 5–6 minut, często mieszając.','Gdy owsianka zgęstnieje, zdejmij ją z ognia i odstaw na minutę pod przykryciem.','Przełóż do miseczek, ułóż owoce, posyp migdałami i mieszanką z goji.','Na koniec skrop odrobiną miodu. Podawaj od razu.'],
  tip:'Wieczorem możesz zalać płatki napojem i zostawić w lodówce – rano wystarczy podgrzać.'},
 {id:'zielona-miska', title:'Zielona miska z komosą, awokado i pistacjami', cat:'Obiady', time:30, serv:2, level:'Łatwy', kcal:520, tags:['wegan','bezgl'],
  intro:'Kolorowa miska pełna warzyw, białka z komosy i zdrowych tłuszczów. Lekka, ale sycąca – idealna na lunch do pracy.',
  ing:[['150 g komosy ryżowej','komosa'],['1 awokado',null],['garść pomidorków i rzodkiewek',null],['garść sałaty i kiełków',null],['3 łyżki pistacji','pistacje'],['2 łyżki oliwy extra virgin','oliwa'],['sok z połowy cytryny',null],['sól i pieprz',null]],
  steps:['Komosę przepłucz na sicie i gotuj w podwójnej ilości wody 12–15 minut, aż woda się wchłonie. Odstaw pod przykryciem na 5 minut.','Pistacje grubo posiekaj i krótko upraż na suchej patelni.','Wymieszaj oliwę z sokiem z cytryny, solą i pieprzem – to dressing.','Do misek włóż sałatę, komosę, warzywa i plastry awokado. Polej dressingiem i posyp pistacjami.'],
  tip:'Komosę ugotuj na zapas – w lodówce wytrzyma 4 dni.'},
 {id:'matcha-latte', title:'Latte matcha z miodem akacjowym', cat:'Napoje', time:5, serv:1, level:'Bardzo łatwy', kcal:120, tags:['bezgl'],
  intro:'Delikatna pianka, piękny zielony kolor. Matcha daje spokojną energię bez kofeinowego „strzału”.',
  ing:[['1 łyżeczka matchy','matcha'],['50 ml gorącej wody (ok. 80°C)',null],['200 ml ciepłego mleka (np. owsianego)',null],['1 łyżeczka miodu akacjowego','miod-akacjowy']],
  steps:['Matchę przesiej do miseczki. Zalej gorącą (nie wrzącą) wodą i energicznie wymieszaj bambusową miotełką, aż powstanie piana.','Mleko podgrzej i spień.','Do filiżanki wlej matchę z miodem, a następnie powoli dolej spienione mleko.'],
  tip:'Wrzątek sprawia, że matcha robi się gorzka – woda powinna mieć ok. 80°C.'},
 {id:'ciasteczka', title:'Ciasteczka owsiane z gorzką czekoladą', cat:'Desery', time:25, serv:12, level:'Łatwy', kcal:150, tags:[],
  intro:'Kruche z zewnątrz, miękkie w środku, z dużymi kawałkami czekolady. Jedna miska, kwadrans pracy i zapach na całe mieszkanie.',
  ing:[['120 g płatków owsianych','platki-owsiane'],['100 g mąki orkiszowej','maka'],['100 g gorzkiej czekolady, posiekanej','czekolada'],['3 łyżki miodu','miod'],['80 g miękkiego masła',null],['1 jajko',null],['szczypta soli',null]],
  steps:['Piekarnik nagrzej do 175°C. Blachę wyłóż papierem do pieczenia.','Masło utrzyj z miodem, dodaj jajko, a potem mąkę, płatki i sól. Wymieszaj krótko, tylko do połączenia.','Wmieszaj posiekaną czekoladę. Nakładaj łyżką porcje ciasta, zostawiając odstępy.','Piecz 10–12 minut, aż brzegi się zezłocą. Studź na blasze – ciastka stwardnieją.'],
  tip:'Surowe ciasto możesz zamrozić w kulkach i piec prosto z zamrażarki, o 2 minuty dłużej.'},
 {id:'pancakes', title:'Puszyste pancakes orkiszowe z syropem klonowym', cat:'Śniadania', time:20, serv:3, level:'Łatwy', kcal:410, tags:[],
  intro:'Niedzielne śniadanie, na które wszyscy czekają. Mąka orkiszowa dodaje im lekko orzechowego smaku.',
  ing:[['200 g mąki orkiszowej','maka'],['250 ml mleka',null],['1 jajko',null],['1 łyżeczka proszku do pieczenia',null],['syrop klonowy do polania','syrop-klonowy'],['garść borówek',null]],
  steps:['Mąkę wymieszaj z proszkiem do pieczenia. Dodaj mleko i jajko, wymieszaj krótko – grudki są w porządku.','Odstaw ciasto na 5 minut. Rozgrzej patelnię na średnim ogniu, lekko natłuść.','Smaż placki po ok. 2 minuty z każdej strony, aż urosną i się zezłocą.','Ułóż w stos, polej syropem klonowym i posyp borówkami.'],
  tip:'Nie dociskaj placków łopatką – stracą puszystość.'},
 {id:'deser', title:'Deser jogurtowy z truskawkami w słoiczkach', cat:'Desery', time:10, serv:4, level:'Bardzo łatwy', kcal:210, tags:['bezgl'],
  intro:'Lekki deser, który zrobisz dzień wcześniej. Wygląda pięknie na stole i znika w minutę.',
  ing:[['400 g gęstego jogurtu naturalnego',null],['2 łyżki miodu akacjowego','miod-akacjowy'],['250 g truskawek',null],['4 łyżki granoli do posypania','granola'],['kilka listków mięty',null]],
  steps:['Jogurt wymieszaj z miodem.','Truskawki pokrój w kostkę, część zostaw do dekoracji.','W słoiczkach układaj warstwami jogurt i truskawki. Schłodź minimum 30 minut.','Tuż przed podaniem posyp granolą i udekoruj miętą.'],
  tip:'Granolę dodawaj na samym końcu, żeby została chrupiąca.'},
 {id:'miska-granola', title:'Miska śniadaniowa z granolą i owocami', cat:'Śniadania', time:10, serv:1, level:'Bardzo łatwy', kcal:430, tags:[],
  intro:'Gotowa w kilka minut, a syci do obiadu. Kolory dobierz do sezonu – zimą sprawdzą się mrożone owoce.',
  ing:[['150 g jogurtu lub skyru',null],['4 łyżki granoli orzechowej','granola'],['garść malin i borówek',null],['pół mango lub banana',null],['1 łyżka migdałów','migdaly'],['1 łyżeczka syropu klonowego','syrop-klonowy']],
  steps:['Jogurt przełóż do miski.','Owoce pokrój i ułóż pasami obok siebie.','Dodaj granolę i migdały, polej syropem klonowym.'],
  tip:'Zmiksowany z jagodami jogurt nabierze pięknego fioletowego koloru.'},
 {id:'salatka', title:'Sałatka z orkiszem, pomidorami i nerkowcami', cat:'Obiady', time:35, serv:3, level:'Łatwy', kcal:460, tags:['wegan'],
  intro:'Sałatka, która nie więdnie w pudełku. Ziarno orkiszu jest sprężyste i dobrze chłonie dressing.',
  ing:[['200 g ziarna orkiszu','orkisz'],['250 g pomidorków koktajlowych',null],['duża garść rukoli',null],['50 g nerkowców z zestawu bakalii','bakalie'],['3 łyżki oliwy extra virgin','oliwa'],['1 łyżka musztardy i sok z cytryny',null]],
  steps:['Orkisz namocz na godzinę, a potem gotuj 25–30 minut do miękkości. Odcedź i przestudź.','Nerkowce upraż na suchej patelni.','Oliwę wymieszaj z musztardą i sokiem z cytryny.','Połącz orkisz z pomidorkami i rukolą, polej dressingiem i posyp nerkowcami.'],
  tip:'Zamiast orkiszu możesz użyć komosy – skróci to gotowanie o połowę.'}
];
PB.videos = [
 {id:'v1', title:'Tydzień ze zdrowym śniadaniem – 5 szybkich pomysłów', dur:'12:40', cat:'Przepisy', recipe:'owsianka'},
 {id:'v2', title:'Jak kroić szybciej i bezpieczniej? Podstawy pracy z nożem', dur:'09:15', cat:'Poradniki'},
 {id:'v3', title:'Domowy chleb orkiszowy krok po kroku', dur:'15:02', cat:'Przepisy'},
 {id:'v4', title:'Jak czytać etykiety? Poradnik zakupowy Moniki', dur:'11:30', cat:'Poradniki'},
 {id:'v5', title:'Matcha bez tajemnic – jak przygotować idealne latte', dur:'06:48', cat:'Przepisy', recipe:'matcha-latte'},
 {id:'v6', title:'Kulisy: jak wybieramy produkty do naszego sklepu', dur:'14:20', cat:'Kulisy'}
];
PB.coupon = {code:'ZDROWIE10', pct:10};
PB.freeShip = 150;
PB.ship = [
 {id:'kurier', name:'Kurier (1–2 dni robocze)', price:14.99},
 {id:'paczkomat', name:'Paczkomat 24/7 (1–2 dni)', price:11.99},
 {id:'odbior', name:'Odbiór osobisty – Poznań', price:0}
];
