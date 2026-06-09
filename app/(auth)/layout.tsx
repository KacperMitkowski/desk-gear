import type { ReactNode } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { AuthFooter } from "@/features/auth/components/auth-footer"
import { AuthHeader } from "@/features/auth/components/auth-header"

// Dekoracja grupy (auth) — wyśrodkowana karta z nagłówkiem/stopką auth. Wspólny chrome
// (SiteHeader/main/SiteFooter) żyje w root app/layout.tsx, więc tutaj zwykły <div>, nie <main>
// (zagnieżdżony <main> byłby niepoprawnym HTML-em).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center px-4 py-12">
      <div className="w-full max-w-[520px]">
        <AuthHeader />

        <Card>
          <CardContent className="flex flex-col gap-6">{children}</CardContent>
        </Card>

        <AuthFooter />
      </div>
    </div>
  )
}
