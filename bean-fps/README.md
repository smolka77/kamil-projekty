# bean-fps

Fasolka z karabinem, widok FPS (three.js). Źródło strony: `src/page.html`.

Nie ma w repo (w `.gitignore`):
- `bean-data.js` – model GLB zakodowany w base64: `export default "<base64>";`
- `vendor/three/` – three.js r170 (`npm i three@0.170.0`, skopiuj pakiet do `vendor/three`)
- `index.html` – generowany przez `./build.sh`

Tryb **Strzelnica** (lobby → Strzelnica → GRAJ): mapa treningowa `strzelnica-data.js` (budka strzelecka + plac 44×70 m z osłonami),
na której czerwone fasolki pojawiają się w 44 punktach (`MAP.targets`: blisko / średnio / daleko, część biega na boki).
Logika celów, statystyki i tablica ustawień na tylnej ścianie budki (klik celownikiem: zakres, ile naraz, jak często się pojawiają,
jak długo stoją, ruchome cele, dźwięk, reset, trening wł./wył.) są w `range.js`, podpięte w `page.html` (`createRange`).
Mapa nie wchodzi do rotacji 1v1. Dane mapy (`MAP.clips` = niewidzialne blokady ruchu nad ladą) pochodzą z projektu map
(folder `strzelnica/`, eksport `strzelnica-data.js`).

Uruchomienie: `./build.sh && npx http-server . -p 8082`, potem http://localhost:8082
Sterowanie: WASD, Shift, Spacja, LPM strzał, PPM celowanie, R przeładowanie, V zmiana widoku, C kucanie, M wyciszenie.
