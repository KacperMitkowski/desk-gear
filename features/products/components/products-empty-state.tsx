import { PackageSearch, X } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { t } from "@/i18n/translate"
import { ROUTES } from "@/lib/routes"

export function ProductsEmptyState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <PackageSearch className="size-6" />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-foreground">
        {t("products.list.emptyState.title")}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {t("products.list.emptyState.description")}
      </p>
      <Button asChild className="mt-6">
        <Link href={ROUTES.PRODUCTS}>
          <X />
          {t("products.list.filters.reset")}
        </Link>
      </Button>
    </div>
  )
}
