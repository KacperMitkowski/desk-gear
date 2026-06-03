# Obrazki produktów

Lokalne JPG-i seedowanego katalogu sklepu, używane przez `prisma/seed.ts` przy tworzeniu `ProductImage.path` (zapisywane jako `/products/{nazwa}.jpg`, Next serwuje je bezpośrednio z `public/`).

## Konwencja nazewnictwa

```
{categorySlug}-{n}.jpg        # zdjęcie główne produktu n
{categorySlug}-{n}-{m}.jpg    # m-te zdjęcie dodatkowe produktu n
```

Gdzie:
- `categorySlug` — slug kategorii liść po angielsku (ADR-014): `keyboards`, `mice`, `headphones`, `microphones`, `monitors`, `drives`, `cables`, `chairs`, `desk-accessories`, `t-shirts`.
- `n` — numer produktu w kategorii (1-based).
- `m` — numer zdjęcia dodatkowego (1, 2, ...).

Przykłady:
```
microphones-2.jpg       # główne zdjęcie produktu „microphone-2" (slug w DB)
microphones-2-1.jpg     # 1. dodatkowe (np. widok z boku)
microphones-2-2.jpg     # 2. dodatkowe (np. tył)
```

## Jak seed odnajduje pliki

`prisma/seed.ts` skanuje ten folder w czasie runu i:
1. Grupuje pliki po prefiksie `{categorySlug}-{n}` (filtrując warianty po regex-ie, żeby `chairs-1-2.jpg` nie został potraktowany jako produkt `chairs-1` o numerze 2).
2. Per kategoria-liść tworzy tyle produktów ile jest unikalnych `{categorySlug}-{n}.jpg`.
3. Per produkt tworzy `ProductImage`-y: główne (`isPrimary=true, position=0`) + dodatkowe (`position=1,2,...`) zgodnie z tym co znajdzie.

Czyli **liczba produktów per kategoria = liczba głównych obrazków per kategoria w tym folderze**. Żeby dorzucić produkt — wystarczy dorzucić nowy plik z odpowiednią nazwą.

## Odejście od ADR-011

ADR-011 mówi WebP 1600×1600 q85. Świadomie zostajemy przy oryginalnych JPG-ach (bez resize-u, bez konwersji formatu) — prostsze, mniejszy diff w PR, brak zależności od `sharp`. Jeśli kiedyś trzeba wrócić do WebP: konwertuj pliki narzędziem dowolnym, zmień rozszerzenie `.jpg` → `.webp` w nazwach plików tutaj, regex w `prisma/seed.ts` (3× `\.jpg` w pliku) podmień na `\.webp`.

## Jak dodać nowe produkty

1. Wrzuć JPG bezpośrednio do `public/products/` z nazwą zgodną z konwencją:
   - główne: `{categorySlug}-{n}.jpg` (np. `microphones-8.jpg`),
   - opcjonalnie warianty: `{categorySlug}-{n}-{1,2,...}.jpg` (np. `microphones-8-1.jpg`).
2. `npx prisma db seed` — seeder przeskanuje folder, doda nowy produkt + warianty + obrazki.

Seed jest idempotentny (`faker.seed(42)` na start, upserty po `slug`/`sku`/`orderNumber`), więc kolejne runy nie dublują rekordów — dorzucają tylko nowe.
