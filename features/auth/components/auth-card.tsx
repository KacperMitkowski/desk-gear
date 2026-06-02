import Link from "next/link"
import type { ReactNode } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { t } from "@/i18n/translate"

import { AuthCardTabs } from "./auth-card-tabs"

type AuthCardProps = {
  children: ReactNode
}

// Wspólna powłoka dla ekranów auth (login, rejestracja, w przyszłości reset hasła):
// branding + podtytuł, karta shadcn z przełącznikiem zakładek na górze oraz stopka.
// Renderowana raz w layoucie grupy (auth) — przy zmianie zakładki swapuje się tylko `children`
// (formularz), powłoka nie remountuje się, co eliminuje migotanie.
export function AuthCard({ children }: AuthCardProps) {
  return (
    // items-start (nie items-center): kotwiczymy kartę do góry, żeby różnica wysokości
    // formularzy login/rejestracja nie przesuwała jej w pionie przy zmianie zakładki.
    <section className="flex flex-1 items-start justify-center px-4 py-12">
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
            <AuthCardTabs />

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
