import { PrismaPg } from "@prisma/adapter-pg"

import { env } from "@/env"
import { PrismaClient } from "@/lib/generated/prisma/client"

// pg/pg-connection-string ostrzega, że sslmode 'prefer'/'require'/'verify-ca' to dziś aliasy
// 'verify-full', a w przyszłym majorze (pg v9) przyjmą słabszą semantykę libpq. Normalizujemy je
// do jawnego 'verify-full', żeby: (1) zachować OBECNE (ściślejsze) zachowanie po aktualizacji pg —
// bez cichej zmiany semantyki SSL, (2) uciszyć SECURITY WARNING (pojawia się w dev overlay przy
// pierwszym zapytaniu do DB). Jeśli kiedyś potrzebna będzie luźniejsza semantyka (encrypt bez
// weryfikacji certu), użyć w URL `uselibpqcompat=true&sslmode=require`.
function normalizeSslMode(connectionString: string): string {
  return connectionString.replace(/([?&]sslmode=)(prefer|require|verify-ca)\b/i, "$1verify-full")
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

const adapter = new PrismaPg({ connectionString: normalizeSslMode(env.DATABASE_URL) })

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
