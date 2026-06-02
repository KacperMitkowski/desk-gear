import type { ReactNode } from "react"

import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { AuthCard } from "@/features/auth/components/auth-card"

// AuthCard (branding, przełącznik zakładek, stopka) żyje w layoucie grupy — Next zachowuje
// instancję layoutu przy nawigacji /login ↔ /register, więc powłoka się nie remountuje.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <AuthCard>{children}</AuthCard>
      </main>
      <SiteFooter />
    </>
  )
}
