import Link from "next/link"
import type { ReactNode } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control"
import { t } from "@/i18n/translate"

type AuthTab = "login" | "register"

type AuthCardProps = {
  /** Która zakładka jest aktywna — podświetla przełącznik i ustawia nagłówek a11y. */
  activeTab: AuthTab
  children: ReactNode
}

// Wspólna powłoka dla ekranów auth (login, w przyszłości rejestracja, reset hasła):
// branding + podtytuł, karta shadcn z przełącznikiem zakładek na górze oraz stopka.
// Reużywalna — strony dokładają tylko swoją treść jako children.
export function AuthCard({ activeTab, children }: AuthCardProps) {
  return (
    <section className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-[520px]">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-baseline justify-center gap-2 text-2xl font-extrabold tracking-tight"
          >
            <span className="text-primary">▮</span>
            <span>DESKGEAR</span>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth.subtitle")}</p>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-6">
            <h1 className="sr-only">
              {activeTab === "login" ? t("auth.tabs.signIn") : t("auth.tabs.createAccount")}
            </h1>

            <SegmentedControl>
              <SegmentedControlItem asChild active={activeTab === "login"}>
                <Link href="/login">{t("auth.tabs.signIn")}</Link>
              </SegmentedControlItem>
              <SegmentedControlItem asChild active={activeTab === "register"}>
                <Link href="/register">{t("auth.tabs.createAccount")}</Link>
              </SegmentedControlItem>
            </SegmentedControl>

            {children}
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          {t("auth.footer.prefix")}{" "}
          <Link
            href="/terms"
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            {t("auth.footer.terms")}
          </Link>{" "}
          {t("auth.footer.middle")}{" "}
          <Link
            href="/privacy"
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            {t("auth.footer.privacy")}
          </Link>
        </p>
      </div>
    </section>
  )
}
