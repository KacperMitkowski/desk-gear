// Prisma 7 nie auto-loaduje env dla `db seed` — używamy @next/env żeby trzymać tę samą
// hierarchię (.env.local → .env.<env>.local → .env.<env> → .env) co Next.js i prisma.config.ts.
import { loadEnvConfig } from "@next/env"

loadEnvConfig(process.cwd())

async function main() {
  console.log("Seed stub — extend in task #7 (E2.4+) for products/users seed.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
