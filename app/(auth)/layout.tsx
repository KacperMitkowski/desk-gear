import type { ReactNode } from "react"

import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { Card, CardContent } from "@/components/ui/card"
import { AuthFooter } from "@/features/auth/components/auth-footer"
import { AuthHeader } from "@/features/auth/components/auth-header"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex justify-center px-4 py-12">
        <div className="w-full max-w-[520px]">
          <AuthHeader />

          <Card>
            <CardContent className="flex flex-col gap-6">{children}</CardContent>
          </Card>

          <AuthFooter />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
