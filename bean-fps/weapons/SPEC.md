# Bean FPS – specyfikacja modułu broni

Każda broń to osobny moduł ES: `bean-fps/weapons/<id>.js` (`ak47`, `m4a1s`, `glock`, `usps`).
Gra i podgląd ładują go tak samo, więc moduł musi spełniać ten kontrakt dokładnie.

## Importy i zasoby
- Wolno importować tylko `three` (`import * as THREE from 'three'`) oraz dodatki `three/addons/...`
  (np. `three/addons/geometries/RoundedBoxGeometry.js`, `three/addons/utils/BufferGeometryUtils.js`).
  Import map dostarcza strona (three r170).
- Zero zewnętrznych plików, obrazków, fontów i sieci. Tekstury tylko proceduralne (`CanvasTexture`, max 512×512).
- Bez napisów, logotypów i znaków towarowych na broni.

## Eksport
```js
export function build(opts = {}) { ... return weapon; }
```
`build` jest wywoływane wiele razy (gracz + przeciwnicy), więc geometrie, materiały i tekstury
cache'uj na poziomie modułu. Każde wywołanie zwraca NOWĄ `THREE.Group` (siatki mogą współdzielić geometrię/materiał).

## Układ współrzędnych
- Metry, skala rzeczywista.
- +X w prawo, +Y w górę, **−Z do przodu** (kierunek lufy). Oś przewodu lufy równoległa do −Z, leży w x = 0.
- **Początek układu = `anchors.gripR` = (0,0,0)**: środek dłoni strzelającej na chwycie pistoletowym
  (ok. 1/3 wysokości chwytu od góry, w połowie jego głębokości).

## Zwracany obiekt
```js
{
  id: 'ak47', name: 'AK-47',
  hands: 'rifle' | 'pistol',
  suppressed: false,
  group,                         // THREE.Group – korzeń modelu
  parts: {
    mag,                         // Object3D: cały wyjmowalny magazynek (ze stopką); JEGO początek = środek góry magazynka
                                 //   (w gnieździe), żeby dało się go wysuwać/wsuwać przy przeładowaniu
    slide,                       // Object3D przesuwany o +Z przy strzale: zamek pistoletu; w karabinie rączka
                                 //   przeładowania/suwadło widoczne z zewnątrz; może być null
  },
  anchors: {                     // THREE.Vector3 w układzie group
    gripR,                       // (0,0,0) – dłoń strzelająca na chwycie
    gripL,                       // karabin: spód łoża w miejscu, gdzie trzyma lewa dłoń (ok. 1/3 długości łoża od komory);
                                 // pistolet: lewa strona chwytu/kabłąka – tam, gdzie lewa dłoń obejmuje prawą
    muzzle,                      // dokładny koniec lufy albo tłumika (stąd wylatuje pocisk i płomień)
    sightRear,                   // środek szczerbinki/przeziernika – tędy patrzy oko przy celowaniu
    sightFront,                  // SAM CZUBEK muszki
    magWell,                     // środek góry gniazda magazynka
    ejectPort,                   // środek okna wyrzutowego (stąd wylatują łuski, w prawo)
    stockEnd,                    // najbardziej wysunięty do tyłu punkt (stopka kolby / tył chwytu pistoletu)
  },
  boreY,                         // wysokość osi lufy nad początkiem układu
  flashScale,                    // 1 = zwykły płomień, ok. 0.3 dla broni z tłumikiem
}
```

## Linia celownika (krytyczne)
- `sightRear` i `sightFront` mają **identyczne x (= 0) i y**; `sightFront.z < sightRear.z`.
- Patrząc z oka położonego na tej linii ~10 cm za `sightRear` wzdłuż −Z, czubek muszki ma wypadać
  dokładnie na środku szczerbinki/przeziernika.
- Nic poza muszką nie może wystawać ponad linię celownika przed `sightRear` w centrum widoku
  (osłona muszki musi być otwarta od góry albo pierścieniowa, tłumik pod linią).
- Muszka cienka (≤ 2.5 mm szerokości), żeby nie zasłaniała celu.

## Poprzeczka jakości
Stylizowany realizm na poziomie AAA:
- Główne bryły z profili `Shape` + `ExtrudeGeometry` z fazkami (bevel), części okrągłe z `LatheGeometry` /
  `CylinderGeometry` (24–32 segmenty). Żadnych gołych sześcianów jako główne części.
- Detale: nacięcia, nity, kołki, śruby, szyny, przyrządy celownicze, spust z kabłąkiem, przełącznik ognia,
  okno wyrzutowe, zatrzask magazynka itp.
- PBR: stal metalness 0.85–1, roughness 0.3–0.5; polimer metalness 0, roughness 0.6–0.8;
  drewno z proceduralnym słojem (`CanvasTexture`), roughness ~0.55 (opcjonalnie clearcoat w `MeshPhysicalMaterial`).
- Gładkie cieniowanie tam, gdzie powierzchnia jest zaokrąglona; poprawne normalne, brak migotania
  (z-fighting) i przenikających się części.
- Budżet: ≤ 20 000 trójkątów, ≤ 6 materiałów na broń. `castShadow = true` na siatkach.

## Narzędzia (podgląd i walidacja)
Serwer deweloperski: `http://localhost:8084` (katalog `$DEV`, patrz brief zadania).
- `node $DEV/tools/shoot_weapon.mjs <id> <out.png> [--anchors]` – arkusz 7 widoków
  (prawa, lewa, góra, przód ¾, tył ¾, zbliżenie komory, **widok przez przyrządy celownicze**).
  `--anchors` rysuje kolorowe kulki punktów zaczepienia i linię celownika.
- `node $DEV/tools/validate_weapon.mjs <id>` – JSON z testami kontraktu; wszystkie muszą przejść.
