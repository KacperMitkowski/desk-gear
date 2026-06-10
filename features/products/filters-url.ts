import { ROUTES } from "@/lib/routes"

import type { ProductSort } from "./schemas"

// Wartości filtrów w formie "płaskiej" — wspólny kontrakt dla budowania URL-a. Używane przez
// sidebar (client, `router.replace`) oraz paginację (server, `<Link>`), żeby logika składania
// query stringa żyła w jednym miejscu (single source of truth).
export type ProductFilterValues = {
  category?: string
  brand?: string
  priceMin?: number
  priceMax?: number
  inStock?: boolean
  sort?: ProductSort
  page?: number
}

// Buduje ścieżkę z query stringiem dla PLP (`/products`). Pomija wartości puste/domyślne, żeby URL
// był czysty (`/products?category=keyboards` zamiast `...&sort=newest&page=1`).
export function buildProductsQuery(values: ProductFilterValues): string {
  const params = new URLSearchParams()
  if (values.category) params.set("category", values.category)
  if (values.brand) params.set("brand", values.brand)
  if (values.priceMin !== undefined && !Number.isNaN(values.priceMin)) {
    params.set("priceMin", String(values.priceMin))
  }
  if (values.priceMax !== undefined && !Number.isNaN(values.priceMax)) {
    params.set("priceMax", String(values.priceMax))
  }
  if (values.inStock) params.set("inStock", "true")
  if (values.sort && values.sort !== "newest") params.set("sort", values.sort)
  if (values.page && values.page > 1) params.set("page", String(values.page))

  const qs = params.toString()
  return qs ? `${ROUTES.PRODUCTS}?${qs}` : ROUTES.PRODUCTS
}
