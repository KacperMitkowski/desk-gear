import Link from "next/link"

import { ProductCard } from "@/components/shared/product-card"
import { Button } from "@/components/ui/button"
import { t } from "@/i18n/translate"
import { FilterSidebar } from "@/features/products/components/filter-sidebar"
import { buildProductsQuery } from "@/features/products/filters-url"
import { listProductsSchema } from "@/features/products/schemas"
import { listProducts, getProductFilterOptions } from "@/features/products/services/product.service"

type SearchParams = Record<string, string | string[] | undefined>

// searchParams przychodzą jako `string | string[]` — bierzemy pierwszą wartość (PLP nie obsługuje
// powtórzonych parametrów). Schema potem waliduje/koercjuje (z `.catch` na śmieci).
function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

// PLP pod `/`. RSC woła serwis bezpośrednio (read, bez Server Action). Zmiana filtra → URL →
// re-render tej strony → odświeżona lista.
export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams
  const filters = listProductsSchema.parse({
    category: firstValue(raw.category),
    brand: firstValue(raw.brand),
    priceMin: firstValue(raw.priceMin),
    priceMax: firstValue(raw.priceMax),
    inStock: firstValue(raw.inStock),
    page: firstValue(raw.page),
    sort: firstValue(raw.sort),
  })

  const [{ items, total, page, pageCount }, options] = await Promise.all([
    listProducts(filters),
    getProductFilterOptions(),
  ])

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("products.list.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("products.list.results", { total })}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr]">
        <FilterSidebar
          categories={options.categories}
          brands={options.brands}
          current={{
            category: filters.category,
            brand: filters.brand,
            priceMin: filters.priceMin,
            priceMax: filters.priceMax,
            inStock: filters.inStock,
            sort: filters.sort,
          }}
        />

        <section>
          {items.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">{t("products.list.empty")}</p>
          ) : (
            <div className="flex flex-wrap gap-6">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <Pagination filters={filters} page={page} pageCount={pageCount} />
        </section>
      </div>
    </div>
  )
}

// Paginacja server-side: linki zmieniają tylko `page`, zachowując pozostałe filtry. Klik = nawigacja
// = re-render RSC. Renderujemy tylko gdy jest więcej niż jedna strona.
function Pagination({
  filters,
  page,
  pageCount,
}: {
  filters: Parameters<typeof buildProductsQuery>[0]
  page: number
  pageCount: number
}) {
  if (pageCount <= 1) return null

  const prevHref = buildProductsQuery({ ...filters, page: page - 1 })
  const nextHref = buildProductsQuery({ ...filters, page: page + 1 })

  return (
    <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Paginacja">
      <Button asChild variant="outline" size="sm" disabled={page <= 1}>
        <Link href={prevHref} aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined}>
          {t("products.list.pagination.prev")}
        </Link>
      </Button>
      <span className="text-sm text-muted-foreground">
        {t("products.list.pagination.status", { page, pageCount })}
      </span>
      <Button asChild variant="outline" size="sm" disabled={page >= pageCount}>
        <Link
          href={nextHref}
          aria-disabled={page >= pageCount}
          tabIndex={page >= pageCount ? -1 : undefined}
        >
          {t("products.list.pagination.next")}
        </Link>
      </Button>
    </nav>
  )
}
