# bean-fps

Fasolka z karabinem, widok FPS (three.js). Źródło strony: `src/page.html`.

Nie ma w repo (w `.gitignore`):
- `bean-data.js` – model GLB zakodowany w base64: `export default "<base64>";`
- `vendor/three/` – three.js r170 (`npm i three@0.170.0`, skopiuj pakiet do `vendor/three`)
- `index.html` – generowany przez `./build.sh`

Uruchomienie: `./build.sh && npx http-server . -p 8082`, potem http://localhost:8082
Sterowanie: WASD, Shift, Spacja, LPM strzał, PPM celowanie, R przeładowanie, V zmiana widoku, C kucanie, M wyciszenie.
