"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control"
import { t } from "@/i18n/translate"

// Przełącznik login ↔ rejestracja. Aktywną zakładkę wyznacza z pathname, dzięki czemu powłoka
// AuthCard może żyć w layoucie grupy (auth) i nie remountować się przy zmianie zakładki — to
// eliminuje migotanie treści. Renderuje też nagłówek a11y zależny od aktywnego ekranu.
export function AuthCardTabs() {
  const pathname = usePathname()
  const isRegister = pathname?.startsWith("/register") ?? false

  return (
    <>
      <h1 className="sr-only">
        {isRegister ? t("auth.tabs.createAccount") : t("auth.tabs.signIn")}
      </h1>

      <SegmentedControl>
        <SegmentedControlItem asChild active={!isRegister}>
          <Link href="/login">{t("auth.tabs.signIn")}</Link>
        </SegmentedControlItem>
        <SegmentedControlItem asChild active={isRegister}>
          <Link href="/register">{t("auth.tabs.createAccount")}</Link>
        </SegmentedControlItem>
      </SegmentedControl>
    </>
  )
}
