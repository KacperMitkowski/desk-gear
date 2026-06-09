import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@/lib/generated/prisma"
import { toMoney, type Money } from "@/lib/money/types"

import { PRODUCTS_PAGE_SIZE, type ListProductsFilters } from "../schemas"

// DTO pod kartę produktu (PLP). Repozytorium mapuje `Prisma.Decimal` → `Money` (string) tutaj,
// żeby surowy Decimal nie wyciekał do warstwy UI (RSC/komponenty serializują tylko prymitywy).
export type ProductListItem = {
  id: string
  slug: string
  name: string
  brand: string | null
  isFeatured: boolean
  primaryImage: { path: string; alt: string } | null
  priceFrom: Money // min(priceGross) ze wszystkich wariantów produktu ("cena od")
  inStock: boolean // czy jakikolwiek wariant ma stockQuantity > 0
}

// Kształt produktu zaciąganego z DB (where + include) — wspólny dla obu ścieżek sortowania.
type ProductRow = Prisma.ProductGetPayload<{
  include: {
    images: { where: { isPrimary: true }; take: 1 }
    variants: { select: { priceGross: true; stockQuantity: true } }
  }
}>

// Buduje filtr na wariantach: cena (gte/lte) + dostępność. Łączymy w jeden `some`, żeby TEN SAM
// wariant spełniał oba warunki ("pokaż produkty mające dostępny wariant w tym przedziale cen").
function buildVariantFilter(
  filters: ListProductsFilters,
): Prisma.ProductVariantWhereInput | undefined {
  const variant: Prisma.ProductVariantWhereInput = {}
  const price: Prisma.DecimalFilter = {}
  if (filters.priceMin !== undefined) price.gte = filters.priceMin
  if (filters.priceMax !== undefined) price.lte = filters.priceMax
  if (Object.keys(price).length > 0) variant.priceGross = price
  if (filters.inStock) variant.stockQuantity = { gt: 0 }
  return Object.keys(variant).length > 0 ? variant : undefined
}

function buildWhere(filters: ListProductsFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { isActive: true }
  if (filters.category) where.category = { slug: filters.category }
  if (filters.brand) where.brand = filters.brand
  const variantFilter = buildVariantFilter(filters)
  if (variantFilter) where.variants = { some: variantFilter }
  return where
}

function toListItem(p: ProductRow): ProductListItem {
  const primary = p.images[0] ?? null
  // "Cena od" = najtańszy wariant. Porównujemy po Number (ceny mają 2 miejsca, bezpieczne),
  // a do `toMoney` przekazujemy Decimal (canonical X.YY). Produkt bez wariantów nie powinien
  // istnieć w seedzie, ale zabezpieczamy się przed reduce na pustej tablicy.
  const cheapest = p.variants.reduce<ProductRow["variants"][number] | null>((min, v) => {
    if (!min) return v
    return Number(v.priceGross) < Number(min.priceGross) ? v : min
  }, null)

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    isFeatured: p.isFeatured,
    primaryImage: primary ? { path: primary.path, alt: primary.alt } : null,
    priceFrom: cheapest ? toMoney(cheapest.priceGross) : toMoney("0.00"),
    inStock: p.variants.some((v) => v.stockQuantity > 0),
  }
}

const INCLUDE = {
  images: { where: { isPrimary: true }, take: 1 },
  variants: { select: { priceGross: true, stockQuantity: true } },
} satisfies Prisma.ProductInclude

export async function findMany(
  filters: ListProductsFilters,
): Promise<{ items: ProductListItem[]; total: number }> {
  const where = buildWhere(filters)
  const skip = (filters.page - 1) * PRODUCTS_PAGE_SIZE

  // Sortowanie po cenie "od" nie ma prostej kolumny w DB (to min z wariantów), więc dla `price-*`
  // pobieramy wszystkie pasujące produkty, liczymy `priceFrom` i sortujemy/stronicujemy w pamięci.
  // Dla `newest` używamy natywnego `orderBy` + skip/take (wydajne).
  // TODO(perf): przy dużym wolumenie przejść na SQL agregat (min(price_gross)) lub kolumnę
  // wyliczaną — przy obecnym seedzie (kilkadziesiąt produktów) in-memory sort jest akceptowalny.
  if (filters.sort === "newest") {
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: INCLUDE,
        orderBy: { createdAt: "desc" },
        skip,
        take: PRODUCTS_PAGE_SIZE,
      }),
      prisma.product.count({ where }),
    ])
    return { items: rows.map(toListItem), total }
  }

  const rows = await prisma.product.findMany({ where, include: INCLUDE })
  const items = rows.map(toListItem)
  items.sort((a, b) =>
    filters.sort === "price-asc"
      ? Number(a.priceFrom) - Number(b.priceFrom)
      : Number(b.priceFrom) - Number(a.priceFrom),
  )
  return { items: items.slice(skip, skip + PRODUCTS_PAGE_SIZE), total: items.length }
}

// Opcje do sidebara filtrów: kategorie-liście, które mają aktywne produkty, oraz lista marek.
// Liczone osobno od listy produktów (nie zależą od aktualnych filtrów — to pełen słownik wyboru).
export async function getFilterOptions(): Promise<{
  categories: { slug: string; name: string }[]
  brands: string[]
}> {
  const [categories, brandRows] = await Promise.all([
    prisma.category.findMany({
      where: { products: { some: { isActive: true } } },
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { isActive: true, brand: { not: null } },
      select: { brand: true },
      distinct: ["brand"],
      orderBy: { brand: "asc" },
    }),
  ])

  return {
    categories,
    brands: brandRows.map((row) => row.brand).filter((b): b is string => b !== null),
  }
}
