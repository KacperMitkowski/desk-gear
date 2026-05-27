import type { NextAuthConfig } from "next-auth"

// Edge-safe config — bez PrismaAdapter, bez bcryptjs.
// Używane przez proxy.ts (edge runtime). Pełna config z DB jest w ./auth.ts (Node runtime).
export const authConfig = {
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user
      const path = request.nextUrl.pathname
      if (path.startsWith("/admin") || path.startsWith("/account")) return isLoggedIn
      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
