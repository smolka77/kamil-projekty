# Market ZIKO – prototyp remake'u

Klikalny prototyp (statyczny HTML/CSS/JS) do akceptacji wyglądu nowego market-ziko.pl.
Dane produktów, ceny i treści są poglądowe (`assets/js/data.js`).

## Uruchomienie
```bash
cd market-ziko && python3 -m http.server 8000   # http://localhost:8000
```

## Strony
`index` · `kategoria?c=…` (filtry, sortowanie, wyszukiwarka) · `produkt?id=…` · `koszyk` · `zamowienie` (demo, konto: `?konto=1`) · `promocje` · `blog` / `wpis?id=…` (Poradnik) · `info?s=o-firmie|dostawa|regulamin|reklamacje|zwrot|wymiana|zlecenia` · `kontakt`

Koszyk działa w `localStorage`, zamówienia nie są nigdzie zapisywane.

## Platforma docelowa
Obecny sklep to PrestaShop 1.4/1.5 (nieobsługiwany). Rekomendacja: **PrestaShop 8.x + własny motyw** – panel administratora (produkty, zamówienia, strony CMS, moduł bloga) jest wbudowany, więc osobny admin panel nie jest potrzebny.

## Paleta (z obecnego sklepu)
Czerwień `#e10600`, grafit `#25272b` / `#4a4d52`, jasnoszare tło `#eef0f2`, biel. Nagłówki: Oswald (wąski, jak w oryginale), tekst: Inter.
