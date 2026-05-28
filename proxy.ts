// Next.js 16: `middleware.ts` zostało przemianowane na `proxy.ts`.
// `auth` (edge-safe, bez Prisma) inicjalizowane w `@/lib/auth/auth.edge` i re-eksportowane
// jako `proxy`. Cross-module re-export to forma, którą statyczna analiza Next.js rozpoznaje
// jako eksport funkcji — inline `export const { auth: proxy } = NextAuth(...)` jest widziane
// jako stała/obiekt i build się wywala.
export { auth as proxy } from "@/lib/auth/auth.edge"

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
}
