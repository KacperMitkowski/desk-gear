import { ProductCard } from "@/components/shared/product-card"
import { t } from "@/i18n/translate"
import { FilterSidebar } from "@/features/products/components/filter-sidebar"
import { ProductsEmptyState } from "@/features/products/components/products-empty-state"
import { ProductsSort } from "@/features/products/components/products-sort"
import { listProductsSchema } from "@/features/products/schemas"
import { listProducts, getProductFilterOptions } from "@/features/products/services/product.service"
import { Pagination } from "@/components/shared/pagination"
import { buildProductsQuery } from "@/features/products/filters-url"
import { firstValue, type SearchParams } from "@/lib/url/search-params"

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
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

      <div className="flex flex-col gap-8 md:flex-row md:items-start">
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

        <section className="min-w-0 flex-1 xl:w-[960px] xl:flex-none">
          {items.length === 0 ? (
            <ProductsEmptyState />
          ) : (
            <>
              <div className="mb-5 flex items-center justify-end border-b pb-4">
                <ProductsSort current={filters.sort} filters={filters} />
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}
          <Pagination
            page={page}
            pageCount={pageCount}
            buildHref={(target) => buildProductsQuery({ ...filters, page: target })}
          />
        </section>
      </div>
    </div>
  )
}
