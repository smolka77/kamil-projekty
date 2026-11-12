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
  style/toon.js                   cieniowanie kreskówkowe + kontur
  world/World.js                  pusta mapa
  ui/HUD.js                       interfejs
  Dummy.js                        przeciwnik treningowy
```
