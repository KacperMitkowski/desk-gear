# DeskGear

Sklep z akcesoriami biurkowymi — Next.js 16 + Prisma 7 + Auth.js v5 + PostgreSQL (Neon).

**Production**: https://&lt;projekt&gt;.vercel.app _(uzupełnij URL po pierwszym deploy)_

## Database setup (local dev)

Projekt używa **Neon** (managed PostgreSQL 17) dla dev/preview/prod. Lokalny development korzysta z **Neon dev branch** (separate od `main` branch, żeby nie psuć prod-data). CI używa `services: postgres:17` w GitHub Actions.

### Pierwsza konfiguracja

1. **Utwórz konto na Neon** → [console.neon.tech](https://console.neon.tech).
2. **Stwórz nowy projekt** w regionie `eu-central-1` (Frankfurt — najbliższy Warszawie).
3. **Stwórz dev branch**: w Neon dashboard → `Branches` → `New branch` (default `main` zostaje pod produkcję).
4. W Neon UI → dev branch → **Connection Details** skopiuj **dwa** connection stringi:
   - **Pooled connection** (toggle ON, suffix `-pooler` w hoście) → `DATABASE_URL` (runtime aplikacji).
   - **Direct connection** (toggle OFF, bez `-pooler`) → `DIRECT_DATABASE_URL` (Prisma CLI: migrate / studio).

   Pooler nie wspiera session-level operations których `prisma migrate` potrzebuje — stąd dwa osobne URL-e.

5. Skopiuj `.env.example` → `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
6. Wypełnij `.env.local`:
   ```env
   DATABASE_URL=<pooled-connection-string-z-neona>
   DIRECT_DATABASE_URL=<direct-connection-string-z-neona>
   AUTH_SECRET=<openssl rand -base64 32>
   AUTH_URL=http://localhost:3000
   NODE_ENV=development
   ```
7. Zaaplikuj migracje + wygeneruj klienta:
   ```bash
   npm run db:migrate    # uruchamia `prisma migrate dev`, tworzy też extension `citext`
   ```
8. (Opcjonalnie) Przejrzyj tabele:
   ```bash
   npm run db:studio     # otwiera Prisma Studio na http://localhost:5555
   ```

### Codzienne komendy

| Komenda                     | Co robi                                                           |
| --------------------------- | ----------------------------------------------------------------- |
| `npm run dev`               | dev server na http://localhost:3000                               |
| `npm run db:generate`       | regeneruje Prisma client (po zmianie `schema.prisma`)             |
| `npm run db:migrate`        | tworzy + aplikuje nową migrację (`prisma migrate dev --name ...`) |
| `npm run db:migrate:deploy` | aplikuje istniejące migracje (CI / prod)                          |
| `npm run db:studio`         | przeglądarka tabel (GUI)                                          |
| `npm run db:seed`           | uruchamia `prisma/seed.ts`                                        |
| `npm run test`              | wszystkie testy (unit + integration)                              |
| `npm run test:e2e`          | testy Playwright                                                  |
| `npm run typecheck`         | TypeScript bez emit                                               |
| `npm run lint`              | ESLint                                                            |

### Konwencje schematu

- **ID**: `String @id @default(uuid(7)) @db.Uuid` — UUID v7 (sortable, native uuid w PG).
- **DateTime**: `@db.Timestamptz(6)` — timezone-aware, μs precyzja.
- **Email**: `@db.Citext` — case-insensitive (wymaga extension `citext`, auto-tworzona przez Prismę).
- **Naming**: camelCase w Prismie, snake_case w DB (przez `@map` / `@@map`). Wyjątek: Auth.js Prisma adapter-required fields (`refresh_token`, `access_token` itd.) zostają snake_case w Prismie.

## Production deployment (Vercel + Neon)

Production hostuje się na **Vercel** (Hobby tier), DB to **Neon `main` branch** w regionie `eu-central-1` (Frankfurt). Architektura w `ARCHITECTURE.md` sekcja 15.

### Pipeline buildu

Vercel po każdym push do `main` uruchamia:

```
npm ci                              # install deps
  └── postinstall: prisma generate  # generuje Prisma client (package.json)
build:
  ├── prisma migrate deploy         # aplikuje pending migracje na Neon main
  └── next build                    # build aplikacji Next.js
```

Migracje wjeżdżają automatycznie przy każdym deploy. Brak migracji do zaaplikowania = no-op.

### Pierwsza konfiguracja

1. **Połącz repo z Vercel**:
   - Vercel Dashboard → **New Project** → import GitHub repo `desk-gear`
   - Framework preset: **Next.js** (auto-wykrywany)
   - Region: **Frankfurt (fra1)**

2. **Skonfiguruj env vars** (Settings → Environment Variables, Environment: **Production**):

   | Zmienna               | Wartość                                                               |
   | --------------------- | --------------------------------------------------------------------- |
   | `DATABASE_URL`        | Neon `main` branch **pooled** (`-pooler` w hoście)                    |
   | `DIRECT_DATABASE_URL` | Neon `main` branch **direct** (bez `-pooler`) — dla `prisma migrate`  |
   | `AUTH_SECRET`         | `openssl rand -base64 32` (min. 32 znaki)                             |
   | `AUTH_URL`            | `https://<projekt>.vercel.app` (uzupełnij po pierwszym deploy)        |
   | `ADMIN_SEED_EMAIL`    | email admina (opcjonalne — tylko na czas pierwszego seedu)            |
   | `ADMIN_SEED_PASSWORD` | silne hasło ≥ 12 znaków (opcjonalne — tylko na czas pierwszego seedu) |

   `ADMIN_SEED_EMAIL` i `ADMIN_SEED_PASSWORD` muszą być ustawione razem (env.ts to wymusza).

3. **Pierwszy deploy** — Vercel triggeruje się automatycznie po push do `main`. Sprawdź logi:
   - `prisma migrate deploy` zaaplikował migracje na Neon
   - `next build` zielony
   - Deployment opublikowany pod `https://<projekt>.vercel.app`

4. **Seed produkcji (jednorazowo)** — uruchom **lokalnie** z prod credentialami w env:

   ```powershell
   $env:DATABASE_URL = "<prod-pooled>"
   $env:DIRECT_DATABASE_URL = "<prod-direct>"
   $env:ADMIN_SEED_EMAIL = "<email>"
   $env:ADMIN_SEED_PASSWORD = "<password>"
   $env:AUTH_SECRET = "<dowolny-32-char>"  # wymagany przez env.ts walidację, niewykorzystywany przez seed
   $env:AUTH_URL = "https://<projekt>.vercel.app"
   npx prisma db seed
   ```

   Seed jest **idempotentny** (`upsert`) — bezpiecznie można uruchomić wielokrotnie.

5. **Test ręczny**:
   - `https://<projekt>.vercel.app/login` → zaloguj jako admin z seeda
   - Po sukcesie redirect na `/account`, email admina widoczny
   - Klik **Wyloguj się** → redirect na `/login`, sesja usunięta

6. **Cleanup po seedingu** (security): po pierwszym logowaniu admina (i ewentualnej zmianie hasła) **usuń `ADMIN_SEED_PASSWORD` z Vercel env**. Hash zostaje w DB; plaintext w panelu Vercela już niepotrzebny.

### Vercel Speed Insights (opcjonalnie)

Włącz w Vercel Dashboard → Project → **Speed Insights** żeby śledzić Core Web Vitals w produkcji. Alternatywnie Chrome DevTools → Lighthouse, target: **Performance ≥ 90** na `/` i `/login`.
