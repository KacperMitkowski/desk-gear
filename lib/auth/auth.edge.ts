import NextAuth from "next-auth"

import { authConfig } from "./auth.config"

// Edge-safe instancja NextAuth — tylko authConfig (bez PrismaAdapter / bcrypt).
// `auth` jest re-eksportowane jako `proxy` w proxy.ts.
export const { auth } = NextAuth(authConfig)
