import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { t } from "@/i18n/translate"
import { ROUTES } from "@/lib/routes"

export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <span className="rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("pages.home.badge")}
      </span>
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
        {t("pages.home.title")}
      </h1>
      <p className="max-w-md text-muted-foreground">{t("pages.home.subtitle")}</p>
      <Button asChild size="lg">
        <Link href={ROUTES.PRODUCTS}>
          {t("pages.home.cta")}
          <ArrowRight />
        </Link>
      </Button>
    </section>
  )
}
