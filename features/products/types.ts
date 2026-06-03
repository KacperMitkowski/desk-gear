// Re-eksport modeli z Prismy w jednym miejscu — konsumenci importują z `@/features/products/types`
// zamiast z `@/lib/generated/prisma`. Daje to feature-level abstraction (gdyby kiedyś podmienić
// Prismę, zmiana w jednym pliku) i czytelność: `Product` zamiast `Product` z generated.
export type { Category, Product, ProductImage, ProductVariant } from "@/lib/generated/prisma"

import type { Product, ProductImage, ProductVariant } from "@/lib/generated/prisma"

// DTO używane w RSC: produkt z wszystkimi wariantami i obrazkami zaciągnięty jednym query
// (typowy use case PDP). Trzymamy w types, żeby route handler / service nie musiał wewnątrz
// definiować shape-u `include`.
export type ProductWithVariantsAndImages = Product & {
  variants: ProductVariant[]
  images: ProductImage[]
}
