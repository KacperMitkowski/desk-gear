# ARCHITECTURE.md — DeskGear

> **Projekt**: E-commerce sklepu z akcesoriami komputerowymi i wyposażeniem stanowiska pracy (klawiatury, myszki bezprzewodowe, słuchawki, mikrofony, monitory, dyski, kable, akcesoria biurowe, fotele, koszulki).
> **Cel architektoniczny**: zbudować solidny, dobrze przetestowany szkielet — fundament pod kolejne projekty (SaaS dla kancelarii, RCP dla kierowców).
> **Autor**: Kacper · solo developer · faza 1 (MVP)
> **Data**: 2026-05

---

> ⚠️ **Dokument żywy**
>
> Ten plik **będzie się zmieniał w czasie** — celowo, świadomie i często. Architektura ewoluuje wraz z kodem, decyzje weryfikuje się dopiero w trakcie implementacji, a "ostateczne" wybory z fazy 0 mogą okazać się złe w fazie 2. To jest **dokumentacja stanu wiedzy na dziś**, nie kontrakt na całą inwestycję.
>
> **Co to oznacza w praktyce:**
>
> - Każda istotna zmiana → commit do tego pliku w tym samym PR co zmiana w kodzie. Nie ma "dopiszę później".
> - ADR-y (sekcja 17) są **append-only** — gdy decyzja się zmienia, nie kasujemy starej, dopisujemy nową ze statusem "Superseded by ADR-XXX".
> - Sekcje "Otwarte pytania i ryzyka" (sekcja 18) oraz "Plan faz" (sekcja 16) zmieniają się najczęściej — to jest normalne i pożądane.
> - Jeżeli przy review PR widzisz że kod robi coś inaczej niż ten dokument — to **jeden z dwóch jest do poprawy**, i bardzo często to dokument, nie kod.
>
> _"Decyzje architektoniczne są tymczasowe. Ważne, żeby były świadome."_

---

## Spis treści

