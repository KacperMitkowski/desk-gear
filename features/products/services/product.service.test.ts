import { beforeEach, describe, expect, it, vi } from "vitest"

// Mockujemy repo factory-em (bez importu realnego modułu), żeby nie ciągnąć Prismy/env do testu
// jednostkowego — sprawdzamy tylko orkiestrację serwisu.
vi.mock("../repositories/product.repository", () => ({
  findMany: vi.fn(),
  getFilterOptions: vi.fn(),
}))

import * as productRepository from "../repositories/product.repository"
import { listProductsSchema, type ListProductsFilters } from "../schemas"
import { listProducts } from "./product.service"

const mockFindMany = vi.mocked(productRepository.findMany)

function filters(overrides: Record<string, unknown> = {}): ListProductsFilters {
  return listProductsSchema.parse(overrides)
}

describe("listProducts", () => {
  beforeEach(() => mockFindMany.mockReset())

  it("liczy pageCount z total i rozmiaru strony (12)", async () => {
    mockFindMany.mockResolvedValue({ items: [], total: 25 })

    const result = await listProducts(filters({ page: 2 }))

    expect(result.pageCount).toBe(3) // ceil(25 / 12)
    expect(result.page).toBe(2)
    expect(result.total).toBe(25)
  })

  it("zwraca pageCount = 1 dla pustego wyniku (Math.max)", async () => {
    mockFindMany.mockResolvedValue({ items: [], total: 0 })

    const result = await listProducts(filters())

    expect(result.pageCount).toBe(1)
    expect(result.items).toEqual([])
  })

  it("przekazuje filtry do repozytorium bez modyfikacji i forwarduje items", async () => {
    const items = [{ id: "p1" }] as unknown as Awaited<
      ReturnType<typeof productRepository.findMany>
    >["items"]
    mockFindMany.mockResolvedValue({ items, total: 1 })

    const f = filters({ category: "keyboards", sort: "price-asc" })
    const result = await listProducts(f)

    expect(mockFindMany).toHaveBeenCalledWith(f)
    expect(result.items).toBe(items)
  })
})
