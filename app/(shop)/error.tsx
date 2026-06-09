"use client"

import { Button } from "@/components/ui/button"
import { t } from "@/i18n/translate"

// Error boundary PLP. RSC może rzucić (np. błąd DB) — pokazujemy komunikat i pozwalamy ponowić
// render przez `reset()`.
export default function ShopError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-4 px-6 py-24 text-center">
      <h2 className="text-lg font-semibold">{t("errors.unexpected")}</h2>
      <Button onClick={reset} variant="outline">
        {t("products.list.retry")}
      </Button>
    </div>
  )
}
