// Prisma 7 zastąpiło `url = env("DATABASE_URL")` w schemacie tym plikiem.
// CLI (migrate / db push / studio / seed) czyta connection string z `datasource.url`.
// Runtime PrismaClient dalej dostaje swój `PrismaPg` adapter w `lib/db/prisma.ts`.
//
// Używamy `@next/env` (a nie `dotenv`) żeby Prisma CLI widział TĘ SAMĄ hierarchię env files
// co `next dev`/`next build`: .env.local → .env.<env>.local → .env.<env> → .env.

import { loadEnvConfig } from "@next/env"
import { defineConfig } from "prisma/config"

loadEnvConfig(process.cwd())

// Prisma CLI używa DIRECT_DATABASE_URL (bez Neon poolera) — pooler nie wspiera
// session-level operations / advisory locks których migrate potrzebuje.
// Fallback do DATABASE_URL dla środowisk bez poolera (CI z lokalnym postgres-em).
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
})
