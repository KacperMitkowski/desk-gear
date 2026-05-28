// Prisma 7 nie auto-loaduje env dla `db seed` — używamy @next/env żeby trzymać tę samą
// hierarchię (.env.local → .env.<env>.local → .env.<env> → .env) co Next.js i prisma.config.ts.
import { loadEnvConfig } from "@next/env"

loadEnvConfig(process.cwd())

// Dynamic imports w main() — env.ts waliduje przy załadowaniu modułu (createEnv),
// więc moduł nie może być załadowany przed loadEnvConfig.
async function main() {
  const { hash } = await import("bcryptjs")
  const { env } = await import("@/env")
  const { prisma } = await import("@/lib/db/prisma")
  const { UserRole } = await import("@/lib/generated/prisma")

  try {
    if (!env.ADMIN_SEED_EMAIL || !env.ADMIN_SEED_PASSWORD) {
      console.log("ADMIN_SEED_EMAIL/PASSWORD nie ustawione — pomijam admin seed.")
      return
    }

    const passwordHash = await hash(env.ADMIN_SEED_PASSWORD, 12)
    const admin = await prisma.user.upsert({
      where: { email: env.ADMIN_SEED_EMAIL },
      update: { role: UserRole.ADMIN, passwordHash },
      create: { email: env.ADMIN_SEED_EMAIL, role: UserRole.ADMIN, passwordHash },
    })
    console.log(`Admin upserted: ${admin.email} (id=${admin.id})`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
