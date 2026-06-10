import { ImageOff } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { t } from "@/i18n/translate"
import type { ProductListItem } from "@/features/products/repositories/product.repository"
import { formatMoney } from "@/lib/money/format"

export function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex w-full flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-foreground/20"
    >
      <div className="relative h-64 overflow-hidden bg-muted">
        {product.primaryImage ? (
          <Image
            src={product.primaryImage.path}
            alt={product.primaryImage.alt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 320px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground"
            aria-label={t("products.list.imagePlaceholder")}
          >
            <ImageOff className="size-8" />
          </div>
        )}

        {product.isFeatured && (
          <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
            {t("products.list.bestseller")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="line-clamp-1 min-h-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {product.brand ?? ""}
        </p>
        <h3 className="line-clamp-2 min-h-[3rem] text-base font-medium text-foreground">
          {product.name}
        </h3>
        <p className="mt-auto pt-2 text-lg font-semibold text-foreground">
          {t("products.list.priceFrom", { price: formatMoney(product.priceFrom) })}
        </p>
      </div>
    </Link>
  )
}
