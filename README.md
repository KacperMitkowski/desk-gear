This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Database setup

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
| `npm run db:generate`       | regeneruje Prisma client (po zmianie `schema.prisma`)             |
| `npm run db:migrate`        | tworzy + aplikuje nową migrację (`prisma migrate dev --name ...`) |
| `npm run db:migrate:deploy` | aplikuje istniejące migracje (CI / prod)                          |
| `npm run db:studio`         | przeglądarka tabel (GUI)                                          |
| `npm run db:seed`           | uruchamia `prisma/seed.ts`                                        |

### Konwencje schematu

- **ID**: `String @id @default(uuid(7)) @db.Uuid` — UUID v7 (sortable, native uuid w PG).
- **DateTime**: `@db.Timestamptz(6)` — timezone-aware, μs precyzja.
- **Email**: `@db.Citext` — case-insensitive (wymaga extension `citext`, auto-tworzona przez Prismę).
- **Naming**: camelCase w Prismie, snake_case w DB (przez `@map` / `@@map`). Wyjątek: Auth.js Prisma adapter-required fields (`refresh_token`, `access_token` itd.) zostają snake_case w Prismie.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
