"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control"
import { t } from "@/i18n/translate"

export function AuthCardTabs() {
  const pathname = usePathname()
  const isRegister = pathname?.startsWith("/register") ?? false

  return (
    <SegmentedControl>
      <SegmentedControlItem asChild active={!isRegister}>
        {isRegister ? (
          <Link href="/login">{t("auth.tabs.signIn")}</Link>
        ) : (
          <span className="cursor-default">{t("auth.tabs.signIn")}</span>
        )}
      </SegmentedControlItem>
      <SegmentedControlItem asChild active={isRegister}>
        {isRegister ? (
          <span className="cursor-default">{t("auth.tabs.createAccount")}</span>
        ) : (
          <Link href="/register">{t("auth.tabs.createAccount")}</Link>
        )}
      </SegmentedControlItem>
    </SegmentedControl>
  )
}
