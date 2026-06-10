import Link from "next/link"

import { Button } from "@/components/ui/button"
import { t } from "@/i18n/translate"
import { ROUTES } from "@/lib/routes"

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col items-center justify-center gap-5 px-6 py-24 text-center">
      <p className="text-7xl font-extrabold leading-none tracking-tight text-primary">404</p>
      <h1 className="text-2xl font-bold tracking-tight">{t("pages.notFound.title")}</h1>
      <p className="max-w-md text-muted-foreground">{t("pages.notFound.subtitle")}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href={ROUTES.HOME}>{t("pages.notFound.home")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={ROUTES.PRODUCTS}>{t("pages.notFound.products")}</Link>
        </Button>
      </div>
    </section>
  )
}
