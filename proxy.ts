import NextAuth from "next-auth"

import { authConfig } from "@/lib/auth/auth.config"

// Next.js 16: `middleware.ts` zostało przemianowane na `proxy.ts`.
// Używamy WYŁĄCZNIE `authConfig` (edge-safe, bez Prisma) — JWT walidacja jest kryptograficzna,
// nie potrzebuje DB. Pełna config z Prisma adapter siedzi w `@/lib/auth/auth`.
export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
}
