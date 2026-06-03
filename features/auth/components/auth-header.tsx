"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { t } from "@/i18n/translate"
import { ROUTES } from "@/lib/routes"

// Subtitle zależy od aktywnej zakładki. Pathname dostajemy z hooka, więc komponent musi być
// "use client" (parallelnie do AuthCardTabs, który już to robi). Powłoka AuthShell żyje w layoucie
// grupy (auth) i nie remountuje się — zmiana subtitle przy przełączeniu /login ↔ /register
// dzieje się przez prosty re-render.
export function AuthHeader() {
  const pathname = usePathname()
  const isRegister = pathname?.startsWith(ROUTES.REGISTER) ?? false
  const subtitle = isRegister ? t("auth.register.subtitle") : t("auth.login.subtitle")

  return (
    <div className="mb-8 text-center">
      <Link
        href={ROUTES.HOME}
        className="inline-flex items-baseline justify-center gap-2 text-2xl font-extrabold tracking-tight"
      >
        <span className="text-primary">▮</span>
        <span>DESKGEAR</span>
      </Link>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  )
}
