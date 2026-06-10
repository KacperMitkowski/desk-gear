import Link from "next/link"

import { Button } from "@/components/ui/button"
import { t } from "@/i18n/translate"

export const PAGINATION_SIZE = 12

type PaginationProps = {
  page: number
  pageCount: number
  buildHref: (page: number) => string
}

export function Pagination({ page, pageCount, buildHref }: PaginationProps) {
  if (pageCount <= 1) return null

  const isFirst = page <= 1
  const isLast = page >= pageCount

  return (
    <nav className="mt-8 flex items-center justify-center gap-4" aria-label={t("pagination.label")}>
      <Button asChild variant="outline" size="sm" disabled={isFirst}>
        <Link
          href={buildHref(page - 1)}
          aria-disabled={isFirst}
          tabIndex={isFirst ? -1 : undefined}
        >
          {t("pagination.prev")}
        </Link>
      </Button>
      <span className="text-sm text-muted-foreground">
        {t("pagination.status", { page, pageCount })}
      </span>
      <Button asChild variant="outline" size="sm" disabled={isLast}>
        <Link href={buildHref(page + 1)} aria-disabled={isLast} tabIndex={isLast ? -1 : undefined}>
          {t("pagination.next")}
        </Link>
      </Button>
    </nav>
  )
}
