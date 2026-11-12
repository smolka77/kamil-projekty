# ProBazar – klikalny prototyp sklepu i bloga

Statyczny prototyp (HTML/CSS/JS, bez frameworków i backendu) do akceptacji wyglądu.
Wszystkie produkty, przepisy i filmy to **dane demonstracyjne**.

Wersja 2: jasny, spokojny wygląd oparty na prawdziwych zdjęciach (zamiast ilustracji), czcionki Cormorant Garamond + DM Sans hostowane lokalnie.

## Jak otworzyć
Otwórz `index.html` w przeglądarce (dwuklik) – bez serwera i bez instalacji.
Koszyk i zamówienie działają w `localStorage` (płatności i wysyłka formularzy są symulowane).
Kod rabatowy do testów: `ZDROWIE10`.

## Struktura
| Plik | Zawartość |
|---|---|
| `index.html` | Strona główna: hero, kategorie, polecane, przepisy, wideo, wartości, Monika, newsletter |
| `sklep.html` | Lista produktów: kategorie, filtry (dieta, cena), sortowanie, wyszukiwanie (`?kat=`, `?q=`) |
| `produkt.html?id=…` | Karta produktu: opis, skład, wartości odżywcze, dostawa, przepisy z produktem |
| `koszyk.html`, `zamowienie.html` | Koszyk z kodem rabatowym i darmową dostawą; zamówienie (dane, dostawa, płatność) i potwierdzenie |
| `blog.html`, `przepis.html?id=…` | Blog Moniki; przepis ze składnikami, krokami i „Kup składniki” |
| `wideo.html` | Zapowiedzi filmów (placeholdery YouTube, modal) |
| `o-nas.html`, `kontakt.html`, `faq.html` | Strony informacyjne |
| `css/style.css` | Cały design: tokeny w `:root`, komponenty, responsywność (mobile first, 640/900/1100 px) |
| `js/data.js` | Dane demo: 5 kategorii, 20 produktów, 8 przepisów, 6 filmów |
| `js/art.js` | Logo SVG, ikony liniowe, funkcje wstawiające zdjęcia |
| `js/app.js` | Header/footer, koszyk, wyszukiwarka, renderery stron |
| `assets/logo.webp` | Oryginalne logo (znak odtworzono też jako SVG) |
| `assets/img/` | Zdjęcia (`p-<id>` produkty, `r-<id>` przepisy, `v<n>` wideo, hero itd.) – Unsplash, licencja Unsplash; do podmiany na własne zdjęcia produktów |
| `assets/fonts/` | Cormorant Garamond i DM Sans (licencja OFL), latin + latin-ext |

## Mapowanie na motyw WordPress + WooCommerce
Prototyp renderuje listy z `data.js`, ale komponenty mają osobne, semantyczne klasy – przenoszą się 1:1 do szablonów.

| Prototyp | WordPress / WooCommerce |
|---|---|
| `:root` (kolory, promienie, cienie, fonty) | `theme.json` + `:root` w `style.css` motywu |
| header, `.mnav`, `.search-panel`, `.drawer`, footer | `header.php`, `footer.php`, mini-koszyk przez fragmenty WooCommerce (`woocommerce_add_to_cart_fragments`) |
| `index.html` | `front-page.php` |
| `sklep.html` + `.pcard` + `.filters` | `archive-product.php`, `content-product.php`, `taxonomy-product_cat`; filtry: taksonomie/atrybuty (dieta = atrybut `pa_dieta`) |
| `produkt.html` | `single-product.php` (zakładki = `woocommerce_product_tabs`; wartości odżywcze = pola ACF) |
| `koszyk.html`, `zamowienie.html` | `cart/cart.php`, `checkout/form-checkout.php`, `checkout/thankyou.php` (override szablonów WooCommerce) |
| `blog.html`, `.rcard` | `archive-przepis.php` – własny typ wpisu `przepis` + taksonomia kategorii |
| `przepis.html` | `single-przepis.php`; składniki = repeater ACF z polem „produkt WooCommerce”; „Kup składniki” = przycisk dodający produkty do koszyka (AJAX) |
| `wideo.html`, `.vcard` | CPT `wideo` z polem URL YouTube (osadzenie `youtube-nocookie.com`) |
| `o-nas`, `kontakt`, `faq` | zwykłe strony (`page.php`); formularz kontaktowy np. przez wtyczkę formularzy |
| zdjęcia `assets/img` | miniatury produktów i wpisów z biblioteki mediów; kontenery `aspect-ratio` już gotowe |

Admin panel zapewnia WordPress/WooCommerce – prototyp go nie zawiera.

## Dostępność i wydajność
Skip-link, widoczny focus, kontrasty AA, etykiety formularzy, `aria-*` w menu/zakładkach, `prefers-reduced-motion`. Brak zewnętrznych zasobów (czcionki i zdjęcia są w repozytorium, zdjęcia w WebP z `loading="lazy"`).
