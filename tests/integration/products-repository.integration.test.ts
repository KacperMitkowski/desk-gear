import { afterAll, describe, expect, it } from "vitest"

import { PAGINATION_SIZE } from "@/components/shared/pagination"
import { findMany, getFilterOptions } from "@/features/products/repositories/product.repository"
import { listProductsSchema } from "@/features/products/schemas"
import { prisma } from "@/lib/db/prisma"

// Integration test repozytorium — odpala się na realnej bazie z seedem (prisma/seed.ts, faker.seed(42)).
// Nie mockujemy Prismy: sprawdzamy faktyczne where/orderBy/paginację + mapowanie Decimal → string.
function filters(overrides: Record<string, unknown> = {}) {
  return listProductsSchema.parse(overrides)
}

afterAll(async () => {
  await prisma.$disconnect()
})

describe("product.repository.findMany (real DB + seed)", () => {
  it("bez filtrów: max PAGE_SIZE pozycji, total = liczba aktywnych produktów", async () => {
    const { items, total } = await findMany(filters())
    const activeCount = await prisma.product.count({ where: { isActive: true } })

    expect(total).toBe(activeCount)
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThanOrEqual(PAGINATION_SIZE)
    // Decimal zmapowany na string X.YY (Money), nie wycieka Prisma.Decimal.
    for (const item of items) {
      expect(item.priceFrom).toMatch(/^\d+\.\d{2}$/)
    }
  })

  it("po kategorii: total = liczba aktywnych produktów w tej kategorii", async () => {
    const slug = "keyboards"
    const { total } = await findMany(filters({ category: slug }))
    const expected = await prisma.product.count({
      where: { isActive: true, category: { slug } },
    })

    expect(expected).toBeGreaterThan(0)
    expect(total).toBe(expected)
  })

  it("przedział cen: total zgodny z liczbą produktów mających wariant w przedziale", async () => {
    const priceMin = 200
    const priceMax = 600
    const { items, total } = await findMany(filters({ priceMin, priceMax }))
    const expected = await prisma.product.count({
      where: {
        isActive: true,
        variants: { some: { priceGross: { gte: priceMin, lte: priceMax } } },
      },
    })

    expect(total).toBe(expected)
    expect(items.length).toBeLessThanOrEqual(PAGINATION_SIZE)
  })

  it("paginacja: strona 2 rozłączna ze stroną 1, total identyczny", async () => {
    const page1 = await findMany(filters({ page: 1 }))

    if (page1.total <= PAGINATION_SIZE) {
      // Za mało danych na drugą stronę — weryfikujemy tylko spójność strony 1.
      expect(page1.items.length).toBe(page1.total)
      return
    }

    const page2 = await findMany(filters({ page: 2 }))
    expect(page2.total).toBe(page1.total)

    const idsOnPage1 = new Set(page1.items.map((i) => i.id))
    for (const item of page2.items) {
      expect(idsOnPage1.has(item.id)).toBe(false)
    }
  })

  it("sortowanie price-asc: priceFrom rosnąco w obrębie strony", async () => {
    const { items } = await findMany(filters({ sort: "price-asc" }))
    const prices = items.map((i) => Number(i.priceFrom))
    const sorted = [...prices].sort((a, b) => a - b)
    expect(prices).toEqual(sorted)
  })

  it("pusty wynik: nieistniejąca kategoria → items=[] total=0", async () => {
    const { items, total } = await findMany(filters({ category: "nieistnieje-xyz" }))
    expect(items).toEqual([])
    expect(total).toBe(0)
  })
})

describe("product.repository.getFilterOptions (real DB + seed)", () => {
  it("zwraca kategorie-liście z produktami oraz listę marek", async () => {
    const { categories, brands } = await getFilterOptions()

    expect(categories.length).toBeGreaterThan(0)
    expect(brands.length).toBeGreaterThan(0)
    expect(categories.some((c) => c.slug === "keyboards")).toBe(true)
  })
})
