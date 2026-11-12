# 1v1 Shooter

Strzelanka 1v1 w przeglądarce (Three.js + Vite). Etap 1: **postać**.

## Uruchomienie

```bash
npm install
npm run dev
```

Otwórz http://localhost:5173 i kliknij **GRAJ**.

## Co jest zrobione (etap 1 — postać)

- **Dr. Iskra** — oryginalna postać w stylu animowanej kreskówki: cieniowanie
  dwutonowe (toon) + czarny kontur, wysoka chuda sylwetka, fartuch, gogle,
  fioletowe włosy zaczesane do tyłu.
- Proceduralna animacja: chód / bieg / sprint / kucanie / skok / lądowanie,
  skręt bioder przy chodzeniu na boki, tułów i głowa podążają za celownikiem,
  poły fartucha reagują na ruch, taniec (B).
- IK rąk — dłonie zawsze trzymają broń (też przy celowaniu, sprincie, przeładowaniu).
- Karabin szturmowy: ogień ciągły, rozrzut rosnący przy ruchu/serii,
  odrzut, smugi, błysk z lufy, magazynek 30, przeładowanie z animacją.
- Kamera TPP zza ramienia + celowanie (PPM) i widok FPP (V).
- Manekin treningowy (ta sama postać, inna skórka): tarcza + zdrowie,
  liczby obrażeń, headshot ×1.5, eliminacja i odrodzenie.
- HUD: tarcza/zdrowie, amunicja, celownik reagujący na rozrzut, hitmarker.

## Grafika

- Potok renderowania (`src/render/Pipeline.js`): HDR → GTAO (okluzja otoczenia) → subtelny bloom →
  korekcja nasycenia → tone mapping ACES → SMAA (+ MSAA 4× na wysokiej jakości).
- Jakość: `?quality=high|medium|low` (low = bez post-processingu). Bez parametru: `high` z automatycznym
  obniżaniem jakości, gdy klatki są za wolne (najpierw AO/MSAA, potem rozdzielczość, na końcu bloom).
  Dodatkowo `?autoquality=1|0`, `?tonemap=aces|agx|neutral`, `?exposure=1.0`.
- Oświetlenie (`src/world/Sky.js`): niebo z chmurami, środowisko IBL (PMREM) z tego samego nieba,
  słońce z miękkimi cieniami podążającymi za graczem.
- Materiały "stylized PBR" (`src/style/materials.js`): skóra, tkaniny, skóra naturalna, guma, tworzywo,
  metal, włosy, oczy, szkło świecące, emisja, murawa. Podgląd: http://localhost:5173/dev/materials.html

## Sterowanie

| Klawisz | Akcja |
|---|---|
| WASD | ruch |
| Mysz | rozglądanie |
| LPM / PPM | strzał / celowanie |
| Shift | sprint |
| Spacja | skok |
| C | kucanie |
| R | przeładowanie |
| V | widok TPP / FPP |
| B | taniec |
| H | pokaż / ukryj sterowanie |
| Esc | pauza |

## Struktura

```
src/
  character/CharacterModel.js     model postaci + skórki
  character/CharacterAnimator.js  animacja proceduralna + IK rąk
  weapons/AssaultRifle.js         broń
  player/Player.js                ruch, kamera TPP/FPP
  player/Input.js                 klawiatura, mysz, pointer lock
  combat/Combat.js                strzelanie, efekty
  combat/Sfx.js                   dźwięki (Web Audio, bez plików)
  render/Pipeline.js              renderer + post-processing + jakość
  style/materials.js              materiały stylized PBR (triplanar, AO z wierzchołków)
  style/toon.js                   cieniowanie kreskówkowe + kontur (do wycofania)
  world/Sky.js                    niebo, IBL, słońce i cienie
  world/World.js                  pusta mapa
  ui/HUD.js                       interfejs
  Dummy.js                        przeciwnik treningowy
```