1. [Filozofia i zasady projektowe](#1-filozofia-i-zasady-projektowe)
2. [Stack technologiczny](#2-stack-technologiczny)
3. [Architektura warstwowa](#3-architektura-warstwowa)
4. [Struktura katalogów](#4-struktura-katalogów)
5. [Model domenowy (Prisma)](#5-model-domenowy-prisma)
6. [Walidacja i obsługa błędów](#6-walidacja-i-obsługa-błędów)
7. [Autentykacja i autoryzacja](#7-autentykacja-i-autoryzacja)
8. [Koszyk: strategia gość → zalogowany](#8-koszyk-strategia-gość--zalogowany)
9. [Checkout i płatności (faza 1 vs faza 2)](#9-checkout-i-płatności-faza-1-vs-faza-2)
10. [Komponenty UI: warstwa shadcn + wrappery RHF](#10-komponenty-ui-warstwa-shadcn--wrappery-rhf)
11. [Internacjonalizacja (i18n)](#11-internacjonalizacja-i18n)
12. [Strategia testów](#12-strategia-testów)
13. [CI/CD i jakość kodu](#13-cicd-i-jakość-kodu)
14. [Observability (faza późniejsza)](#14-observability-faza-późniejsza)
15. [Deployment + Neon branching](#15-deployment--neon-branching)
16. [Plan faz](#16-plan-faz)
17. [Decyzje architektoniczne (ADR)](#17-decyzje-architektoniczne-adr)
18. [Otwarte pytania i ryzyka](#18-otwarte-pytania-i-ryzyka)
19. [Następne kroki](#19-następne-kroki)

---

## 1. Filozofia i zasady projektowe

### 1.1. Zasady nadrzędne

- **Add things when needed, not "just in case"** — żadnych komponentów, hooków, abstrakcji "na zapas". Każda kontrolka, każda warstwa, każdy plik istnieje, bo aktualnie rozwiązuje konkretny problem.
- **Spójność > elastyczność** — jeden sposób na walidację, jeden sposób na błędy, jeden sposób na strukturę Server Action. Łatwiej wybaczyć ograniczenie niż chaos.
- **Backend = source of truth** — każda walidacja powtarzana po stronie serwera (Zod), nawet jeśli frontend już ją wykonał.
- **Type safety end-to-end** — od schematu Zod, przez Server Action, po RHF formularz. Żadnego `any`, żadnego `as unknown as X`.
- **Testowalność > sprytność** — kod, który trudno przetestować, prawdopodobnie ma złą architekturę.

### 1.2. Czego _nie_ robimy w fazie 1

| Świadomie odkładamy              | Powód                                                                                         |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| OAuth (Google/Apple)             | Brak business value w fazie 1, dodaje powierzchnię błędów. Mockup ignorujemy.                 |
| Stripe (real payments)           | Faza 2 — najpierw checkout flow + fake "PAID" status.                                         |
| i18n EN                          | Faza 2 — najpierw polski, ale **kod od początku gotowy na i18n** (klucze, pliki per feature). |
| Sentry / observability           | Faza 3 — najpierw stabilny core.                                                              |
| Storybook                        | Faza 3 — w fazie 1 dokumentacja komponentów = testy + Tailwind classes inline.                |
| Multi-environment (staging/prod) | Faza 2 — w fazie 1 jedno środowisko na Vercel.                                                |
| Soft deletes                     | Hard delete + audit log dopiero gdy biznes tego wymaga.                                       |
| Caching (Redis)                  | Next.js cache + ISR wystarczy. Redis dopiero przy realnym ruchu.                              |
| Neon preview branches per PR     | Faza 2 — sekcja 15.                                                                           |

### 1.3. Rozdzielenie reads i writes — RSC dla reads, Server Actions dla mutacji

Stosujemy **standardową praktykę Next.js App Router**:

- **Reads** (PLP, PDP, listy admina, szczegóły zamówienia) → **Server Components** wywołują `service` bezpośrednio. Bez Server Action, bez POST-a, bez `ActionResult<T>` w środku.
- **Writes** (dodanie do koszyka, składanie zamówienia, CRUD produktów) → **Server Actions** (`'use server'`) z pełnym pipeline'em (auth check → Zod walidacja → service → `ActionResult<T>` → `revalidatePath`).

**Dlaczego ten podział**:

- RSC z bezpośrednim wywołaniem service'u dostaje natywne cache'owanie Next.js (`fetch` cache, ISR, route cache), prefetch, semantykę GET, back/forward cache.
- Server Actions to POST-y, świetne do mutacji (idempotentność, side-effecty, `revalidatePath`) ale słabe do reads (brak cache, brak prefetch, większy narzut serializacji).
- Frontend ma dwa proste wzorce: `await service.findMany()` w `page.tsx` vs `await someAction(data)` w komponencie.

**Konsekwencje dla obsługi błędów**:

- Mutacje: błąd → `ActionResult<T>` → `setError` w RHF lub toast (sekcja 6).
- Reads: błąd → `throw` w RSC → `error.tsx` (Next.js Error Boundary). Brak `ActionResult` na ścieżce read.

---

## 2. Stack technologiczny

### 2.1. Core

| Warstwa            | Technologia                     | Wersja docelowa                     | Uzasadnienie                                                                                                                                                        |
| ------------------ | ------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework          | Next.js (App Router, Turbopack) | **16.2.x**                          | Adapter API stable, Server Fast Refresh, AI dev tools, RSC + Server Actions                                                                                         |
| Runtime React      | React                           | **19.x**                            | Wymagane przez Next 16, dostępne `useActionState`, `useOptimistic`, `use()`                                                                                         |
| Język              | TypeScript                      | **5.9.x** _(minimum 5.5 dla Zod 4)_ | strict mode, no implicit any                                                                                                                                        |
| Runtime            | Node.js                         | **22 LTS**                          | Vercel default, Next 16 wymaga ≥ 20                                                                                                                                 |
| Package manager    | npm                             | 10+                                 | wbudowany w Node, najprostszy setup, zero dodatkowych narzędzi w CI                                                                                                 |
| ORM                | Prisma                          | **7.x**                             | Rust-free client (Prisma 7), znacznie lepsza wydajność, prisma.config.ts                                                                                            |
| Baza danych        | PostgreSQL (Neon)               | **17**                              | serverless, scale to zero, branching dla testów                                                                                                                     |
| Auth               | **NextAuth (Auth.js) v5**       | 5.x (beta, pinned)                  | Wybór edukacyjny — znany pattern z tutoriali. JWT sessions (stateless, edge-ready). 80+ OAuth providers OOTB pod fazę 3. Świadome trade-offy w sekcji 7.5 i ADR-001 |
| Walidacja          | Zod                             | **4.4.x**                           | 14× szybsze parsowanie niż v3, 57% mniejszy core, `z.config({ customError })` API, `z.discriminatedUnion`                                                           |
| Formularze         | React Hook Form                 | **7.x**                             | `useController`, `onTouched`, integracja Zod przez resolver (`@hookform/resolvers/zod`)                                                                             |
| UI primitives      | shadcn/ui + Radix               | latest                              | nieinstalowane jako lib — kopiowane, modyfikowalne                                                                                                                  |
| Styling            | Tailwind CSS                    | **4.x**                             | utility-first, CSS-first config, dobra DX                                                                                                                           |
| Płatności (faza 2) | Stripe                          | latest                              | de facto standard                                                                                                                                                   |

> **Notatka o wersjach**: powyższe to **wersje docelowe na dzień startu projektu (maj 2026)**. Jak zwykle przy każdym `npm install` warto sprawdzić aktualny stan — `npm view <pkg> version` lub strona projektu. Wersje będą się starzeć; zasada: trzymamy się dwóch ostatnich major-ów aktywnie wspieranych.

### 2.2. Wsparcie

| Cel                 | Pakiet                                                                        | Decyzja                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Daty                | **`date-fns`** v4                                                             | Tree-shakable, immutable, lepsze typy niż dayjs                                                                                                                 |
| Seedy               | **`@faker-js/faker`** v9                                                      | Standard, locale `pl` dostępne                                                                                                                                  |
| Obrazki             | **`next/image` + UploadThing** _(faza 1: lokalne pliki w `public/products/`)_ | UploadThing tylko gdy realnie potrzebujemy uploadu w admin. Faza 1: lokalne pliki commitowane do repo, ścieżki w seed.                                          |
| HTTP w testach      | **MSW** v2                                                                    | Mock Service Worker — używałem już w TanStack Query learning. Tu używamy do mockowania zewnętrznych API (Resend, w fazie 2 Stripe) w testach integration i e2e. |
| Toast               | **sonner** (shadcn)                                                           | Lightweight, dobre API                                                                                                                                          |
| Email transactional | **Resend**                                                                    | Faza 1 (reset hasła), free tier 3000/mies. wystarczy                                                                                                            |
| Env validation      | **`@t3-oss/env-nextjs`** + Zod                                                | Walidacja zmiennych środowiskowych na starcie aplikacji                                                                                                         |

### 2.3. Testowanie

| Warstwa                           | Narzędzie                                                       |
| --------------------------------- | --------------------------------------------------------------- |
| Unit                              | Vitest 3.x                                                      |
| Component                         | Vitest + Testing Library                                        |
| Integration (Server Actions + DB) | Vitest + Prisma + testowa DB (Neon branch lub lokalny Postgres) |
| E2E                               | Playwright 1.x                                                  |
| HTTP mocking (testy)              | MSW v2                                                          |

### 2.4. Tooling

| Cel              | Narzędzie                                            |
| ---------------- | ---------------------------------------------------- |
| Linter           | ESLint 9 (flat config) + `@typescript-eslint`        |
| Format           | Prettier + `prettier-plugin-tailwindcss`             |
| Hooks Git        | Husky + lint-staged                                  |
| Commit msg       | husky `commit-msg` (regex `#NN [opis]` — patrz 13.1) |
| Bundler analyzer | `@next/bundle-analyzer` (na żądanie)                 |

---

## 3. Architektura warstwowa

### 3.1. Schemat

```
┌────────────────────────────────────────────────────────────────┐
│  PRESENTATION (React 19, RSC + Client Components)              │
│  - Server Components (default)                                 │
│  - Client Components ("use client") — tylko gdy potrzebne      │
│  - Komponenty RHF (RHFTextField, RHFSelect...) wokół shadcn    │
└──────────────┬───────────────────────────┬─────────────────────┘
               │ READ                      │ WRITE
               │ (RSC, async)              │ (form submit, mutation)
               ▼                           ▼
┌──────────────────────────┐  ┌────────────────────────────────┐
│  Bezpośrednio z RSC      │  │  SERVER ACTIONS ('use server') │
│  await service.findMany()│  │  Cienka warstwa orchestracji:  │
│  - cache Next.js natywny │  │  1. Auth check                 │
│  - prefetch, semantyka   │  │  2. Walidacja Zod              │
│    GET                   │  │  3. Wywołanie Service          │
│  - throw na error        │  │  4. Mapowanie błędu            │
│    → error.tsx           │  │  5. revalidatePath/Tag         │
│                          │  │  6. Zwrot ActionResult<T>      │
└──────────────┬───────────┘  └─────────────┬──────────────────┘
               │                            │
               └────────────┬───────────────┘
                            ▼
┌────────────────────────────────────────────────────────────────┐
│  SERVICE  (logika biznesowa, czyste TS, bez Prisma/Next.js)    │
│  - orchestracja wielu repository                                │
│  - reguły domenowe (np. "nie można zamówić więcej niż stan")   │
│  - throw AppError z business kodami                            │
│  - łatwo testowalna jednostkowo (mock repository)              │
└─────────────────────────┬──────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────┐
│  REPOSITORY (czysty dostęp do Prismy, CRUD per encja)          │
│  - productRepository.findById(id)                              │
│  - orderRepository.createWithItems(data, tx)                   │
│  - obsługuje transakcje (przyjmuje tx?: PrismaClient)          │
└─────────────────────────┬──────────────────────────────────────┘
                          │
                          ▼
                       Prisma 7 → PostgreSQL 17
```

Kluczowa obserwacja: **service jest wspólnym wejściem** dla obu ścieżek. Niezależnie czy wywołuje go RSC (read) czy Server Action (write), logika biznesowa żyje w tym samym miejscu. Tylko obudowa różni się — `ActionResult<T>` dla mutacji, `throw` dla reads.

### 3.2. Anatomia Server Action (wzorzec mutacji)

Każda Server Action ma identyczną strukturę. To jest **kontrakt** — łatwiej refactorować, łatwiej testować, łatwiej generować boilerplate.

```typescript
// src/features/products/actions/create-product.action.ts
"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth/require-role"
import { createProductSchema } from "@/features/products/schemas"
import { productService } from "@/features/products/services/product.service"
import { toActionResult, type ActionResult } from "@/lib/actions/action-result"
import type { Product } from "@/features/products/types"

export async function createProductAction(input: unknown): Promise<ActionResult<Product>> {
  return toActionResult(async () => {
    // 1. Auth
    await requireRole(["ADMIN"])

    // 2. Walidacja (rzuca ZodError jeśli źle)
    const data = createProductSchema.parse(input)

    // 3. Service (logika biznesowa, może rzucić AppError)
    const product = await productService.create(data)

    // 4. Invalidate cache
    revalidatePath("/admin/products")
    revalidatePath("/shop")

    return product
  })
}
```

**`toActionResult` jest helperem** — łapie wszystkie błędy (`ZodError`, `AppError`, nieoczekiwane) i mapuje na jednolity `ActionResult<T>` (szczegóły w sekcji 6).

### 3.3. Anatomia read przez RSC (wzorzec)

Reads idą bezpośrednio z Server Component do service'u. Bez `'use server'`, bez `ActionResult<T>`, bez `revalidatePath`. Just async/await.

```typescript
// src/app/(shop)/shop/page.tsx
import { productService } from '@/features/products/services/product.service';
import { listProductsSchema } from '@/features/products/schemas';
import { ProductGrid } from '@/features/products/components/product-grid';

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // 1. Parse search params (Zod — to nie jest klasyczna walidacja formularza,
  //    ale chcemy strukturę type-safe)
  const params = await searchParams;
  const filters = listProductsSchema.parse({
    category: params.category,
    brand: params.brand,
    page: params.page ? Number(params.page) : 1,
    sort: params.sort ?? 'newest',
  });

  // 2. Service bezpośrednio — jeśli rzuci, trafiamy do error.tsx
  const { items, total } = await productService.findMany(filters);

  return <ProductGrid items={items} total={total} filters={filters} />;
}
```

**Obsługa błędów dla reads — bez try/catch w RSC**:

Konwencja: service rzuca lub wywołuje `notFound()` w odpowiednich momentach. RSC są chude — wywołują service, dostają wynik, renderują. Żadnego try/catch, żadnego mapowania błędów na poziomie page'ów. Wszystko obsługuje Next.js przez segment-level error boundaries (`error.tsx`, `not-found.tsx`).

**Wzorzec `notFound()` w service** — service zna kontekst "czy rekord jest wymagany" i sam wywołuje `notFound()` z `next/navigation` gdy go brakuje. Next.js łapie ten specjalny error i renderuje `not-found.tsx` automatycznie:

```typescript
// features/products/services/product.service.ts
import { notFound } from "next/navigation"

export const productService = {
  // Variant "musi istnieć" — używamy w PDP i innych "obowiązkowych" miejscach
  async getBySlug(slug: string): Promise<Product> {
    const product = await productRepository.findBySlug(slug)
    if (!product || !product.isActive) {
      notFound() // ← Next.js łapie i renderuje not-found.tsx
    }
    return product
  },

  // Reszta operacji — bez fallbacku, rzucają normalne errory na DB outage itp.
  async findMany(filters: ListProductsFilters): Promise<{ items: Product[]; total: number }> {
    return productRepository.findMany(filters)
  },
}
```

RSC są wtedy minimalne:

```typescript
// src/app/(shop)/shop/[slug]/page.tsx
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await productService.getBySlug(slug); // ← rzuca notFound() jeśli trzeba
  return <ProductDetail product={product} />;
}
```

**Co dzieje się gdy coś idzie nie tak**:

| Sytuacja                                | Kto obsługuje                | Co user widzi                                                |
| --------------------------------------- | ---------------------------- | ------------------------------------------------------------ |
| Produkt nie istnieje / nieaktywny       | `notFound()` w service       | `not-found.tsx` (segment-level lub globalny)                 |
| DB outage, timeout, nieoczekiwany błąd  | `throw` propaguje do Next.js | `error.tsx` (segment-level lub globalny) z przyciskiem Retry |
| `ZodError` na parse'owaniu searchParams | `throw` propaguje            | `error.tsx` (rzadko — to znaczy że ktoś manipulował URL)     |

**Konwencja nazewnicza service'ów** (zasada YAGNI — dodajemy tylko te warianty których potrzebujemy):

- `get*` — domyślny wariant, rzuca/wywołuje `notFound()` gdy brak. Większość use cases.
- `tryFind*` — zwraca `T | null`, dla miejsc gdzie brak rekordu to **prawidłowy stan UI** (np. "recommended products" — jeśli któryś nie istnieje, skip, nie 404).

Przykład gdy `tryFind*` ma sens — komponent rekomendacji:

```typescript
// features/products/components/recommendation-card.tsx (Server Component)
async function RecommendationCard({ slug }: { slug: string }) {
  const product = await productService.tryFindBySlug(slug);
  if (!product) return null; // skip, nie 404 dla całej strony
  return <Card>{product.name}</Card>;
}
```

W fazie 1 implementujemy wyłącznie `get*` per encja. `tryFind*` dodajemy **dopiero gdy konkretny ekran tego potrzebuje** — zasada z sekcji 1.1 ("Add things when needed").

**Dlaczego ten wzorzec, a nie try/catch w RSC**:

- Page components są **minimalne** — w typowym PDP nie ma żadnej logiki obsługi błędów, tylko fetch + render
- Error handling jest **scentralizowany** w service (jedna konwencja), nie rozsmarowany po `app/`
- Działa w 100% zgodnie z dokumentacją Next.js — `notFound()` jest udokumentowanym helperem, można go wywoływać w service'ach, route handlerach, page'ach
- Zero ceremonii dla 95% przypadków, jasna konwencja dla pozostałych 5%

**Trade-off który akceptujemy**: service ma "magiczny" side-effect — wywołanie `notFound()` rzuca specjalny `NEXT_NOT_FOUND` error który Next.js przechwytuje. Ktoś nieznajomy może być zaskoczony. Mitygacja: konwencja `get*` w nazwie sygnalizuje "ta operacja może spowodować 404", plus dokumentacja w JSDoc service'u.

**Testowanie service'u który wywołuje `notFound()`**: w Vitest mockujemy `next/navigation`:

```typescript
import { vi } from "vitest"
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND")
  }),
}))

it("throws NEXT_NOT_FOUND when product does not exist", async () => {
  await expect(productService.getBySlug("nonexistent")).rejects.toThrow("NEXT_NOT_FOUND")
})
```

### 3.4. Wyjątek: filtrowanie w listach admina

Listy admina (`/admin/products`, `/admin/orders`) używają TanStack Table z filtrami w URL search params. To nadal **RSC z bezpośrednim wywołaniem service'u** — search params zmieniają URL, Next.js re-renderuje page. Bez Server Action.

### 3.5. Route Handlers — kiedy?

- Webhooks (Stripe — faza 2, Resend webhook dla bounce/spam)
- Endpointy dla zewnętrznych integracji (faza 2+)
- Specjalne przypadki (np. streaming, SSE, file serving)
- Auth.js callbacks (`/api/auth/[...nextauth]/route.ts`)
- **Nie** dla normalnych mutacji ani reads z UI — od tego są Server Actions i RSC.

---

## 4. Struktura katalogów

### 4.1. Top-level

```
deskgear/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   └── products/          # lokalne obrazki produktów (commitowane do repo)
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (shop)/             # route group: publiczny sklep
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx        # homepage
│   │   │   ├── shop/
│   │   │   │   ├── page.tsx    # PLP (Product Listing Page)
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx # PDP (Product Detail Page)
│   │   │   ├── cart/page.tsx
│   │   │   └── checkout/...    # checkout flow
│   │   ├── (auth)/             # route group: login/register
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   ├── account/            # protected: konto klienta
│   │   │   ├── page.tsx
│   │   │   └── orders/...
│   │   ├── admin/              # protected przez middleware
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx        # dashboard
│   │   │   ├── products/...
│   │   │   └── orders/...
│   │   ├── api/                # Route Handlers (auth callbacks, webhooks)
│   │   │   └── auth/[...nextauth]/route.ts   # Auth.js v5
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   ├── features/               # ⭐ rdzeń aplikacji — patrz 4.2
│   │   ├── products/
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── auth/
│   │   └── admin/
│   ├── components/
│   │   ├── ui/                 # shadcn — NIE MODYFIKOWAĆ
│   │   ├── form/               # RHF wrappery (RHFTextField...)
│   │   ├── layout/             # Header, Footer, Sidebar
│   │   └── shared/             # ProductCard, PriceTag, ...
│   ├── lib/
│   │   ├── auth/               # Auth.js v5 config, requireRole, sesje
│   │   ├── actions/            # ActionResult, toActionResult, helpers
│   │   ├── errors/             # AppError, error codes, mapowanie
│   │   ├── validation/         # Zod error map, custom types
│   │   ├── db/                 # prisma client singleton
│   │   ├── cart/               # cart cookie helpers
│   │   ├── money/              # Money helpers (parsing, formatting)
│   │   └── utils/              # cn(), date helpers, ...
│   ├── i18n/
│   │   ├── pl/                 # patrz sekcja 11 — pliki per feature
│   │   ├── messages.ts         # collector wszystkich plików per feature
│   │   └── t.ts                # helper t(key, params)
│   ├── env.ts                  # zod-validated env
│   └── middleware.ts           # ochrona /admin, /account
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── factories/              # @faker-js/faker fixtures
│   └── mocks/                  # MSW handlers
├── .github/workflows/
├── docker-compose.yml          # lokalny postgres (opcja dla dev)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── ARCHITECTURE.md             # ten plik
```

### 4.2. Anatomia feature (`src/features/products/`)

Feature folder zamyka wszystko związane z jedną domeną w jednym miejscu. Łatwo dodać, łatwo usunąć, łatwo refactorować.

```
features/products/
├── schemas.ts              # Zod: createProductSchema, listProductsSchema, productSlugSchema...
├── types.ts                # Product, ProductVariant — re-export z Prisma + DTOs
├── actions/                # Server Actions ('use server') — TYLKO mutacje
│   ├── create-product.action.ts
│   ├── update-product.action.ts
│   └── delete-product.action.ts
├── services/               # Logika biznesowa (czyste TS) — wywoływana przez RSC (reads) ORAZ przez actions (writes)
│   └── product.service.ts  # findMany, getBySlug, tryFindBySlug, create, update, delete
├── repositories/           # Dostęp do Prismy
│   └── product.repository.ts
├── components/             # Komponenty specyficzne dla tego feature
│   ├── product-card.tsx
│   ├── product-gallery.tsx
│   ├── product-form.tsx    # form RHF dla admin
│   └── variant-picker.tsx
├── hooks/                  # use-client hooki specyficzne dla feature
│   └── use-variant-selection.ts
└── i18n/                   # tłumaczenia per feature (patrz sekcja 11)
    └── pl.json
```

**Zasada**: w `actions/` lądują tylko pliki `*.action.ts` z mutacjami (`'use server'`). Reads idą bezpośrednio z RSC do `services/`. Reads mają **opcjonalnie** swój własny moduł walidacji search params w `schemas.ts` (np. `listProductsSchema` — używany w `page.tsx` do parsowania URL, nie w SA).

**Zasada**: jeśli kawałek kodu jest używany tylko w `products` → tu zostaje. Jeśli zaczyna być potrzebny w 2+ miejscach → wędruje do `components/shared/` lub `lib/`.

---

## 5. Model domenowy (Prisma)

### 5.1. Encje fazy 1

Domena: **wielokategoryjny sklep z peryferiami i wyposażeniem stanowiska pracy**. Każda kategoria ma **własny zestaw atrybutów wariantu** (klawiatura: layout × switch × kolor; słuchawki: kolor × łączność; koszulki: rozmiar × kolor; kable: długość × kolor; monitory: przekątna × częstotliwość; fotele: kolor × wersja podłokietników).

### 5.2. Diagram ERD

```mermaid
erDiagram
    User ||--o{ Address : "has"
    User ||--o{ Order : "places"
    User ||--o| Cart : "owns"
    User ||--o{ Account : "has (OAuth, opcjonalne)"
    User ||--o{ PasswordResetToken : "requests"

    Category ||--o{ Product : "contains"
    Category ||--o{ Category : "parent-child"

    Product ||--o{ ProductImage : "has"
    Product ||--o{ ProductVariant : "has"

    ProductVariant ||--o{ CartItem : "in"
    ProductVariant ||--o{ OrderItem : "in"

    Cart ||--o{ CartItem : "contains"
    Order ||--o{ OrderItem : "contains"
    Order ||--o{ OrderStatusChange : "audit-log"

    User {
        string id PK
        string email UK
        string passwordHash
        string firstName
        string lastName
        enum role "CUSTOMER | ADMIN"
        datetime createdAt
    }

    Address {
        string id PK
        string userId FK
        string line1
        string line2
        string city
        string postalCode
        string country
    }

    Category {
        string id PK
        string slug UK
        string name
        string description
        string parentId FK "nullable"
    }

    Product {
        string id PK
        string slug UK
        string name
        text description
        string brand "nullable"
        string categoryId FK
        bool isActive
        bool isFeatured
        datetime createdAt
        datetime updatedAt
    }

    ProductImage {
        string id PK
        string productId FK
        string path "/products/keyboard-tkl-black-front.webp"
        string alt
        int position
        bool isPrimary
    }

    ProductVariant {
        string id PK
        string productId FK
        string sku UK
        jsonb attributes "discriminated union per category"
        decimal priceGross "Decimal(10,2)"
        int stockQuantity ">= 0 (CHECK)"
    }

    Cart {
        string id PK
        string userId FK "unique, nullable for guest"
        string guestToken UK "nullable"
        datetime expiresAt
        datetime updatedAt
    }

    CartItem {
        string id PK
        string cartId FK
        string variantId FK
        int quantity "> 0 (CHECK)"
    }

    Order {
        string id PK
        string orderNumber UK "DG-2026-0142"
        string userId FK "nullable for guest"
        string email
        enum status "PENDING | PAID | PROCESSING | SHIPPED | DELIVERED | CANCELLED"
        decimal subtotal
        decimal shipping
        decimal total
        string currency "default PLN"
        string shippingMethod
        jsonb shippingAddress
        jsonb billingAddress "nullable"
        bool invoiceRequired
        string vatId "nullable"
        datetime createdAt
        datetime updatedAt
    }

    OrderItem {
        string id PK
        string orderId FK
        string variantId FK
        int quantity "> 0 (CHECK)"
        decimal unitPrice "snapshot"
        string productNameSnapshot
        jsonb variantAttributesSnapshot
    }

    OrderStatusChange {
        string id PK
        string orderId FK
        enum fromStatus
        enum toStatus
        string reason "nullable"
        string changedById FK "nullable"
        datetime changedAt
    }

    Account {
        string id PK
        string userId FK
        string provider "google | github | ... (faza 3)"
        string providerAccountId
        string access_token "nullable"
        string refresh_token "nullable"
        datetime expires_at "nullable"
    }

    VerificationToken {
        string identifier "email"
        string token UK
        datetime expires
    }

    PasswordResetToken {
        string id PK
        string userId FK
        string tokenHash UK
        datetime expiresAt
        datetime usedAt "nullable"
    }
```

### 5.3. Kluczowe decyzje schematu

| Decyzja                                                       | Uzasadnienie                                                                                                                                                                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Decimal dla cen** — `priceGross Decimal @db.Decimal(10, 2)` | Precyzja arytmetyki bez floating point. Zakres 0.01–99999999.99 PLN — w nadmiarze. Patrz sekcja 5.6 (Decimal w DB, string w API).                                                                                      |
| **`attributes` jako JSONB** (nie JSON)                        | Postgres ma dwa typy: `json` (tekst bez parsowania) i `jsonb` (binarny, indexowalny, deduplikowany). Używamy JSONB bo: szybsze odczyty, możliwość GIN index, mniejsze rozmiary. W Prisma: `attributes Json @db.JsonB`. |
| **OrderItem przechowuje snapshot**                            | `unitPrice`, `productNameSnapshot`, `variantAttributesSnapshot` (JSONB) — historia zamówień musi być immutable nawet po zmianie ceny/nazwy/atrybutów.                                                                  |
| **Stock per variant**, nie per product                        | Bo "TKL Brown czarny" ma inny stan niż "TKL Red biały".                                                                                                                                                                |
| **CHECK constraints w DB**                                    | Patrz sekcja 5.4 — `stockQuantity >= 0`, `quantity > 0`, `priceGross > 0`. Aplikacja waliduje to w Zod, ale DB jest **ostatnią linią obrony**.                                                                         |
| **Soft delete tylko gdy potrzebny**                           | W fazie 1 hard delete + cascade. Dodamy `deletedAt` gdy biznes będzie wymagał audit log.                                                                                                                               |
| **Enum statusów w bazie**: `OrderStatus`, `UserRole`          | Prisma generuje typy TS automatycznie + Postgres enforce'uje na poziomie DB.                                                                                                                                           |

### 5.4. Constraints i walidacja na poziomie bazy

**Zasada**: aplikacja waliduje (Zod), DB jest **safety net**. Jeśli aplikacja ma bug i prześle bzdurną wartość, baza powinna ją odrzucić.

```prisma
model ProductVariant {
  id              String   @id @default(cuid())
  productId       String
  sku             String   @unique
  attributes      Json     @db.JsonB
  priceGross      Decimal  @db.Decimal(10, 2)
  stockQuantity   Int      @default(0)
  product         Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
}
```

Po `prisma migrate` dodajemy **raw SQL migration** z constraintami (Prisma nie wspiera CHECK constraints natywnie w schemacie — trzeba dopisać do migracji):

```sql
-- prisma/migrations/XXXXXXXX_add_check_constraints/migration.sql
ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "ProductVariant_stockQuantity_nonneg"
  CHECK ("stockQuantity" >= 0);

ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "ProductVariant_priceGross_positive"
  CHECK ("priceGross" > 0);

ALTER TABLE "CartItem"
  ADD CONSTRAINT "CartItem_quantity_positive"
  CHECK ("quantity" > 0);

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_quantity_positive"
  CHECK ("quantity" > 0);

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_unitPrice_positive"
  CHECK ("unitPrice" > 0);

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_total_nonneg"
  CHECK ("total" >= 0);

-- Email format (lekka walidacja, regex Postgres)
ALTER TABLE "User"
  ADD CONSTRAINT "User_email_format"
  CHECK ("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
```

**Indeksy** (w `schema.prisma`):

```prisma
model Product {
  // ...
  @@index([categoryId, isActive])
  @@index([brand])
  @@index([isFeatured, isActive])
}

model Order {
  // ...
  @@index([userId, status])
  @@index([status, createdAt])
}

model ProductVariant {
  // ...
  @@index([productId])
  // W fazie 2: GIN index na attributes jeśli profilowanie pokaże potrzebę:
  // CREATE INDEX "ProductVariant_attributes_gin" ON "ProductVariant" USING GIN ("attributes");
}

model Cart {
  // ...
  @@index([guestToken])
  @@index([expiresAt])  // dla cron czyszczącego guest carts
}
```

### 5.5. Szkic kluczowych modeli (referencja)

```prisma
enum UserRole {
  CUSTOMER
  ADMIN
}

enum OrderStatus {
  PENDING          // utworzone, czeka na płatność
  PAID             // faza 1: ustawiane od razu po submit (fake)
  PROCESSING       // pakowanie / przygotowanie do wysyłki
  SHIPPED
  DELIVERED
  CANCELLED
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  firstName     String
  lastName      String
  role          UserRole @default(CUSTOMER)
  createdAt     DateTime @default(now())
  addresses     Address[]
  orders        Order[]
  cart          Cart?
  accounts      Account[]              // OAuth (faza 3)
  resetTokens   PasswordResetToken[]
}

// Auth.js v5 wymaga tych dwóch modeli (Prisma adapter contract)
// W fazie 1 z Credentials provider obie tabele mogą być puste — ale schema musi je mieć.
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String                  // "oauth" | "credentials" | "email"
  provider          String                  // "google" | "github" | "credentials"
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model VerificationToken {
  identifier String                         // email
  token      String  @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Category {
  id           String     @id @default(cuid())
  slug         String     @unique
  name         String
  description  String?    @db.Text
  parentId     String?
  parent       Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children     Category[] @relation("CategoryHierarchy")
  products     Product[]

  @@index([parentId])
}

model Product {
  id           String   @id @default(cuid())
  slug         String   @unique
  name         String
  description  String   @db.Text
  brand        String?
  categoryId   String
  isActive     Boolean  @default(true)
  isFeatured   Boolean  @default(false)
  category     Category @relation(fields: [categoryId], references: [id])
  images       ProductImage[]
  variants     ProductVariant[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([categoryId, isActive])
  @@index([brand])
}

model ProductVariant {
  id              String   @id @default(cuid())
  productId       String
  sku             String   @unique
  attributes      Json     @db.JsonB     // dyskryminowane per kategoria — patrz 6.1
  priceGross      Decimal  @db.Decimal(10, 2)
  stockQuantity   Int      @default(0)
  product         Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
}

model Order {
  id              String      @id @default(cuid())
  orderNumber     String      @unique   // "DG-2026-0142"
  userId          String?
  email           String
  status          OrderStatus @default(PENDING)
  subtotal        Decimal     @db.Decimal(10, 2)
  shipping        Decimal     @db.Decimal(10, 2)
  total           Decimal     @db.Decimal(10, 2)
  currency        String      @default("PLN")
  shippingMethod  String
  shippingAddress Json        @db.JsonB
  billingAddress  Json?       @db.JsonB
  invoiceRequired Boolean     @default(false)
  vatId           String?
  user            User?       @relation(fields: [userId], references: [id])
  items           OrderItem[]
  statusChanges   OrderStatusChange[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([userId, status])
  @@index([status, createdAt])
}
```

### 5.6. Money — Decimal w DB, string w API

**Decyzja**: wszystkie ceny są `Decimal(10, 2)` w bazie i **string** (`"249.00"`) w API/Server Actions/Zod schemach. Frontend wyświetla przez formatter. Nie konwertujemy na `number` poza warstwą prezentacji.

**Dlaczego nie number na froncie**:

- `Number("249.00")` → `249` (gubimy zerowe grosze przy serializacji)
- Floating point: `0.1 + 0.2 !== 0.3`
- Łatwo o pomyłkę przy sumowaniu w koszyku

**Konwencja typu**:

```typescript
// src/lib/money/types.ts
export type Money = string & { readonly __brand: "Money" }

export function toMoney(value: string | number | Prisma.Decimal): Money {
  if (typeof value === "string") return value as Money
  if (typeof value === "number") return value.toFixed(2) as Money
  return value.toFixed(2) as Money // Prisma.Decimal
}
```

**Zod schema**:

```typescript
// src/lib/money/schema.ts
import * as z from "zod"

export const moneySchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, { error: "invalid_money_format" })
  .transform((v) => Number(v).toFixed(2))
  .refine((v) => Number(v) >= 0, { error: "too_small" })

export type MoneyInput = z.infer<typeof moneySchema>
```

**Serializacja Server Action → klient**:

Prisma `Decimal` nie jest serializowalny przez SA boundary. Mapujemy w repository:

```typescript
function toProductVariantDto(variant: PrismaProductVariant): ProductVariantDto {
  return {
    ...variant,
    priceGross: variant.priceGross.toFixed(2), // Decimal → "249.00"
  }
}
```

**Formatter na froncie**:

```typescript
// src/lib/money/format.ts
export function formatMoney(value: Money, locale = "pl-PL", currency = "PLN"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(value))
}
// formatMoney("249.00") → "249,00 zł"
```

**Reguła**: arytmetyka tylko w services na `Prisma.Decimal`. Frontend dostaje gotowe wartości.

### 5.7. Seed (`prisma/seed.ts`)

```typescript
// pseudokod
async function main() {
  // 1. Categories (idempotentnie — upsert by slug)
  //    Slugi po angielsku (patrz ADR-014):
  //      Parent → child:
  //      peripherals → keyboards, mice, headphones, microphones
  //      displays → monitors
  //      storage → drives, cables, accessories
  //      workspace → chairs, desk-accessories
  //      apparel → t-shirts
  // 2. Admin user (email z .env, hasło z .env)
  // 3. Sample customer + adres
  // 4. 40-60 produktów z 2-6 wariantami każdy
  //    - obrazki: ścieżki do plików w `public/products/`
  //    - ceny: realistyczne dla kategorii
  //      kable 25-150 zł, klawiatury 250-1500 zł, monitory 1000-5000 zł
  //      fotele 800-3500 zł, koszulki 89-129 zł, słuchawki 200-1500 zł
  // 5. 5-10 testowych zamówień w różnych statusach
}
```

Seed musi być **idempotentny** — `upsert` zamiast `create` wszędzie. Re-runowalny bez `prisma migrate reset`.

---

## 6. Walidacja i obsługa błędów

To jest **najbardziej krytyczna sekcja** dla utrzymania spójności w całym projekcie. Strategia: **Zod jako single source of truth** dla błędów walidacyjnych, **AppError** dla business errors, **trójwarstwowa kaskada nadpisywania komunikatów** (sekcja 6.7).

### 6.1. Schematy Zod — wspólne dla form i backend

Każdy feature ma `schemas.ts` z definicjami używanymi **identycznie** w trzech miejscach:

1. **RHF resolver** na froncie (`zodResolver(createProductSchema)`)
2. **Server Action** (`schema.parse(input)`)
3. **Testy integracyjne** (generowanie fixtures)

Ponieważ różne kategorie mają różne atrybuty wariantu, używamy **`z.discriminatedUnion`** po `categoryType` żeby walidacja była ścisła per-kategoria:

```typescript
// features/products/schemas.ts
import * as z from "zod"
import { moneySchema } from "@/lib/money/schema"

// Per-category variant attribute schemas
const keyboardAttrs = z.object({
  categoryType: z.literal("keyboard"),
  layout: z.enum(["60", "65", "75", "TKL", "Full"]),
  switch: z.enum(["Brown", "Blue", "Red", "Silent"]),
  color: z.string().min(1),
})

const cableAttrs = z.object({
  categoryType: z.literal("cable"),
  length: z.enum(["0.5m", "1m", "1.5m", "2m", "3m", "5m"]),
  color: z.string().min(1),
  standard: z.string().min(1),
})

const apparelAttrs = z.object({
  categoryType: z.literal("apparel"),
  size: z.enum(["XS", "S", "M", "L", "XL", "XXL"]),
  color: z.string().min(1),
})

const monitorAttrs = z.object({
  categoryType: z.literal("monitor"),
  diagonal: z.string().regex(/^\d+(\.\d+)?$/),
  refreshRate: z.enum(["60Hz", "75Hz", "144Hz", "165Hz", "240Hz"]),
  panel: z.enum(["IPS", "VA", "TN", "OLED"]),
})

const chairAttrs = z.object({
  categoryType: z.literal("chair"),
  color: z.string().min(1),
  armrests: z.enum(["fixed", "2D", "3D", "4D"]),
})

const variantAttributesSchema = z.discriminatedUnion("categoryType", [
  keyboardAttrs,
  cableAttrs,
  apparelAttrs,
  monitorAttrs,
  chairAttrs,
  // dorzucamy kolejne wraz z dodawaniem kategorii
])

export const createProductSchema = z.object({
  name: z.string().min(3).max(120),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().min(20).max(5000),
  brand: z.string().max(60).optional(),
  categoryId: z.string().cuid(),
  variants: z
    .array(
      z.object({
        sku: z.string().min(3),
        attributes: variantAttributesSchema,
        priceGross: moneySchema,
        stockQuantity: z.number().int().nonnegative(),
      }),
    )
    .min(1),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
```

### 6.2. Globalny Zod error map

Tu kryje się **kluczowa sztuczka** — komunikaty Zod nie wracają jako gotowe stringi, tylko jako **kody i parametry**. Frontend tłumaczy je przez i18n.

Zod 4 wprowadził nowe API `z.config({ customError })`:

```typescript
// lib/validation/zod-error-map.ts
import * as z from "zod"

z.config({
  customError: (issue) => {
    return {
      message: JSON.stringify({
        code: issue.code, // "too_small", "invalid_type", ...
        params: extractParams(issue),
      }),
    }
  },
})

function extractParams(issue: z.core.$ZodIssue): Record<string, unknown> {
  switch (issue.code) {
    case "too_small":
      return { minimum: issue.minimum, inclusive: issue.inclusive }
    case "too_big":
      return { maximum: issue.maximum, inclusive: issue.inclusive }
    case "invalid_type":
      return { expected: issue.expected, received: issue.received }
    case "invalid_format":
      return { format: issue.format }
    default:
      return {}
  }
}
```

**Plik tłumaczeń** (`src/i18n/pl/common/errors.json`):

```json
{
  "too_small.string": "Wymagane co najmniej {minimum} znaków",
  "too_small.number": "Wartość musi być co najmniej {minimum}",
  "too_big.string": "Maksymalnie {maximum} znaków",
  "invalid_type.string": "To pole jest wymagane",
  "invalid_format.email": "Nieprawidłowy adres e-mail",
  "validation.failed": "Sprawdź poprawność wprowadzonych danych"
}
```

### 6.3. AppError dla business errors

Zod świetnie sprawdza się dla błędów typu "format pola", ale nie pasuje do błędów biznesowych typu "ten email jest już zajęty", "produkt wyprzedany", "kupon wygasł".

```typescript
// lib/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    public readonly params: Record<string, unknown> = {},
    public readonly field?: string,
  ) {
    super(code)
    this.name = "AppError"
  }
}

export type AppErrorCode =
  | "EMAIL_ALREADY_EXISTS"
  | "INVALID_CREDENTIALS"
  | "INSUFFICIENT_STOCK"
  | "CART_EMPTY"
  | "ORDER_CANNOT_BE_CANCELLED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INTERNAL_ERROR"

// Uwaga: "rekord nie istnieje" NIE jest na tej liście.
// Dla tego przypadku service wywołuje notFound() z next/navigation (sekcja 3.3).
// AppError zarezerwowany dla błędów biznesowych (stock, auth, walidacja krzyżowa).

export const AppErrors = {
  emailExists: (email: string) => new AppError("EMAIL_ALREADY_EXISTS", { email }, "email"),
  insufficientStock: (available: number, requested: number) =>
    new AppError("INSUFFICIENT_STOCK", { available, requested }),
}
```

### 6.4. ActionResult — jednolita umowa zwrotna

```typescript
// lib/actions/action-result.ts
export type ActionResult<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: ApiErrorResponse }

export type ApiErrorResponse = {
  type: "validation" | "business" | "auth" | "server"
  message: string
  fieldErrors?: FieldError[]
  traceId?: string
}

export type FieldError = {
  code: string
  message: string
  params?: Record<string, unknown>
  path: (string | number)[]
}
```

| `type`       | Kiedy                                              | Frontend reaguje                                 |
| ------------ | -------------------------------------------------- | ------------------------------------------------ |
| `validation` | `ZodError` lub `AppError` z field-level            | `setError` w RHF + (opcjonalnie) toast `message` |
| `business`   | `AppError` bez field                               | toast `message`, formularz nie blokowany         |
| `auth`       | `UNAUTHORIZED`, `FORBIDDEN`, `INVALID_CREDENTIALS` | toast + ewentualny redirect na `/login`          |
| `server`     | nieoczekiwany błąd                                 | toast generyczny + `traceId` w UI dla supportu   |

### 6.5. `toActionResult` — opakowanie wszystkich błędów

```typescript
// lib/actions/to-action-result.ts
import * as z from "zod"

export async function toActionResult<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn()
    return { status: "success", data }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        status: "error",
        error: {
          type: "validation",
          message: "errors.validation.failed",
          fieldErrors: err.issues.map((issue) => ({
            code: issue.code,
            message: issue.message,
            params: extractParams(issue),
            path: issue.path,
          })),
        },
      }
    }
    if (err instanceof AppError) {
      const type: ApiErrorResponse["type"] =
        err.code === "UNAUTHORIZED" || err.code === "FORBIDDEN" ? "auth" : "business"
      return {
        status: "error",
        error: {
          type,
          message: `errors.${err.code}`,
          fieldErrors: err.field
            ? [{ code: err.code, message: err.message, params: err.params, path: [err.field] }]
            : undefined,
        },
      }
    }
    const traceId = crypto.randomUUID()
    console.error("[Server Action]", { traceId, err })
    return {
      status: "error",
      error: {
        type: "server",
        message: "errors.unexpected",
        traceId,
      },
    }
  }
}
```

### 6.6. Konsumpcja na froncie

```typescript
async function onSubmit(values: CreateProductInput) {
  const result = await createProductAction(values)

  if (result.status === "success") {
    toast.success(t("products.created"))
    router.push(`/admin/products/${result.data.id}`)
    return
  }

  const { type, message, fieldErrors, traceId } = result.error

  if (fieldErrors?.length) {
    for (const fe of fieldErrors) {
      form.setError(fe.path.join(".") as any, {
        type: fe.code,
        message: JSON.stringify({
          code: fe.code,
          params: fe.params,
          fallback: fe.message,
        }),
      })
    }
  }

  if (type !== "validation" || !fieldErrors?.length) {
    toast.error(t(message, result.error as any))
  }

  if (type === "server" && traceId) {
    console.error("Trace:", traceId)
  }
}
```

### 6.7. Trójwarstwowa kaskada nadpisywania komunikatów Zoda

To jest **rdzeń strategii i18n błędów**. Komunikaty można nadpisywać na trzech poziomach, w kolejności priorytetów:

```
┌──────────────────────────────────────────────────────────────────┐
│ POZIOM 1 (najwyższy priorytet)                                   │
│ Override per pole (komponent RHF)                                │
│ → konkretny formularz mówi "tu chcę inny komunikat"              │
└──────────────────────────────────────────────────────────────────┘
                              ↓ fallback
┌──────────────────────────────────────────────────────────────────┐
│ POZIOM 2                                                          │
│ Override per schemat Zod                                          │
│ → schemat definiuje własne komunikaty przez `error: () => ...`   │
└──────────────────────────────────────────────────────────────────┘
                              ↓ fallback
┌──────────────────────────────────────────────────────────────────┐
│ POZIOM 3 (najniższy priorytet, domyślny)                          │
│ Globalny `customError` map + i18n lookup                         │
│ → ten sam komunikat wszędzie (np. "Wymagane co najmniej X znaków")│
└──────────────────────────────────────────────────────────────────┘
```

**Cel**: domyślnie używamy globalnych tłumaczeń, ale gdy konkretne pole wymaga sformułowania pod kontekst — łatwo nadpisać.

**Klucze i18n są zawsze takie same niezależnie od poziomu** — to ułatwia w przyszłości dodanie EN: tłumacz wie, że klucz `errors.too_small.string` ma być przetłumaczony, niezależnie od tego, w którym formularzu się pokaże.

#### Poziom 3 — domyślny (globalny)

Globalny `customError` map (sekcja 6.2) → klucze `errors.${code}.${fieldType}` w `i18n/pl/common/errors.json`.

#### Poziom 2 — override per schemat Zod

Zod 4 pozwala definiować custom error w samej definicji schematu:

```typescript
const passwordSchema = z.string().min(8, {
  error: (issue) =>
    JSON.stringify({
      code: "password_too_short", // własny kod, własny klucz i18n
      params: { minimum: issue.minimum },
    }),
})
```

Klucz `errors.password_too_short` musi istnieć w pliku tłumaczeń (sekcja 11).

#### Poziom 1 — override per pole (komponent RHF)

Wrapper RHF przyjmuje opcjonalny `errorMessages` prop — mapę `code → message` (lub `code → (params) => string`):

```tsx
<RHFTextField
  name="password"
  label="Hasło"
  type="password"
  errorMessages={{
    too_small: (params) =>
      `Hasło musi mieć przynajmniej ${params.minimum} znaków dla bezpieczeństwa konta`,
    password_weak: "Słabe hasło — dodaj wielką literę i cyfrę",
  }}
/>
```

**Ważne**: przy dodawaniu EN-a override per pole pozostanie po polsku. Dlatego **preferujemy poziomy 2 i 3** (definicje w schemach / globalnie) nad poziom 1. Poziom 1 to "ostatnia deska ratunku" gdy formularz potrzebuje sformułowania nie pasującego nigdzie indziej.

#### Helper resolvujący

```typescript
// lib/validation/resolve-error-message.ts
type ResolvedError = { code: string; params?: Record<string, unknown>; fallback: string }

export function resolveErrorMessage(
  rhfErrorMessage: string,
  fieldType: "string" | "number" | "date",
  overrides?: Record<string, ErrorMessageOverride>,
): string {
  let parsed: ResolvedError
  try {
    parsed = JSON.parse(rhfErrorMessage)
  } catch {
    return rhfErrorMessage
  }

  const { code, params = {}, fallback } = parsed

  // POZIOM 1: Override z komponentu
  const override = overrides?.[code]
  if (override) {
    return typeof override === "function" ? override(params) : override
  }

  // POZIOM 2 + 3: i18n lookup
  // Jeśli schemat zdefiniował własny kod (np. `password_too_short`), znajdzie go tutaj.
  // Jeśli nie — używa globalnego `${code}.${fieldType}`.
  const specific = `errors.${code}.${fieldType}`
  const generic = `errors.${code}`

  const trySpecific = t(specific, params)
  if (trySpecific !== specific) return trySpecific

  const tryGeneric = t(generic, params)
  if (tryGeneric !== generic) return tryGeneric

  // Backend fallback
  if (fallback) return fallback
  return code
}
```

**Reguła**: zawsze najpierw rozważ poziom 3 (globalne) → potem 2 (per schemat) → dopiero potem 1 (per pole). To minimalizuje pracę przy dodawaniu EN.

---

## 7. Autentykacja i autoryzacja

### 7.1. Auth.js v5 + Credentials + JWT sessions

Wybieramy **NextAuth (Auth.js) v5** z **JWT sessions** — wybór świadomie edukacyjny, pełne uzasadnienie w ADR-001.

Ustawienia:

- **Provider**: tylko `Credentials` (email + password) w fazie 1. OAuth providers (Google/GitHub) — opcjonalnie w fazie 3.
- **Sesja**: **JWT** (`session: { strategy: 'jwt' }`) — stateless, edge-ready, brak tabeli `Session`.
- **TTL**: 7 dni rolling (każdy aktywny request przedłuża)
- **Hashing haseł**: bcrypt 12 rund (przez `bcryptjs` — Auth.js nie hashuje sam, robimy to w `authorize()` callback)
- **Wersja**: pinned do konkretnego `5.0.0-beta.X` w `package.json` (nie używamy `@latest`, bo to nadal beta)

**Co dostajemy w DB mimo JWT sessions**: tabela `User` (Prisma adapter), opcjonalnie `Account` (dla OAuth w fazie 3) i `VerificationToken` (przy email magic links — nie używamy w fazie 1). Tabela `Session` znika.

### 7.2. Struktura

```
src/lib/auth/
├── auth.config.ts       # edge-safe config (bez DB adaptera) — używany w proxy.ts
├── auth.ts              # pełna konfiguracja (auth.config + Prisma adapter + Credentials)
├── require-role.ts      # helper dla Server Actions
└── session.ts           # helper getSession() do RSC
```

**Dlaczego dwa pliki**: Auth.js v5 wymaga rozdzielenia konfiguracji edge-safe (`auth.config.ts`, używany w middleware/proxy działającym na edge) od pełnej konfiguracji (`auth.ts`, z DB adapter wymagającym Node.js runtime). To znana pułapka v5 — middleware działa na edge i nie może bezpośrednio użyć Prisma Client.

**`auth.config.ts`** (edge-safe, bez DB):

```typescript
// src/lib/auth/auth.config.ts
import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user
      const isAdminRoute = request.nextUrl.pathname.startsWith("/admin")
      const isAccountRoute = request.nextUrl.pathname.startsWith("/account")

      if (isAdminRoute || isAccountRoute) return isLoggedIn
      return true
    },
  },
  providers: [], // pusty w edge config — providers dopisane w auth.ts
} satisfies NextAuthConfig
```

**`auth.ts`** (Node.js runtime, z DB):

```typescript
// src/lib/auth/auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/db/prisma"
import { loginSchema } from "@/features/auth/schemas"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 }, // 7 dni
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        const ok = await compare(password, user.passwordHash)
        if (!ok) return null

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          name: `${user.firstName} ${user.lastName}`,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      if (token.role) session.user.role = token.role as UserRole
      return session
    },
  },
})
```

### 7.3. Middleware / Proxy

**UWAGA Next.js 16**: plik `middleware.ts` został przemianowany na `proxy.ts`. Auth.js v5 dokumentacja już to odzwierciedla.

```typescript
// src/proxy.ts (Next.js 16) lub src/middleware.ts (Next.js 15)
import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth/auth.config" // edge-safe!

export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
}
```

Middleware używa **tylko** `authConfig` (bez Prisma adaptera) — JWT walidacja jest kryptograficzna, nie potrzebuje DB. To główna zaleta JWT sessions — edge runtime works OOTB.

### 7.4. `requireRole` w Server Actions

```typescript
// lib/auth/require-role.ts
import { auth } from "@/lib/auth/auth"
import { AppError } from "@/lib/errors/app-error"
import type { UserRole } from "@prisma/client"

export async function requireRole(roles: UserRole[]) {
  const session = await auth() // v5 API — działa w RSC, SA, Route Handler
  if (!session?.user) throw new AppError("UNAUTHORIZED")
  if (!roles.includes(session.user.role)) throw new AppError("FORBIDDEN")
  return session
}
```

### 7.5. Świadome konsekwencje wyboru JWT sessions

Te trade-offy akceptujemy jako część decyzji edukacyjnej (ADR-001). Spisane wprost, żeby później nie były niespodzianką:

| Konsekwencja                                 | Co to znaczy w praktyce                                                                                                                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Brak immediate logout**                    | Sesja żyje do końca TTL (7 dni). Admin nie może "wylogować" konkretnego usera natychmiast. Workaround w fazie 2: rotacja `userId.tokenVersion` — przy zmianie wymusza re-login.                    |
| **Brak immediate role change**               | Promocja `CUSTOMER → ADMIN` nie wpłynie na zalogowaną sesję — user musi re-loginnąć lub czekać do TTL. W fazie 1 akceptujemy.                                                                      |
| **Brak "wyloguj ze wszystkich urządzeń"**    | Niemożliwe bez dodatkowej tabeli `JWTBlacklist` (która zabija benefit "stateless"). Świadomie nie implementujemy.                                                                                  |
| **Większe cookies**                          | JWT ~500 bajtów vs DB session ID ~30 bajtów. Niewielki narzut sieciowy.                                                                                                                            |
| **Zmiana danych usera (np. nazwisko)**       | Nie widoczna w session do następnego JWT refresh. Mitygacja: dla read-only display fetchujemy `User` z DB w RSC zamiast czytać z `session.user`.                                                   |
| **`session callback` ma znany problem w v5** | Nie jest wywoływany automatycznie przy każdym request — tylko po `update()` lub re-login. Dla naszego use case (rola w JWT) OK, ale jeśli kiedyś dodamy "live update" sesji, trzeba będzie patcha. |

**Co kompensuje JWT**:

- Edge middleware działa bez DB connection
- Brak tabeli `Session` do cleanupu
- Stateless = łatwiej skalować (chociaż w skali portfolio to bez znaczenia)
- Pattern znany z każdego tutoriala — niska bariera wejścia

### 7.6. Reset hasła — w fazie 1

Auth.js v5 nie zarządza reset hasła sam — implementujemy własny flow z tabelą `PasswordResetToken`.

```prisma
model PasswordResetToken {
  id         String   @id @default(cuid())
  userId     String
  tokenHash  String   @unique
  expiresAt  DateTime
  usedAt     DateTime?
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}
```

**Flow**:

1. `POST /forgot-password` → `requestPasswordResetAction({ email })` — zawsze success (nie ujawniamy istnienia konta)
2. Token (32 bytes random), **SHA-256 hash** w DB, link mailem (Resend), TTL 1h, single-use
3. `POST /reset-password` → `resetPasswordAction({ token, newPassword })`
4. Po sukcesie: opcjonalnie auto-signIn przez `signIn('credentials', ...)` (faza 2)

**Token security**:

- Raw token w URL i emailu, **SHA-256 hash** w DB (gdyby DB wyciekło, tokeny nieużywalne)
- Single-use (`usedAt` blokuje ponowne użycie)
- Stary token invalidowany przy nowym request

### 7.7. Cart merge przy logowaniu

Po udanym logowaniu chcemy zmergować guest cart (cookie `__dg_guest_cart`) z user cartem. Auth.js v5 oferuje **eventy** które są wywoływane po sukcesach autoryzacji — używamy `signIn` event:

```typescript
// src/lib/auth/auth.ts (fragment)
import { cookies } from "next/headers"
import { cartService } from "@/features/cart/services/cart.service"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // ... providers, callbacks
  events: {
    async signIn({ user }) {
      const cookieStore = await cookies()
      const guestToken = cookieStore.get("__dg_guest_cart")?.value
      if (guestToken && user.id) {
        await cartService.mergeGuestIntoUser(guestToken, user.id)
        cookieStore.delete("__dg_guest_cart")
      }
    },
  },
})
```

**Dlaczego `events.signIn`, a nie callback** — eventy są fire-and-forget (błędy w merge nie blokują logowania). Jeśli merge zawiedzie (DB hiccup), user nadal może się zalogować, a jego guest cart pozostaje (cookie expire'uje za 30 dni). W kolejnej akcji "add to cart" jako zalogowany — naprawi się przez idempotentny `addItem`.

---

## 8. Koszyk: strategia gość → zalogowany

### 8.1. Decyzja: cart **zawsze w bazie**

Powody:

- Jednolite warstwy (Action → Service → Repository → Prisma) bez wyjątku dla guesta
- Łatwa migracja na "saved carts" w przyszłości
- Merge przy logowaniu = banalny SQL

Koszt: trochę bazy danych dla gości, którzy nie konwertują. Worth it.

### 8.2. Schemat

```prisma
model Cart {
  id          String     @id @default(cuid())
  userId      String?    @unique
  guestToken  String?    @unique
  items       CartItem[]
  expiresAt   DateTime?
  updatedAt   DateTime   @updatedAt

  @@index([guestToken])
  @@index([expiresAt])
}

model CartItem {
  id         String         @id @default(cuid())
  cartId     String
  variantId  String
  quantity   Int
  cart       Cart           @relation(fields: [cartId], references: [id], onDelete: Cascade)
  variant    ProductVariant @relation(fields: [variantId], references: [id])

  @@unique([cartId, variantId])
}
```

CHECK constraint w SQL migration: `CartItem_quantity_positive` (sekcja 5.4).

### 8.3. Cookie

- Nazwa: `__dg_guest_cart`
- Wartość: opaque token (crypto.randomUUID)
- `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`
- TTL: 30 dni (rolling)
- Set lazy — przy pierwszej akcji "add to cart"

### 8.4. Flow

```
GUEST                                        LOGGED-IN
─────                                        ─────────
add to cart                                  add to cart
  ↓                                            ↓
no cookie? → generate guestToken             auth → userId
  ↓                                            ↓
INSERT Cart { guestToken }                   UPSERT Cart { userId }
  ↓                                            ↓
INSERT CartItem                              INSERT CartItem

LOGIN (z aktywnym guest cart):
  1. Find guestCart by cookie
  2. Find userCart by userId (create if missing)
  3. Merge items:
     - same variant → max(guest.qty, user.qty)
     - new variant → INSERT
  4. DELETE guestCart
  5. Clear cookie
```

### 8.5. Service-level

```typescript
// features/cart/services/cart.service.ts
export const cartService = {
  async addItem(input: AddCartItemInput, ctx: CartContext): Promise<Cart> {
    const cart = await this.resolveCart(ctx)
    await this.validateStock(input.variantId, input.quantity)
    return cartRepository.addItem(cart.id, input)
  },

  async resolveCart(ctx: CartContext): Promise<Cart> {
    if (ctx.userId) return cartRepository.findOrCreateByUserId(ctx.userId)
    if (ctx.guestToken) {
      const found = await cartRepository.findByGuestToken(ctx.guestToken)
      if (found) return found
    }
    return cartRepository.createGuestCart()
  },

  async mergeGuestIntoUser(guestToken: string, userId: string): Promise<void> {
    // transakcja
  },
}
```

### 8.6. Czyszczenie

Cron (faza 2, Vercel Cron) — usuwa cart guestów z `expiresAt < now()`.

---

## 9. Checkout i płatności (faza 1 vs faza 2)

### 9.1. Faza 1 — "Fake PAID"

Flow:

1. Stepper: Koszyk → Dane → Dostawa → Podsumowanie
2. **Jeden duży formularz RHF** z conditional render krokami (jeden submit, jedna walidacja)
3. Submit → Server Action `placeOrderAction`:
   - Walidacja całego payloadu (Zod)
   - Transakcja:
     - Stworzenie `Order` ze statusem `PAID` (fake)
     - Stworzenie `OrderItem[]` ze snapshotami cen, nazw i atrybutów wariantu
     - Dekrement `ProductVariant.stockQuantity` (z `SELECT FOR UPDATE`)
     - Zapis `OrderStatusChange { status: PAID, at: now }`
     - Wyczyszczenie cartu
   - Generacja `orderNumber`: `DG-YYYY-NNNN`
4. Redirect na `/checkout/{orderNumber}/thank-you`

### 9.2. Faza 2 — Stripe

- **Stripe Checkout Sessions** (redirect-based)
- Server Action `createCheckoutSession` → zwraca `url` → redirect
- Webhook `/api/webhooks/stripe`:
  - `checkout.session.completed` → status `PAID` + decrement stock
  - `payment_intent.payment_failed` → status `PENDING` / `CANCELLED`
- **Idempotency**: `stripeEventId` w osobnej tabeli
- **Order tworzony PRZED Stripe** ze statusem `PENDING` → webhook tylko przesuwa status

### 9.3. Stany zamówienia (state machine)

```
PENDING ──pay──► PAID ──admin──► PROCESSING ──ship──► SHIPPED ──deliver──► DELIVERED
   │              │                                                              │
   └──cancel──► CANCELLED ◄─cancel(admin)─┘                                       │
                                                                                  │
                                          DELIVERED jest stanem terminalnym ──────┘
```

Każda zmiana statusu = `OrderStatusChange` row (audit trail). Tylko przez `orderService.changeStatus(id, to, reason?)`.

---

## 10. Komponenty UI: warstwa shadcn + wrappery RHF

### 10.1. Zasada "shadcn jest nietykalny"

- `components/ui/` zawiera **niezmodyfikowane** komponenty z shadcn
- Aktualizacja shadcn = `npx shadcn add input --overwrite` bez konfliktów
- Wszystkie modyfikacje (label, error, hint, integration z RHF) idą do **wrapperów** w `components/form/`

### 10.2. Konwencja wrapperów

Każdy wrapper:

1. Przyjmuje `name` typowany do schematu (`Path<TFieldValues>`)
2. Używa `useController` (nie `<Controller>`)
3. Pobiera `formState.errors[name]` i przepuszcza przez `resolveErrorMessage` (sekcja 6.7)
4. Obsługuje stany: idle, focused, error, disabled
5. Forwarduje wszystkie props shadcn (extend, nie restrict)
6. Ma dedykowane unit + component testy

```typescript
// components/form/rhf-text-field.tsx
type ErrorMessageOverride = string | ((params: Record<string, unknown>) => string);

type RHFTextFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  hint?: string;
  required?: boolean;
  errorMessages?: Record<string, ErrorMessageOverride>;  // poziom 1 z 6.7
} & Omit<ComponentProps<typeof Input>, 'name'>;

export function RHFTextField<T extends FieldValues>({
  name, label, hint, required, errorMessages, ...inputProps
}: RHFTextFieldProps<T>) {
  const { control } = useFormContext<T>();
  const { field, fieldState } = useController({ control, name });
  const errorMsg = fieldState.error
    ? resolveErrorMessage(fieldState.error.message ?? '', 'string', errorMessages)
    : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={name}
        {...field}
        {...inputProps}
        aria-invalid={!!errorMsg}
        aria-describedby={errorMsg ? `${name}-error` : hint ? `${name}-hint` : undefined}
      />
      {hint && !errorMsg && (
        <p id={`${name}-hint`} className="text-sm text-muted-foreground">{hint}</p>
      )}
      {errorMsg && (
        <p id={`${name}-error`} className="text-sm text-destructive">{errorMsg}</p>
      )}
    </div>
  );
}
```

### 10.3. Kolejność dodawania wrapperów (driven by need)

| #   | Wrapper                                          | Pierwszy ekran               |
| --- | ------------------------------------------------ | ---------------------------- |
| 1   | `RHFTextField`                                   | Login, Register              |
| 2   | `RHFPasswordField`                               | Login, Register              |
| 3   | `RHFCheckbox`                                    | Register (terms), filtry PLP |
| 4   | `RHFTextarea`                                    | Admin product form           |
| 5   | `RHFSelect`                                      | Checkout, admin              |
| 6   | `RHFRadioGroup`                                  | Checkout (shipping)          |
| 7   | `RHFNumberInput`                                 | Admin (price, stock)         |
| 8   | `RHFFieldArray` (variants z discriminated union) | Admin product form           |
| 9   | `RHFComboboxAsync` _(faza 2)_                    | Admin search                 |
| 10  | `RHFDatePicker` _(faza 2)_                       | Admin orders filter          |

### 10.4. Komponenty strukturalne

| Komponent                    | Pierwsze użycie | Faza |
| ---------------------------- | --------------- | ---- |
| `PageHeader`                 | Admin pages     | 1    |
| `EmptyState`                 | Pusty koszyk    | 1    |
| `ConfirmationModal`          | Delete product  | 1    |
| `ActionDrawer`               | Admin edit      | 1    |
| `DataTable` (TanStack Table) | Admin lista     | 1    |
| `Stepper`                    | Checkout        | 2    |
| `Timeline`                   | Order status    | 2    |

---

## 11. Internacjonalizacja (i18n)

### 11.1. Faza 1 — minimal viable i18n z plikami per feature

**Nie używamy `next-intl`** w fazie 1. Powód: jedna wersja językowa, ale chcemy żeby **wszystkie stringi były w plikach JSON od dnia 1**, żeby przejście na 2 języki było bezbolesne.

**Zasada**: pliki tłumaczeń **per feature**, nie jedna wielka kolekcja. To powtórzenie struktury `src/features/`.

```
src/i18n/
├── pl/
│   └── common/                  # tłumaczenia cross-cutting
│       ├── errors.json          # globalne klucze błędów (Zod)
│       ├── nav.json             # menu, breadcrumbs
│       └── forms.json           # przyciski Submit/Cancel itp.
├── messages.ts                  # zbiera wszystko (patrz niżej)
└── t.ts                         # helper t(key, params)

src/features/products/i18n/
└── pl.json                      # tłumaczenia tylko dla products

src/features/cart/i18n/
└── pl.json

src/features/orders/i18n/
└── pl.json
```

**Dlaczego per feature**:

- Feature jest samowystarczalny — usunięcie folderu feature = usunięcie też jego tłumaczeń, zero leftoverów
- Łatwiej review w PR — widzisz wszystkie zmiany w jednym miejscu
- Mniej konfliktów w git — równolegli pracownicy nie edytują tego samego pliku
- Tłumaczenia można lazy-load w fazie 2 (next-intl) per route group

**Collector**:

```typescript
// src/i18n/messages.ts
import commonErrors from "./pl/common/errors.json" with { type: "json" }
import commonNav from "./pl/common/nav.json" with { type: "json" }
import commonForms from "./pl/common/forms.json" with { type: "json" }

import productsPl from "@/features/products/i18n/pl.json" with { type: "json" }
import cartPl from "@/features/cart/i18n/pl.json" with { type: "json" }
import ordersPl from "@/features/orders/i18n/pl.json" with { type: "json" }

export const messages = {
  pl: {
    errors: commonErrors,
    nav: commonNav,
    forms: commonForms,
    products: productsPl,
    cart: cartPl,
    orders: ordersPl,
  },
} as const

export type Locale = keyof typeof messages
export type MessageKey = string // np. "products.created", "errors.too_small.string"
```

**Helper**:

```typescript
// src/i18n/t.ts
import { messages } from "./messages"

const currentLocale = "pl" // faza 2: pobiera z cookie

export function t(key: string, params?: Record<string, unknown>): string {
  const parts = key.split(".")
  let result: any = messages[currentLocale]
  for (const part of parts) {
    result = result?.[part]
  }
  if (typeof result !== "string") return key

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(`{${k}}`, String(v))
    }
  }
  return result
}
```

**Przykład**:

```json
// src/features/products/i18n/pl.json
{
  "created": "Produkt został utworzony",
  "updated": "Zmiany zapisane",
  "deleted": "Produkt usunięty",
  "form": {
    "name": "Nazwa produktu",
    "description": "Opis",
    "category": "Kategoria",
    "brand": "Marka"
  },
  "filters": {
    "byCategory": "Kategoria",
    "byBrand": "Marka",
    "byPrice": "Cena"
  }
}
```

Użycie: `t('products.created')` → "Produkt został utworzony".

### 11.2. Faza 2 — next-intl

Gdy dodajemy angielski:

- `t()` → `useTranslations()` (jednorazowy refactor — klucze zostają)
- Cookie-based locale (`__dg_locale`, bez `[locale]` w URL — decyzja ze Setlist projektu)
- Middleware ustawia locale na podstawie cookie / Accept-Language
- Dla każdego pliku `pl.json` powstaje równoległy `en.json`

---

## 12. Strategia testów

### 12.1. Testing Trophy (Kent C. Dodds)

```
       e2e (Playwright)        ◄── 20% — krytyczne user journeys
     ─────────────────────
   Integration (Vitest+DB)     ◄── 60% — Server Actions, services
 ──────────────────────────
Unit (Vitest, pure functions)  ◄── 20% — helpery, formattery, error map
```

### 12.2. Co testujemy gdzie

**Unit (20%)** — `*.test.ts` obok pliku

- `formatMoney("249.00") → "249,00 zł"`
- `extractParams(zodIssue)` z error map
- `resolveErrorMessage` z trzech poziomów kaskady
- `canTransitionStatus(from, to)`

**Component** — `*.test.tsx` obok komponentu

- `RHFTextField`: renderuje error, formatuje parametry, aria-invalid
- `RHFTextField` z `errorMessages` override — sprawdza poziom 1 kaskady
- **Nie testujemy** komponentów shadcn (są przetestowane upstream)

**Integration (60%)** — `tests/integration/`

- Każda **Server Action** (mutacja) ma test:
  - happy path → DB state correct + `revalidatePath` wywołany
  - validation error → fieldErrors zwrócone z poprawnymi `code` i `params`
  - business error (np. `INSUFFICIENT_STOCK`) → AppError mapped
  - unauthorized → odpowiedni error
- Każdy **service** (read + write) ma test:
  - reads: scenariusze filtrowania, paginacji, edge cases (not found → `AppError`)
  - writes: te same scenariusze co SA, ale bez warstwy `ActionResult` (czysty rzut)
- Setup: dedykowana testowa baza (Neon branch lub lokalny Postgres)
- Test db: `migrate deploy` + truncate między testami
- **MSW**: mockujemy Resend (email reset hasła), Stripe webhook (faza 2)

**E2E (20%)** — `tests/e2e/`

- ⭐ Critical path 1: **Guest → add to cart → checkout → order placed**
- ⭐ Critical path 2: **Register → login → buy → see order in history**
- ⭐ Critical path 3: **Admin → create product → publish → visible on PLP**
- ⭐ Critical path 4: **Admin → process order (status changes)**

### 12.3. Dane testowe

- **Factory pattern**: `tests/factories/product.factory.ts`, `user.factory.ts` (z faker)
- **Nigdy** nie współdzielimy fixtures między testami
- Truncate tabel przed każdym integration testem

### 12.4. MSW — co konkretnie mockujemy

```
tests/mocks/
├── handlers/
│   ├── resend.ts         # POST https://api.resend.com/emails → 200
│   ├── stripe.ts         # faza 2 — checkout sessions, webhooks
│   └── index.ts
└── server.ts             # setupServer dla Node (Vitest)
```

Faza 1: tylko Resend. Faza 2: dochodzi Stripe.

### 12.5. Coverage

- Cel: **80%+ na warstwie services + actions**, 60% globalnie
- Nie gonimy 100% — `components/ui/` (shadcn) ani `app/` (cienkie page components)
- `vitest --coverage` w CI, raport jako artifact

---

## 13. CI/CD i jakość kodu

### 13.1. Git hooks (Husky) — szczegółowo

Husky pozwala uruchamiać skrypty git automatycznie przy operacjach git. Robimy to żeby **łapać błędy lokalnie zanim trafią do CI** — feedback w 5s zamiast w 5min.

Trzy hooki, w kolejności od najlżejszego do najcięższego:

#### 🪝 pre-commit — uruchamia się przy `git commit`, **przed** zapisaniem commita

**Cel**: nie wpuścić do repozytorium kodu który nie przejdzie podstawowego formatowania i lintingu. Działa **tylko na plikach zaznaczonych do commita** (`lint-staged`) — nie na całym repo. To kluczowe dla szybkości.

**Co robi**:

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["prettier --write", "eslint --fix --max-warnings=0"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
npx lint-staged
```

**Co dokładnie sprawdza i dlaczego**:

| Sprawdzenie                             | Dlaczego ważne                                                                                                                                                             | Co się dzieje przy błędzie                                                                                                      |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `prettier --write` na plikach TS/TSX/JS | Formatowanie automatyczne (spacje, średniki, długość linii). Eliminuje "stylistyczne" PR-y i diffy.                                                                        | Plik jest **automatycznie zmieniany** i dodawany ponownie do commita. Brak interakcji od dewelopera.                            |
| `eslint --fix --max-warnings=0`         | Łapie błędy semantyczne (`no-unused-vars`, `no-explicit-any`, hooks rules), wymusza konwencje. `--max-warnings=0` traktuje warning jak error — nie ma "zostawię na potem". | Próbuje naprawić automatycznie (np. usuwa nieużywane importy). Jeśli się nie da → commit jest **odrzucony**, dev musi naprawić. |
| `prettier --write` na JSON/MD/YML       | Spójność formatów konfigów, czytelność README.                                                                                                                             | Auto-fix.                                                                                                                       |

**Co celowo NIE robi pre-commit**:

- Nie odpala testów — zbyt wolne, frustrujące przy małych commitach.
- Nie robi typecheck (`tsc --noEmit`) — typecheck musi widzieć całe repo, nie tylko zmienione pliki. Idzie do pre-push.

**Target czasu**: < 5s nawet przy 50 zmienionych plikach (lint-staged uruchamia tylko na nich).

**Jak ominąć (świadomie)**: `git commit --no-verify` — przy WIP commitach, ale **nigdy** przed PR.

#### 🪝 pre-push — uruchamia się przy `git push`, **przed** wysłaniem na remote

**Cel**: nie pushować kodu, który zepsuje CI. CI bierze ~3-5 minut; pre-push w 30s daje znacznie szybszy feedback. Lepiej dowiedzieć się że TypeScript nie kompiluje teraz niż za 5 minut z mailem od CI.

**Co robi**:

```bash
# .husky/pre-push
npm run typecheck && npm run test:unit
```

| Sprawdzenie                             | Dlaczego ważne                                                                                                                                                           | Co się dzieje przy błędzie                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `tsc --noEmit`                          | Pełny TypeScript check całego projektu. ESLint w pre-commit nie wykrywa wszystkich błędów typów (np. niespójność między modułami). Sprawdza też cross-file dependencies. | Push **odrzucony**. Dev musi naprawić błędy typów. |
| `vitest run --reporter=dot` (unit only) | Tylko testy `*.test.ts` w `src/**` (unit + component). **Nie** odpalamy `tests/integration/` (wymagają DB) ani e2e (zbyt wolne).                                         | Push **odrzucony** jeśli któryś test failuje.      |

**Co celowo NIE robi pre-push**:

- Integration testów (potrzebują testowej DB; CI to robi w izolowanym środowisku)
- E2E (5-10 minut, killer DX)
- `next build` (długie, CI to robi)

**Target czasu**: < 30s.

**Jak ominąć**: `git push --no-verify` — używać oszczędnie, najczęściej w sytuacji "muszę szybko otworzyć WIP PR, jeszcze nie ma testów".

#### 🪝 commit-msg — uruchamia się **po** wpisaniu wiadomości commit, **przed** zapisaniem commita

**Cel**: wymuszenie, by każda pierwsza linia commita zaczynała się od `#NN` (numer taska / issue na GitHubie). Dzięki temu GitHub automatycznie linkuje commit jako komentarz pod odpowiednim issue — pełna ścieżka audytowa „zadanie → commit" bez ręcznego klikania.

Typ zmiany (feature, hotfix, refactor itd.) przenosimy do **nazwy brancha** (sekcja 13.5), bo przy squash & merge i tak liczy się tytuł PR-a, a nie poszczególne commit messages.

**Co robi**:

```sh
# .husky/commit-msg
MSG=$(head -n1 "$1")
if ! echo "$MSG" | grep -qE '^#[0-9]+( .+)?$'; then
  echo "Invalid commit message: $MSG"
  echo "Expected format: #NN  or  #NN <optional description>"
  echo "Example: #13   |   #13 add variant picker"
  exit 1
fi
```

**Format**:

| Element              | Reguła                                            |
| -------------------- | ------------------------------------------------- |
| Pierwsza linia       | `#NN` lub `#NN <opis>` (regex: `^#[0-9]+( .+)?$`) |
| `NN`                 | numer GitHub issue / taska (same cyfry)           |
| Opis                 | opcjonalny, dowolna treść po pierwszej spacji     |
| Body (kolejne linie) | dowolne — bez walidacji, oddzielone pustą linią   |

**Co się dzieje przy błędzie**: commit jest **odrzucony** z komunikatem wskazującym oczekiwany format. Dev poprawia message i ponawia.

**Target czasu**: < 1s.

#### Podsumowanie wszystkich trzech

```
git commit -m "#13 add variant picker"
  ↓
  pre-commit:    prettier + eslint na zmienionych plikach    [~3s]
  ↓
  commit-msg:    regex `^#[0-9]+( .+)?$` na pierwszej linii  [<1s]
  ↓
  COMMIT ZAPISANY

git push
  ↓
  pre-push:      walidacja nazwy brancha + tsc + vitest unit [~25s]
  ↓
  PUSH WYSŁANY

GitHub Actions: typecheck + lint + unit + integration + build + e2e   [~5min]
```

Każdy hook to coraz cięższe sito. Im szybciej coś się odsiewa, tym szybciej dostajesz feedback.

### 13.2. GitHub Actions

`.github/workflows/ci.yml`:

```yaml
on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
      - run: npm ci
      - run: npm run typecheck # tsc --noEmit
      - run: npm run lint # eslint
      - run: npm run format:check # prettier --check

  unit-integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: deskgear_test
        ports: [5432:5432]
        options: --health-cmd pg_isready --health-interval 10s
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/deskgear_test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: "npm" }
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npm run test # vitest run (unit + integration)

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: "npm" }
      - run: npm ci
      - run: npm run build # next build

  e2e:
    needs: [unit-integration, build]
    runs-on: ubuntu-latest
    services:
      postgres: { image: postgres:17, ... }
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/deskgear_test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: "npm" }
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npx prisma db seed
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run start & # uruchom Next.js
      - run: npx wait-on http://localhost:3000
      - run: npx playwright test
```

**Wszystkie 4 joby muszą przejść** żeby PR mógł być zmergowany (branch protection rules).

### 13.3. Branch protection (main)

- Wymagany PR (no direct push)
- Required checks: quality, unit-integration, build, e2e
- Linear history (squash & merge)
- Conversation resolution required

### 13.4. Commit message — przykłady

Pierwsza linia commita: `#NN` lub `#NN <opis>`. `NN` to numer GitHub issue/taska — dzięki niemu commit automatycznie pojawia się jako komentarz w issue.

```
#13
#13 add variant picker to PDP
#21 prevent double submission of place order action
#42 extract status transition logic to dedicated service method
#7 bump next to 16.2.5
```

Dla większych zmian dłuższe wyjaśnienie idzie do **body** (po pustej linii) — opisujesz **dlaczego**, nie **co**. Body jest dowolne, bez walidacji:

```
#142 use SELECT FOR UPDATE for stock decrement

Race condition was possible when two customers placed orders
for the last item simultaneously — both decremented stock from 1 to 0,
leaving negative inventory. Now wrapped in transaction with row lock.
```

### 13.5. Branch naming

**Cel**: każdy branch jest jednoznacznie powiązany z jednym taskiem na GitHubie, a jego prefix od razu mówi, jakiego rodzaju to zmiana (zastępując prefix Conventional Commits, którego już nie używamy w wiadomościach).

**Wzorzec**: `<type>/task.NN`

| Element | Reguła                                                             |
| ------- | ------------------------------------------------------------------ |
| `type`  | `feature` \| `hotfix` \| `refactor` \| `test` \| `docs` \| `chore` |
| `NN`    | numer GitHub issue / taska (same cyfry)                            |
| Regex   | `^(feature\|hotfix\|refactor\|test\|docs\|chore)/task\.[0-9]+$`    |

**Reguła decyzyjna gdy się wahasz, jaki typ wybrać**:

```
Czy zmiana wpływa na to co user widzi/może zrobić?
├── TAK → feature (jeśli nowe) lub hotfix (jeśli naprawa)
└── NIE
    └── Czy to zmiana w kodzie produkcyjnym?
        ├── TAK → refactor (obejmuje też perf i optymalizacje)
        └── NIE
            └── Czy to test?
                ├── TAK → test
                └── NIE
                    └── Czy to dokumentacja?
                        ├── TAK → docs
                        └── NIE → chore
```

**Przykłady**:

```
feature/task.13
hotfix/task.21
refactor/task.42
test/task.7
docs/task.99
chore/task.4
```

**Egzekwowanie**: hook `.husky/pre-push` blokuje push z brancha o niezgodnej nazwie — przed wywołaniem `tsc` i `vitest unit`:

```sh
# .husky/pre-push
BRANCH=$(git symbolic-ref --short HEAD)
if ! echo "$BRANCH" | grep -qE '^(feature|hotfix|refactor|test|docs|chore)/task\.[0-9]+$'; then
  echo "Invalid branch name: $BRANCH"
  echo "Expected pattern: <type>/task.NN  (type: feature | hotfix | refactor | test | docs | chore)"
  echo "Example: feature/task.13"
  exit 1
fi
npm run typecheck && npm run test:unit
```

**Uwaga o `main`**: lokalny push z brancha `main` przestanie być możliwy bez `--no-verify`. To zgodne ze strategią „PR-only, branch protection" (sekcja 13.3) — nigdy nie pushujemy ręcznie do `main`.

---

## 14. Observability (faza późniejsza)

### 14.1. Faza 1 — minimalne

- `console.error` w `toActionResult` dla unhandled errors
- Vercel Logs (out of the box)
- Pino w przyszłości — nie teraz

### 14.2. Faza 3 — Sentry + co jeszcze?

| Cel               | Narzędzie                              | Uzasadnienie                                            |
| ----------------- | -------------------------------------- | ------------------------------------------------------- |
| Error tracking    | **Sentry**                             | Standard, dobra integracja Next.js, free tier wystarczy |
| Web Vitals / RUM  | **Vercel Analytics** (built-in)        | Najprostsze, zero setup                                 |
| Product analytics | **PostHog** (opcjonalnie)              | Jeśli będzie potrzeba mierzyć konwersję                 |
| Uptime monitoring | **BetterStack** lub Vercel Cron + ping | Faza 3                                                  |
| Structured logs   | Vercel Logs → **Axiom**                | Jeśli debug w produkcji stanie się problemem            |

**Co śledzimy w Sentry**:

- Wszystkie `INTERNAL_ERROR` z `toActionResult`
- Failed Stripe webhooks (faza 2)
- 5xx z Route Handlers
- Performance: TTFB na PDP, PLP (samplowane)

**Czego NIE śledzimy**:

- `VALIDATION_ERROR` (zwykła interakcja użytkownika)
- `UNAUTHORIZED` / `FORBIDDEN` (oczekiwane)
- Cancelled requests

---

## 15. Deployment + Neon branching

### 15.1. Vercel + Neon

- **Hosting**: Vercel (free Hobby tier)
- **DB**: Neon PostgreSQL 17 (serverless, branching)
- **Region**: Frankfurt (eu-central-1) — najbliższe Warszawie

### 15.2. Środowiska

| Środowisko       | URL                     | DB                                          | Faza  |
| ---------------- | ----------------------- | ------------------------------------------- | ----- |
| Local            | localhost:3000          | local Postgres (docker) lub Neon dev branch | 1     |
| Production       | deskgear.vercel.app     | Neon `main` branch                          | 1     |
| Preview (per PR) | `*-deskgear.vercel.app` | Neon preview branches                       | **2** |
| Staging          | staging.deskgear.\*     | Neon staging                                | 3     |

### 15.3. Neon Preview Branching — dlaczego faza 2 i jak to działa

#### Problem: dlaczego nie od fazy 1

W fazie 1 mamy **jedno środowisko produkcyjne** + lokalny dev. PR-y testujemy lokalnie. To wystarczy do bootstrapu.

Preview branches dodajemy w fazie 2, gdy:

- Sklep ma realnych użytkowników i jest ryzykownie testować zmiany schematu na prod
- Pojawiają się PR-y modyfikujące migracje (`prisma migrate`) — chcemy je przetestować na **kopii prawdziwych danych**
- Chcemy pokazać reviewerowi działający feature pod konkretnym URL-em, nie tylko zrzuty ekranu

#### Co to jest Neon branching

**Neon to PostgreSQL z copy-on-write storage** (jak git, ale dla bazy). Tworzenie nowego brancha to operacja **w ~3 sekundy** niezależnie od rozmiaru bazy — kopiowane są tylko zmieniające się strony danych.

```
main branch (production)        ←── prawdziwe dane użytkowników
  │
  ├── preview/pr-142 (snapshot z main, kopia)  ← otwierasz PR #142
  ├── preview/pr-145 (snapshot z main)         ← otwierasz PR #145
  └── preview/pr-148 (snapshot z main)         ← otwierasz PR #148
```

Każdy branch ma własny connection string. Modyfikacje na branchu **nie wpływają na main**.

#### Praktyczny przykład flow dewelopera

Wyobraź sobie: jestem w trakcie pracy nad ficzerem "dodanie pola `tags` do produktu". Wymaga to migracji DB (`ALTER TABLE Product ADD COLUMN tags TEXT[]`) + zmian w kodzie.

**Krok po kroku z preview branchingiem (faza 2)**:

```bash
# 1. Tworzę feature branch w git
git checkout -b feature/task.142

# 2. Edytuję schema.prisma — dodaję pole tags
# 3. Generuję migrację lokalnie
npx prisma migrate dev --name add_product_tags
# → tworzy plik migration.sql, applies na lokalnej DB

# 4. Piszę kod + testy
# ...

# 5. Commituję i pushuję
git push origin feature/task.142

# 6. Otwieram PR na GitHubie
# ↓ tu zaczyna się magia Neon + Vercel ↓
```

W tym momencie automat (GitHub Action + Neon integration) robi:

```
GitHub PR opened (preview)
       │
       ▼
Neon: utwórz branch "preview/pr-{number}" z main
       │ (3 sekundy — copy-on-write z prawdziwych danych)
       ▼
Generuje DATABASE_URL dla tego brancha
       │
       ▼
Vercel: deploy preview z tym DATABASE_URL
       │
       ▼
CI/CD: prisma migrate deploy (na NEON BRANCH, nie na main!)
       │  ← dodaje kolumnę `tags` na kopii prod-danych
       ▼
✅ Preview deployment dostępny pod https://pr-142-deskgear.vercel.app
```

**Teraz**:

- Reviewer klika link, widzi działający feature z prawdziwymi danymi (oczywiście anonimizowanymi/seedowanymi do testowania)
- Mogę przetestować migrację na realnej skali (czy `ALTER TABLE` na 500k produktach nie zablokuje bazy)
- Jeśli migracja jest zła → naprawiam, push, automat odtwarza branch
- Po merge PR-a → Neon kasuje preview branch (auto-cleanup)

**Kluczowa zaleta**: testujemy migrację w warunkach 1:1 z prod **bez ryzyka dla prod**. To jest game-changer w stosunku do klasycznego "mam staging który już od pół roku odbiega od prod-a".

#### Konfiguracja (faza 2)

```yaml
# .github/workflows/preview-db.yml (pseudocode)
on:
  pull_request:
    types: [opened, reopened, synchronize, closed]

jobs:
  create-preview-branch:
    if: github.event.action != 'closed'
    steps:
      - name: Create Neon branch
        uses: neondatabase/create-branch-action@v5
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          parent: main
          branch_name: preview/pr-${{ github.event.pull_request.number }}
          api_key: ${{ secrets.NEON_API_KEY }}
        id: branch
      - name: Run migrations on branch
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ steps.branch.outputs.db_url }}
      - name: Set Vercel env for this PR
        run: vercel env add DATABASE_URL preview ${{ github.head_ref }}

  delete-preview-branch:
    if: github.event.action == 'closed'
    steps:
      - uses: neondatabase/delete-branch-action@v3
        with:
          branch_name: preview/pr-${{ github.event.pull_request.number }}
```

#### Limity (free tier Neon)

- Free tier: **10 branches** + 0.5 GB storage. Na portfolio projekt z 5-10 otwartymi PR-ami w tym samym czasie — wystarczy.
- Powyżej → Pro plan (~$19/mc), prawdopodobnie nie potrzebne w fazie 2 portfolio.

### 15.4. ENV vars

```
# DB
DATABASE_URL=

# Auth (NextAuth / Auth.js v5)
AUTH_SECRET=            # openssl rand -base64 32
AUTH_URL=               # http://localhost:3000 (dev) lub https://deskgear.vercel.app (prod)
AUTH_TRUST_HOST=true    # dla Vercel deployment

# Seed (admin)
ADMIN_SEED_EMAIL=
ADMIN_SEED_PASSWORD=

# Email (faza 1 — reset hasła):
RESEND_API_KEY=
EMAIL_FROM=

# Faza 2:
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEON_API_KEY=          # tylko CI

# Faza 3:
SENTRY_DSN=
```

Validacja przez `zod` na starcie aplikacji (`src/env.ts` z `@t3-oss/env-nextjs`).

---

## 16. Plan faz

> Plan jest **żywy**. Faza 0 i 1 są dobrze określone (poniżej w formacie checkbox = task pod GitHub Issue). Faza 2+ to high-level. Każda faza kończy się **deployowalnym** stanem.

### Co jest w MVP (Faza 1), a co w Fazie 2 — high-level

| Zakres                                                                  | MVP (Faza 1) |  Faza 2  |
| ----------------------------------------------------------------------- | :----------: | :------: |
| Przeglądanie produktów (PLP, PDP, filtry)                               |      ✅      |          |
| Wybór wariantu                                                          |      ✅      |          |
| Koszyk (guest + logged) z merge na login                                |      ✅      |          |
| Rejestracja, login, reset hasła                                         |      ✅      |          |
| Lokalne obrazki w `public/products/` (commitowane)                      |      ✅      |          |
| Seed z ~40-60 produktami                                                |      ✅      |          |
| Layout: Header, Footer, responsywność                                   |      ✅      |          |
| Wrappery RHF: text, password, checkbox, textarea, select, radio, number |      ✅      |          |
| **Checkout flow (stepper, formularz)**                                  |              |    ✅    |
| **Składanie zamówienia ("Fake PAID")**                                  |              |    ✅    |
| **Historia zamówień użytkownika**                                       |              |    ✅    |
| **Admin panel: CRUD produktów (z `RHFFieldArray`)**                     |              |    ✅    |
| **Admin panel: zarządzanie zamówieniami**                               |              |    ✅    |
| **Faktura VAT (z NIP-em w formularzu)**                                 |              |    ✅    |
| **Email potwierdzenia zamówienia (Resend)**                             |              |    ✅    |
| **Neon preview branches per PR**                                        |              |    ✅    |
| Stripe (real payments)                                                  |              | (Faza 3) |
| EN i18n                                                                 |              | (Faza 3) |
| Sentry                                                                  |              | (Faza 3) |
| Admin: upload obrazków przez UI (UploadThing)                           |              | (Faza 3) |

---

### Faza 0 — Fundament (1-2 tyg.)

**Cel**: szkielet projektu, zero biznesu, ale CI/CD i fundament są gotowe. Login działa, jeden formularz, deploy zielony.

- [ ] Init Next.js + TS + Tailwind + ESLint + Prettier (`create-next-app`)
- [ ] Husky + lint-staged + regex-walidacja commitów i nazw branchy (3 hooki — patrz 13.1)
- [ ] Vitest + RTL + MSW setup
- [ ] Playwright setup
- [ ] GitHub Actions workflow (4 jobs: quality, unit-integration, build, e2e)
- [ ] Prisma + Neon connection
- [ ] Auth.js v5 stub (JWT strategy, Credentials provider, login testowego admina z seed)
- [ ] `lib/errors/`, `lib/actions/`, `lib/validation/zod-error-map.ts`, `lib/money/`
- [ ] `i18n/` z prostym `t()` helperem + pierwszy `errors.json`
- [ ] `RHFTextField` + `RHFPasswordField` (z testami + `errorMessages` override)
- [ ] Strona `/login` z działającym formularzem
- [ ] Deploy na Vercel + seed na Neon
- [ ] **Gate**: zalogowanie i wylogowanie działa w produkcji, wszystkie 4 joby zielone

---

### Faza 1 — MVP, Sklep publiczny (3-4 tyg.)

> **Format poniżej**: każdy bullet = osobny GitHub Issue z dokładnymi acceptance criteria. Pogrupowane w epickie zadania (E1-E8) dla łatwiejszego trackowania.

#### E1 — Inicjalizacja projektu (faza 0, część 1)

**E1.1: Init Next.js project skeleton**

- [ ] `npx create-next-app@latest deskgear` z opcjami: TS, Tailwind, App Router, src/, ESLint
- [ ] Zweryfikować `package.json`: `next ^16.2`, `react ^19`, `typescript ^5.9`
- [ ] Stworzyć `.nvmrc` z `22`
- [ ] `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`
- [ ] Commit: `chore: bootstrap next.js project`
- **Definition of Done**: `npm run dev` uruchamia stronę na localhost:3000

**E1.2: Tailwind v4 config + globalne style**

- [ ] Skonfigurować Tailwind v4 (CSS-first config w `globals.css`)
- [ ] Dodać `prettier-plugin-tailwindcss` do `prettier.config.js`
- [ ] Zweryfikować że `class="text-red-500"` działa
- **DoD**: prosty komponent z Tailwind classes renderuje się poprawnie

**E1.3: ESLint flat config**

- [ ] `eslint.config.js` z `@typescript-eslint`, `eslint-config-next`, `eslint-plugin-tailwindcss`
- [ ] Reguły: `no-unused-vars`, `no-explicit-any`, `consistent-type-imports`, `prefer-const`
- [ ] Skrypty: `npm run lint`, `npm run lint:fix`
- **DoD**: `npm run lint` zwraca 0 errors na świeżym projekcie

**E1.4: Prettier**

- [ ] `prettier.config.js` z `prettier-plugin-tailwindcss`
- [ ] `.prettierignore` (node_modules, .next, .vercel, \*.lock)
- [ ] Skrypty: `npm run format`, `npm run format:check`
- **DoD**: `npm run format:check` zwraca 0 diff

**E1.5: Husky + lint-staged + walidacja commitów/branchy**

- [ ] `npm i -D husky lint-staged`
- [ ] `npx husky init`
- [ ] `.husky/pre-commit`: `npx lint-staged`
- [ ] `.husky/pre-push`: walidacja nazwy brancha (regex `^(feature|hotfix|refactor|test|docs|chore)/task\.[0-9]+$`) + `npm run typecheck && npm run test:unit` (patrz 13.5)
- [ ] `.husky/commit-msg`: regex `^#[0-9]+( .+)?$` na pierwszej linii (patrz 13.1)
- [ ] `package.json` `lint-staged`: prettier + eslint na zmienionych plikach
- **DoD**: commit `feature: invalid` odrzucony; commit `#13 add husky` przechodzi; push z brancha `bad-name` odrzucony; push z `feature/task.13` przechodzi

**E1.6: Env validation (`src/env.ts`)**

- [ ] `npm i @t3-oss/env-nextjs zod`
- [ ] `src/env.ts` z schemami `server`/`client`
- [ ] Pierwsze zmienne: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `NODE_ENV`
- [ ] Import w `next.config.ts` (`import('./src/env.ts')`)
- **DoD**: brak `DATABASE_URL` w `.env` powoduje czytelny error przy `npm run build`

#### E2 — Database i ORM

**E2.1: Neon project + lokalny Postgres docker-compose**

- [ ] Utworzyć konto Neon (jeśli brak), nowy projekt, region `eu-central-1`
- [ ] Skopiować `DATABASE_URL` do `.env`
- [ ] `docker-compose.yml` z `postgres:17` (alternatywa lokalna dla CI)
- [ ] README: jak uruchomić docker-compose
- **DoD**: `psql $DATABASE_URL -c "SELECT 1"` zwraca wynik

**E2.2: Prisma init + Prisma 7 setup + base schema**

- [ ] `npm i prisma @prisma/client @prisma/adapter-pg && npx prisma init`
- [ ] **Prisma 7**: w `schema.prisma` ustaw `output = "../src/generated/prisma"` (wymagane w v7)
- [ ] `src/lib/db/prisma.ts` używa `PrismaPg` adapter (Postgres adapter package):
  ```typescript
  import { PrismaClient } from "@/generated/prisma/client"
  import { PrismaPg } from "@prisma/adapter-pg"
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  export const prisma = new PrismaClient({ adapter })
  ```
- [ ] Skopiować model `User`, `Account` (opcjonalny pod OAuth w fazie 3), `VerificationToken` (Auth.js wymaga) do `schema.prisma` (patrz sekcja 5.5)
- [ ] **Bez** modelu `Session` — używamy JWT strategy (ADR-001)
- [ ] `npx prisma migrate dev --name initial`
- [ ] `prisma/seed.ts` — pusty stub z `import 'dotenv/config'` na górze (Prisma 7 nie auto-loaduje env)
- [ ] `package.json`: `"prisma": { "seed": "tsx prisma/seed.ts" }`
- **DoD**: `npx prisma studio` otwiera DB z tabelami `User`, `Account`, `VerificationToken`

**E2.3: Prisma client singleton**

- [ ] `src/lib/db/prisma.ts` z singletonem (chronionym przed multiple instances w dev)
- **DoD**: import `prisma` działa w Server Action (test handler)

**E2.4: Models — Category, Product, ProductImage, ProductVariant**

- [ ] Dopisać do `schema.prisma` (patrz sekcja 5.5)
- [ ] `npx prisma migrate dev --name add_product_models`
- [ ] Indeksy z sekcji 5.4
- **DoD**: migracja przechodzi, tabele widoczne w Studio

**E2.5: Models — Cart, CartItem, Order, OrderItem, OrderStatusChange**

- [ ] Dopisać do `schema.prisma`
- [ ] `npx prisma migrate dev --name add_order_models`
- **DoD**: pełen ERD z sekcji 5.2 odzwierciedlony w DB

**E2.6: CHECK constraints**

- [ ] Nowa migracja `add_check_constraints` z raw SQL (patrz sekcja 5.4)
- [ ] `npx prisma migrate dev --name add_check_constraints --create-only`
- [ ] Edycja `migration.sql` — dopisać `ALTER TABLE ... CHECK`
- [ ] `npx prisma migrate dev`
- **DoD**: `INSERT INTO "CartItem" (..., quantity) VALUES (..., 0)` odrzucony przez DB

**E2.7: PasswordResetToken model**

- [ ] Dopisać do `schema.prisma`
- [ ] Migracja `add_password_reset_token`
- **DoD**: model dostępny w Prisma Client

#### E3 — Auth (Auth.js v5 + JWT)

**E3.1: Auth.js install + edge-safe config**

- [ ] `npm i next-auth@5.0.0-beta.<X> @auth/prisma-adapter bcryptjs`
- [ ] `npm i -D @types/bcryptjs`
- [ ] **Pin wersji** w `package.json` (bez `^`) — Auth.js v5 nadal beta
- [ ] `src/lib/auth/auth.config.ts` — edge-safe config (bez Prisma adaptera, bez `bcryptjs`)
- [ ] Callback `authorized` — chroni `/admin`, `/account`
- **DoD**: import `authConfig` w pliku edge-runtime nie rzuca błędu o "Prisma not edge-compatible"

**E3.2: Auth.js pełna konfiguracja (Node runtime)**

- [ ] `src/lib/auth/auth.ts` — pełna konfiguracja z `PrismaAdapter(prisma)`, `Credentials` provider, JWT strategy (7 dni)
- [ ] `authorize()` callback waliduje credentials przez `loginSchema`, hashuje hasło przez `bcryptjs.compare`
- [ ] Callbacki `jwt` i `session` — dorzucają `id` i `role` do tokenu/sesji
- [ ] Export `handlers, auth, signIn, signOut`
- [ ] `src/app/api/auth/[...nextauth]/route.ts` — eksport `{ GET, POST } = handlers`
- **DoD**: GET `/api/auth/session` zwraca `null` gdy nie zalogowany

**E3.3: Proxy / Middleware ochrony tras**

- [ ] `src/proxy.ts` (Next.js 16) — używa **tylko `authConfig`** (edge-safe!)
- [ ] Matcher: `['/admin/:path*', '/account/:path*']`
- [ ] Redirect na `/login?callbackUrl=...` jeśli brak sesji (callback `authorized` zwraca `false`)
- **DoD**: wejście na `/admin` bez sesji redirectuje na login

**E3.4: `requireRole` helper**

- [ ] `src/lib/auth/require-role.ts` — używa `auth()` z Auth.js v5
- [ ] Unit test: `requireRole(['ADMIN'])` rzuca `AppError('UNAUTHORIZED')` bez sesji, `AppError('FORBIDDEN')` z złą rolą
- **DoD**: 2 testy zielone, helper używany w Server Actions

**E3.5: Admin seed**

- [ ] W `prisma/seed.ts` upsert admina z `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` z env
- [ ] Hash hasła przez `bcryptjs.hash(password, 12)` (Auth.js sam nie hashuje)
- **DoD**: po `prisma db seed` w DB jest user z `role=ADMIN`, login działa

#### E4 — Lib core: errors, actions, validation, money, i18n

**E4.1: AppError + AppErrorCode + AppErrors helpers**

- [ ] `src/lib/errors/app-error.ts` (patrz 6.3)
- [ ] Unit testy dla helperów (`AppErrors.emailExists()`)
- **DoD**: testy zielone

**E4.2: Zod error map (globalny customError)**

- [ ] `src/lib/validation/zod-error-map.ts` (patrz 6.2)
- [ ] Import w `src/instrumentation.ts` żeby uruchomił się na starcie
- [ ] Unit testy `extractParams()` dla różnych issue codes
- **DoD**: `z.string().min(8).safeParse("x").error.issues[0].message` to JSON z `code` i `params`

**E4.3: ActionResult + toActionResult**

- [ ] `src/lib/actions/action-result.ts` (types)
- [ ] `src/lib/actions/to-action-result.ts` (handler)
- [ ] Unit testy: ZodError → validation, AppError → business/auth, inny → server + traceId
- **DoD**: 4 testy zielone

**E4.4: Money types + schema + format**

- [ ] `src/lib/money/types.ts`, `schema.ts`, `format.ts` (patrz 5.6)
- [ ] Unit testy `formatMoney` dla edge cases (zero, duże liczby)
- **DoD**: `formatMoney("249.00")` → `"249,00 zł"`

**E4.5: i18n collector + t()**

- [ ] Struktura `src/i18n/pl/common/` z `errors.json`, `nav.json`, `forms.json`
- [ ] `src/i18n/messages.ts` collector (patrz 11.1)
- [ ] `src/i18n/t.ts` helper
- [ ] Unit testy `t()` z parametrami, fallback do klucza gdy brak tłumaczenia
- **DoD**: `t('errors.too_small.string', { minimum: 8 })` → "Wymagane co najmniej 8 znaków"

**E4.6: resolveErrorMessage z trójwarstwową kaskadą**

- [ ] `src/lib/validation/resolve-error-message.ts` (patrz 6.7)
- [ ] Unit testy: override per pole > schema-level > global > fallback > code
- **DoD**: 5 testów (po jednym dla każdego poziomu kaskady) zielone

#### E5 — Wrappery RHF + komponenty UI

**E5.1: shadcn/ui init**

- [ ] `npx shadcn@latest init` (style, color scheme)
- [ ] Dodać komponenty: `Input`, `Label`, `Button`, `Form` (jako baza dla wrapperów)
- **DoD**: `<Button>Test</Button>` renderuje się

**E5.2: RHFTextField**

- [ ] `src/components/form/rhf-text-field.tsx` (patrz 10.2)
- [ ] Component testy: renderowanie, error z resolveErrorMessage, override per pole, aria-invalid
- **DoD**: 4 testy zielone

**E5.3: RHFPasswordField**

- [ ] Wraper RHFTextField + toggle visibility (oko)
- [ ] Strength meter (opcjonalnie — może faza 2)
- [ ] Component testy
- **DoD**: 2 testy zielone

#### E6 — Login + Register + Reset Password

**E6.1: Login form + Server Action**

- [ ] Schema Zod `loginSchema` w `features/auth/schemas.ts`
- [ ] Server Action `loginAction`
- [ ] Strona `/login` z RHF form, RHFTextField, RHFPasswordField
- [ ] Integration test: bad credentials → `auth` error, dobre → success + session
- **DoD**: można się zalogować jako admin (z seeda), redirect na `/account`

**E6.2: Register form + Server Action**

- [ ] Schema `registerSchema` z walidacją siły hasła
- [ ] Server Action `registerAction`
- [ ] Strona `/register`
- [ ] Integration test: duplikat email → `EMAIL_ALREADY_EXISTS`
- **DoD**: można zarejestrować nowego usera, auto-login

**E6.3: Forgot password**

- [ ] Schema `forgotPasswordSchema`
- [ ] Server Action `requestPasswordResetAction` (zawsze success)
- [ ] Strona `/forgot-password`
- [ ] Token w DB (PasswordResetToken model)
- **DoD**: po submit zawsze "Sprawdź skrzynkę" niezależnie od istnienia emaila

**E6.4: Resend integration**

- [ ] `npm i resend`
- [ ] `src/lib/email/resend.ts` client
- [ ] `src/lib/email/templates/reset-password.tsx` (React Email)
- [ ] Wysyłka maila z linkiem `/reset-password?token=...`
- [ ] MSW handler dla testów (`tests/mocks/handlers/resend.ts`)
- **DoD**: w dev console.log link; w prod mail dochodzi (test ręczny)

**E6.5: Reset password**

- [ ] Schema `resetPasswordSchema` (token + nowe hasło)
- [ ] Server Action `resetPasswordAction`
- [ ] Strona `/reset-password?token=...`
- [ ] Integration test: expired token, used token, valid token
- **DoD**: można zresetować hasło end-to-end

#### E7 — Obrazki + Seed

**E7.1: Pliki obrazków w `public/products/`**

- [ ] Skopiować ~40-60 obrazków produktowych do `public/products/`
- [ ] Konwencja nazewnictwa: `{category}-{slug}-{variant}.webp`
- [ ] README z listą plików
- **DoD**: obrazki dostępne pod `http://localhost:3000/products/keyboard-tkl-black-front.webp`

**E7.2: Seed kategorii**

- [ ] Hierarchia: peripherals → keyboards/mice/headphones/microphones, displays → monitors, storage → drives/cables/accessories, workspace → chairs/desk-accessories, apparel → t-shirts (slugi po angielsku — ADR-014)
- [ ] Upsert by slug (idempotentne)
- **DoD**: 10-15 kategorii w DB po `db seed`

**E7.3: Seed produktów (40-60 sztuk)**

- [ ] Generator faker per kategoria z różnymi atrybutami wariantu
- [ ] Co najmniej 5 produktów per kategoria
- [ ] 2-6 wariantów per produkt
- [ ] Realistyczne ceny (zakresy z 5.5)
- [ ] Referencje do `ProductImage.path`
- **DoD**: ~50 produktów, ~200 wariantów w DB; PLP wygląda jak "prawdziwy sklep"

#### E8 — Sklep publiczny (PLP, PDP, Cart)

**E8.1: productService.findMany + schema filtrów**

- [ ] `listProductsSchema` (Zod): kategoria, brand, cena (min/max), strona, sort — używany w `page.tsx` do parsowania `searchParams`
- [ ] `productRepository.findMany(filters)` — Prisma query z paginacją i sortowaniem
- [ ] `productService.findMany(filters)` — orchestracja repo (mapowanie Decimal → string, dołączenie głównego obrazka, snapshot ceny "od")
- [ ] Unit testy service'u (mock repo)
- [ ] Integration testy z DB (5 scenariuszy: bez filtrów, by category, by price range, paginacja, empty result)
- **DoD**: `productService.findMany({})` zwraca paginowane wyniki; testy zielone

**E8.2: PLP `/shop` — RSC z bezpośrednim wywołaniem service'u**

- [ ] `src/app/(shop)/shop/page.tsx` — RSC parsuje `searchParams` przez `listProductsSchema`, wywołuje `productService.findMany()`
- [ ] URL params: `?category=keyboards&brand=Keychron&page=2&sort=price-asc`
- [ ] Grid produktów z `ProductCard`
- [ ] `loading.tsx` (skeleton), `error.tsx` (fallback dla błędów z service'u)
- **DoD**: lista wyświetla się z filtrami z URL, brak Server Action w tym pliku

**E8.3: Sidebar filtrów (client component)**

- [ ] Filtry: kategoria (multi-select), brand (multi-select), price range, in-stock toggle
- [ ] Aktualizacja URL przez `useRouter().replace()` z `nuqs` lub własną logiką
- [ ] Reset filters button
- **DoD**: filtry zmieniają URL, RSC re-renders, lista produktów się aktualizuje

**E8.4: ProductCard component**

- [ ] Wyświetla: główne zdjęcie (Next Image), nazwa, brand, cena od (min z wariantów), badge "Bestseller" jeśli `isFeatured`
- [ ] Link do PDP `/shop/[slug]`
- [ ] Component test (renderowanie, klik)
- **DoD**: testy zielone

**E8.5: PDP `/shop/[slug]` — RSC**

- [ ] `productRepository.findBySlug(slug)` (zwraca `Product | null`)
- [ ] `productService.getBySlug(slug)` — wywołuje `notFound()` z `next/navigation` gdy brak lub `!isActive`
- [ ] `src/app/(shop)/shop/[slug]/page.tsx` — RSC bez try/catch, tylko `await productService.getBySlug(slug)`
- [ ] Generowanie metadata przez `generateMetadata` (też używa service'u — w przypadku 404 też wywoła notFound)
- [ ] `app/(shop)/shop/[slug]/not-found.tsx` (specyficzny dla PDP) — komunikat "Produkt nie istnieje" + link do `/shop`
- [ ] Galeria zdjęć (główne + thumbnaile), variant picker (klient), opis, cena, "Dodaj do koszyka"
- [ ] Test service'u: `getBySlug('nonexistent')` rzuca `NEXT_NOT_FOUND` (mock `next/navigation`)
- **DoD**: można otworzyć dowolny produkt z PLP; nieistniejący slug pokazuje `not-found.tsx`; testy zielone

**E8.6: Variant picker (client component)**

- [ ] `useVariantSelection` hook (przyjmuje warianty jako prop z RSC)
- [ ] UI dostosowany do `categoryType` (np. rozmiar dla apparel, switch/layout dla keyboards)
- [ ] Disabled state dla niedostępnych kombinacji (stock = 0)
- [ ] Component test
- **DoD**: zmiana wariantu zmienia cenę i obrazek (jeśli wariant ma osobne zdjęcie)

**E8.7: Cart Server Actions (TYLKO mutacje)**

- [ ] `addToCartAction({ variantId, quantity })`
- [ ] `updateCartItemAction({ itemId, quantity })`
- [ ] `removeFromCartAction({ itemId })`
- [ ] `cartService.getCart(ctx)` — wywoływany przez RSC bezpośrednio (NIE Server Action)
- [ ] `CartContext` builder: `auth()` + `cookies()`
- [ ] Integration testy: guest cart, logged-in cart, merge, insufficient stock
- **DoD**: 8+ testów zielonych; reads cartu z RSC bez SA

**E8.8: Cart UI**

- [ ] Strona `/cart` — RSC wywołuje `cartService.getCart(ctx)` bezpośrednio
- [ ] Lista items, change quantity (+/-), remove → te akcje wywołują SA (`updateCartItemAction`, `removeFromCartAction`)
- [ ] `revalidatePath('/cart')` w SA zapewnia odświeżenie listy po mutacji
- [ ] Empty state
- [ ] Header: badge z liczbą items (RSC w `layout.tsx` wywołuje `cartService.getCart(ctx).itemCount`)
- **DoD**: cart end-to-end działa dla guesta i zalogowanego

**E8.9: Cart merge on login**

- [ ] Hook w Auth.js `signIn` callback (lub event `signIn`) → `cartService.mergeGuestIntoUser(guestToken, userId)`
- [ ] Wyczyszczenie cookie `__dg_guest_cart`
- [ ] Integration test: guest dodaje 2 items, login, sprawdza że są w jego koszyku
- **DoD**: test zielony

#### Wrappery RHF dopisywane w trakcie E8

W trakcie implementacji formularzy w E8 i wcześniej dochodzą:

- [ ] `RHFCheckbox` (filtry PLP, register terms)
- [ ] `RHFTextarea` (review, faza 2)
- [ ] `RHFSelect` (sortowanie PLP, kraj w adresie)
- [ ] `RHFRadioGroup` (shipping method — faza 2)
- [ ] `RHFNumberInput` (quantity w cart)

Każdy wraper = osobny issue z component testem.

#### Gate Fazy 1

- [ ] Wszystkie joby CI/CD zielone
- [ ] Coverage ≥ 60% globalnie, ≥ 80% w `features/*/services` i `features/*/actions`
- [ ] Gość przechodzi pełen flow: PLP → PDP → add to cart → cart → próba checkout (placeholder)
- [ ] User: register → login → cart merged → reset hasła działa
- [ ] Lighthouse Performance ≥ 90 na PLP i PDP
- [ ] Deploy na Vercel + Neon main zielony
- [ ] README pokazuje jak uruchomić projekt lokalnie

---

### Faza 2 — Checkout + Admin podstawowy (3-4 tyg.)

- [ ] Stepper checkout (1 form RHF, conditional steps)
- [ ] Order, OrderItem, OrderStatusChange + state machine
- [ ] Order creation z transakcją + decrement stock (`SELECT FOR UPDATE`)
- [ ] "Fake PAID" status po submit
- [ ] Strona `/checkout/[orderNumber]/thank-you`
- [ ] Strona `/account/orders` (historia)
- [ ] Admin: middleware + layout + dashboard
- [ ] Admin: lista produktów (TanStack Table) + CRUD
- [ ] Admin: edycja produktu z `RHFFieldArray` (discriminated union per kategoria)
- [ ] Admin: lista zamówień + detail + status change
- [ ] Email potwierdzenia (Resend)
- [ ] **Neon preview branches per PR** (sekcja 15.3)
- [ ] **Gate**: e2e "guest checkout" + "admin processes order" zielone

### Faza 3 — Stripe + Observability + EN + UploadThing (open scope)

- Stripe Checkout Sessions + webhook
- Sentry (error tracking + traceId integration)
- next-intl + tłumaczenia EN
- Image upload (UploadThing) dla admin
- Email: faktura VAT PDF, statusy wysyłki
- Wishlist
- Reviews/ratings

---

## 17. Decyzje architektoniczne (ADR)

Lista decyzji wraz z odrzuconymi alternatywami. **ADR-y są append-only** — gdy zmieniamy decyzję, dopisujemy nową ze statusem "Superseded by".

### ADR-001: NextAuth (Auth.js) v5 + JWT sessions (decyzja edukacyjna)

**Status**: Accepted (świadomie edukacyjna)
**Decyzja**: Auth.js v5 (pinned do konkretnej wersji `5.0.0-beta.X`) z JWT sessions (`session.strategy: 'jwt'`), Credentials provider, Prisma adapter.

**Powody**:

- Wybór edukacyjny — Auth.js + JWT to **najczęstszy pattern w tutorialach Next.js**, chcę go opanować w pierwszym projekcie
- Stateless sessions = brak tabeli `Session`, edge middleware działa OOTB bez DB
- 80+ OAuth providers OOTB pod fazę 3 (Google, GitHub)
- Auth.js v5 nadal jest aktywnie utrzymywany (przez zespół Better Auth od końca 2025, security i critical fixes)

**Świadome koszty** (sekcja 7.5):

- Brak immediate logout / role change (czeka do TTL 7 dni lub re-login)
- Brak "wyloguj ze wszystkich urządzeń"
- `session callback` w v5 ma znany problem (nie wywoływany przy każdym request)
- Beta tag — mitigacja przez pin wersji

**Odrzucone**:

- **Better Auth** — bardziej dojrzała technologia dla DB sessions, ale to pattern który zrobię w **kolejnym projekcie** (świadomie ćwiczę różne podejścia)
- **DB sessions w Auth.js** (`session.strategy: 'database'`) — możliwe, ale traci się benefit "stateless" który jest głównym powodem wyboru tego stacka edukacyjnie
- Clerk — vendor lock-in
- WorkOS — overkill dla B2C

**Konsekwencje**:

- Tabela `User` w DB (przez Prisma adapter), opcjonalnie `Account` (dla OAuth w fazie 3) i `VerificationToken` (nie używamy w fazie 1)
- Tabela `Session` **nie istnieje** (JWT, nie DB sessions)
- Reset hasła własna implementacja (tabela `PasswordResetToken`) — Auth.js nie zarządza tym sam
- Cart merge przy login implementowany w `signIn` callback Auth.js (sekcja 7.7)

### ADR-002: Zod jako single source of truth dla błędów walidacji

**Status**: Accepted
**Decyzja**: globalny `customError` map (Zod 4 API) + trójwarstwowa kaskada nadpisywania (sekcja 6.7).
**Odrzucone**: własny `FieldError` z mapowaniem.
**Konsekwencje**: business errors osobno przez `AppError`.

### ADR-003: Cart zawsze w bazie, guest po cookie

**Status**: Accepted
**Decyzja**: jeden model `Cart`, jeden flow w services.
**Odrzucone**: sessionStorage, cookie-based cart.

### ADR-004: Warstwy Action → Service → Repository → Prisma

**Status**: Accepted
**Decyzja**: 3 warstwy, każda z osobnym katalogiem per feature.
**Odrzucone**: bezpośrednie wywołania Prismy z Service.

### ADR-005: "Fake PAID" w fazie 1, Stripe w fazie 2

**Status**: Accepted
**Decyzja**: order po submit dostaje `status=PAID`. Stripe to osobna faza.

### ADR-006: Testing Trophy zamiast piramidy

**Status**: Accepted
**Decyzja**: 20/60/20 (unit/integration/e2e).

### ADR-007: Decimal w DB, string w API dla pieniędzy

**Status**: Accepted
**Decyzja**: `Decimal(10, 2)` w Prisma + string w API.

### ADR-008: npm + Next.js App Router + React 19

**Status**: Accepted
**Decyzja**: App Router od początku. Package manager: npm.

### ADR-009: Brak Storybook w fazie 1

**Status**: Accepted
**Decyzja**: dokumentacja komponentów = testy + JSDoc.

### ADR-010: shadcn jest nietykalny

**Status**: Accepted
**Decyzja**: zero modyfikacji w `components/ui/`.

### ADR-011: Obrazki produktów lokalnie w repo (faza 1), UploadThing w fazie 3

**Status**: Accepted
**Decyzja**: w fazie 1 wszystkie obrazki w `public/products/` (commitowane), seed referencuje ścieżki. Format: WebP 1600×1600 quality 85.
**Odrzucone**: hot-linking z Unsplash w seed, UploadThing od fazy 1 (overhead).
**Konsekwencje**: repo ~5-15 MB większe, ale deterministyczne i offline-capable.

### ADR-012: Atrybuty wariantu w JSONB + Zod discriminated union

**Status**: Accepted
**Decyzja**: `ProductVariant.attributes` jako kolumna `Json @db.JsonB`. Walidacja per-kategoria w Zod przez `z.discriminatedUnion('categoryType', [...])`.
**Odrzucone**:

- Osobne kolumny per atrybut — eksplozja nullable kolumn
- EAV — overengineering, słabe queries
- Osobne tabele per typ wariantu — eksplozja modeli
  **Konsekwencje**: GIN index na JSONB w fazie 2 jeśli filtrowanie po atrybutach stanie się hotspotem.

### ADR-013: Server Actions tylko dla mutacji, reads przez RSC

**Status**: Accepted
**Decyzja**: Server Actions (`'use server'`) używamy **wyłącznie do mutacji** (write). Reads idą przez Server Components wywołujące `service` bezpośrednio. Service jest wspólnym wejściem do warstwy biznesowej dla obu ścieżek.
**Odrzucone**:

- SA dla wszystkiego (read + write) — rozważane jako "edukacyjne ujednolicenie mentalne", ostatecznie odrzucone bo traci się natywne cache Next.js, prefetch, semantykę GET, plus wymaga to opakowywania reads w `ActionResult<T>` zamiast czystego try/catch + `error.tsx`.
- API Routes / Route Handlers dla reads — niepotrzebny dodatkowy hop HTTP gdy RSC mogą wywołać service bezpośrednio.
  **Konsekwencje**: dwie ścieżki w prezentacji (read przez RSC + service, write przez SA + service), ale **jedna warstwa biznesowa** (service). Błędy obsługiwane różnie: reads → `throw` → `error.tsx` / `notFound()`; writes → `ActionResult<T>` → `setError` / toast.

### ADR-014: Slugi kategorii i kodów po angielsku

**Status**: Accepted
**Decyzja**: slugi kategorii w bazie (`peripherals`, `keyboards`, `mice`, `headphones`, `microphones`, `monitors`, `drives`, `cables`, `accessories`, `chairs`, `desk-accessories`, `t-shirts`) po angielsku. Pole `name` po polsku.
**Odrzucone**: slugi po polsku (`klawiatury`, `myszki`) — gorsze URL-e, trudniej rozszerzać o EN, polskie znaki w URL.
**Konsekwencje**: w URL widać `/shop/keyboards`, nie `/shop/klawiatury`. Dla SEO w PL może być nieoptymalne, ale dla portfolio (i przyszłej wersji EN) lepsze.

### ADR-015: CHECK constraints w bazie jako safety net

**Status**: Accepted
**Decyzja**: oprócz walidacji w Zod dodajemy CHECK constraints w SQL migration (sekcja 5.4) na: `stockQuantity >= 0`, `quantity > 0`, `priceGross > 0`, format emaila.
**Powód**: defense in depth. Jeśli aplikacja ma bug, baza odrzuca bzdurę.
**Konsekwencje**: errory z bazy są mniej czytelne dla użytkownika niż z Zoda — ale **nigdy nie powinny trafić do usera**, bo Zod powinien je złapać wcześniej. Jeśli trafiają, mamy bug w warstwie walidacji.

### ADR-016: i18n per feature (nie monolityczny `pl.json`)

**Status**: Accepted
**Decyzja**: każdy feature ma `i18n/pl.json`, plus globalne `i18n/pl/common/{errors,nav,forms}.json`. Collector zbiera w `i18n/messages.ts`.
**Odrzucone**: monolityczny `pl.json` (jeden plik) — szybciej rośnie do nieczytelnego, więcej konfliktów git.
**Konsekwencje**: trochę więcej plików, ale samowystarczalne feature foldery i łatwiejsze code reviews.

### ADR-017: `notFound()` w service'ach zamiast try/catch w RSC

**Status**: Accepted
**Decyzja**: service'y wywołują `notFound()` z `next/navigation` gdy rekord jest wymagany i go brakuje. RSC są chude — bez try/catch, tylko `await service.getBy*(...)`. Konwencja nazewnicza:

- `get*` — rzuca `notFound()` gdy brak (domyślny wariant dla RSC)
- `tryFind*` — zwraca `T | null` (dla miejsc gdzie brak jest prawidłowym stanem UI, np. rekomendacje)
- `findMany`, `findFirst` — listy, mogą zwracać puste

**Odrzucone**:

- try/catch w każdym RSC z `AppError('XXX_NOT_FOUND')` — rozsmarowane error handling, łamie DRY, każde page wymaga boilerplate
- Service zwracający zawsze `T | null`, RSC sam decyduje czy `notFound()` — szybko zapominasz zrobić if/null check, łatwo o `Cannot read property 'name' of null`

**Konsekwencje**:

- Service ma "magiczny" side-effect (specjalny error który Next.js przechwytuje) — mitigacja przez konwencję nazewnictwa `get*`
- Testowanie wymaga mocku `next/navigation` (sekcja 3.3)
- `AppError` używamy **tylko** dla błędów biznesowych (stock, auth), nie dla "rekord nie istnieje"

---

## 18. Otwarte pytania i ryzyka

### Otwarte do podjęcia decyzji w trakcie fazy 0/1

1. **Drawer vs osobna strona dla admin edit product** — start od stron, drawer później.
2. **UploadThing vs self-hosted obrazki** — w fazie 1 lokalne pliki w repo (ADR-011).
3. **Wishlist** — faza 3.
4. **Multi-warehouse / inventory locations** — w fazie 1 jeden globalny stock. Redesign w razie potrzeby.
5. **Wyszukiwarka tekstowa** — w fazie 1 tylko filtry URL-based. FTS (Postgres `tsvector` lub Meilisearch) — faza 3+.
6. **Dark mode** — Tailwind 4 + shadcn ma to OOTB. Decyzja w trakcie E5.

### Ryzyka

| Ryzyko                                                  | Mitygacja                                                                                          |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Solo dev → burn out na boilerplate                      | Generatory (Plop?) w razie potrzeby                                                                |
| Złe wczesne decyzje w error structure → trudny refactor | Sekcja 6 świadomie szczegółowa, testy chronią                                                      |
| Wydajność PLP z dużą liczbą wariantów                   | Indeksy DB; `unstable_cache`/`fetch` cache na poziomie repo w fazie 2 jeśli pomiar pokaże potrzebę |
| Race condition przy decrement stock                     | Transakcja Prismy + `SELECT FOR UPDATE` w `orderService.placeOrder`                                |
| Email-less reset hasła w fazie 1                        | Resend od fazy 1 — ADR-001                                                                         |
| Filtrowanie po `attributes` JSONB wolne                 | GIN index na konkretne klucze w fazie 2                                                            |
| Eksplozja kategorii i typów wariantów                   | Discriminated union w Zod (ADR-012) — dodanie kategorii = 1 schema + 1 case                        |

---

## 19. Następne kroki

### Tydzień 1 — fundament

1. **Dziś**: Zatwierdzenie tego dokumentu (commit do repo jako `ARCHITECTURE.md` w root).
2. **Setup repo na GitHubie**:
   - Utworzyć repo `deskgear` (private lub public — decyzja)
   - Dodać `ARCHITECTURE.md`, `README.md` (stub), `.gitignore`
   - Włączyć branch protection na `main` (ale jeszcze bez required checks — dodamy gdy będzie CI)
3. **Utworzyć GitHub Project**:
   - Kolumny: `Backlog`, `Ready`, `In progress`, `In review`, `Done`
   - Każdy bullet z sekcji 16 (E1-E8) = osobny Issue
   - Linkowanie do epików przez Issue labels: `epic-E1-init`, `epic-E2-db`, `epic-E3-auth` itd.
4. **Zacząć od E1.1** (init Next.js) — dosłownie jeden command.

### Tydzień 2 — Faza 0 → MVP foundation

5. **Skończyć E1-E4** — projekt zbootstrapowany, CI/CD zielone, lib core gotowy.
6. **Pierwszy deploy na Vercel** + Neon connection — chcemy mieć "działa w produkcji" jak najszybciej, nawet z pustą stroną.
7. **Pierwszy zewnętrzny PR** (np. dodanie dummy strony) → przejście pełnym CI pipelinem → merge.

### Tydzień 3-5 — Faza 1 (MVP)

8. **Iterować E5-E8** w kolejności. Każdy issue z DoD → PR → review (sam ze sobą, ale traktować poważnie) → merge.
9. **Aktualizować ten dokument** — przy każdej istotnej zmianie w kodzie, ten plik dostaje update w tym samym PR. Nowe ADR-y dopisujemy, otwarte pytania zamykamy lub przesuwamy.
10. **Tygodniowy retro**: co tydzień 15 min czytam ten plik i `git log`, zadaję pytanie: "Czy kod i dokument się zgadzają? Czy jakieś założenie się zmieniło?"

### Tydzień 6 — Gate Fazy 1 i przygotowanie Fazy 2

11. **Weryfikacja Gate Fazy 1** (lista w sekcji 16 na końcu fazy).
12. **Demo dla siebie**: nagrać 5-minutowy walkthrough — to dobre ćwiczenie pod rozmowy rekrutacyjne.
13. **Decyzje pre-Faza 2**: czy Neon preview branches OD RAZU w fazie 2, czy później; jak będzie wyglądał stepper checkout (jedno page vs sub-routes).
14. **Update tego dokumentu**: sekcja 16 → faza 2 z taskami w stylu E1-E8 jak teraz.

### Ciągły rytm pracy

- **Każdy PR**: aktualizacja `ARCHITECTURE.md` jeśli zmienia się architektura
- **Każda zmiana decyzji**: nowy ADR w sekcji 17 (append-only)
- **Każdy "ah, jednak"**: aktualizacja sekcji 18 (Ryzyka / Otwarte pytania)

> ⚠️ **Przypominajka**: ten dokument **musi** ewoluować z kodem. Plik zamrożony w lutym 2026 a kod na maju 2026 to **antywzorzec** — gorszy niż brak dokumentu, bo wprowadza w błąd.

---

## Glossary

Skróty i terminy używane w tym dokumencie:

| Skrót     | Pełna nazwa                              | Co oznacza                                                          |
| --------- | ---------------------------------------- | ------------------------------------------------------------------- |
| **PLP**   | Product Listing Page                     | Strona z listą produktów (`/shop`, kategorie)                       |
| **PDP**   | Product Detail Page                      | Strona pojedynczego produktu (`/shop/[slug]`)                       |
| **SKU**   | Stock Keeping Unit                       | Unikalny kod wariantu, np. `DG-KB-TKL-BROWN-BLACK`                  |
| **RSC**   | React Server Component                   | Komponent renderowany na serwerze                                   |
| **SA**    | Server Action                            | Funkcja `'use server'` wywoływana z klienta                         |
| **SSR**   | Server-Side Rendering                    | Renderowanie HTML na serwerze (różne od RSC)                        |
| **CSR**   | Client-Side Rendering                    | Renderowanie po stronie klienta                                     |
| **ISR**   | Incremental Static Regeneration          | Cache Next.js z regeneracją w tle                                   |
| **MVP**   | Minimum Viable Product                   | Najmniejsza wersja produktu pokrywająca core scope                  |
| **ADR**   | Architecture Decision Record             | Udokumentowana decyzja architektoniczna                             |
| **TTFB**  | Time To First Byte                       | Metryka wydajności                                                  |
| **CTA**   | Call To Action                           | Główny przycisk akcji                                               |
| **CRUD**  | Create / Read / Update / Delete          | Podstawowe operacje na danych                                       |
| **DTO**   | Data Transfer Object                     | Obiekt do przesyłania danych między warstwami                       |
| **YAGNI** | You Aren't Gonna Need It                 | Zasada: nie budujemy "na zapas"                                     |
| **RHF**   | React Hook Form                          | Biblioteka do formularzy                                            |
| **MFA**   | Multi-Factor Authentication              | Uwierzytelnianie wieloskładnikowe (faza 3+)                         |
| **MSW**   | Mock Service Worker                      | Biblioteka do mockowania HTTP w testach                             |
| **VAT**   | Value Added Tax                          | Podatek od towarów i usług (PL: faktura VAT)                        |
| **CQRS**  | Command Query Responsibility Segregation | Wzorzec rozdzielenia reads/writes (nie używany)                     |
| **EAV**   | Entity-Attribute-Value                   | Wzorzec przechowywania dynamicznych atrybutów (odrzucony — ADR-012) |
| **FTS**   | Full-Text Search                         | Wyszukiwanie pełnotekstowe (Postgres `tsvector`)                    |
| **GIN**   | Generalized Inverted Index               | Typ indeksu w PostgreSQL dla JSONB, FTS                             |
| **ERD**   | Entity-Relationship Diagram              | Diagram relacji między encjami w bazie                              |
| **DoD**   | Definition of Done                       | Kryteria zakończenia zadania                                        |
| **JSONB** | JSON Binary                              | Typ Postgres — JSON binarny, indeksowalny, dedup'owany              |
