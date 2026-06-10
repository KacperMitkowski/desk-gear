import { z } from "zod"

// Atrybuty wariantu są **discriminated union** po `categoryType` (na poziomie aplikacji —
// kolumna `ProductVariant.attributes` w DB to JSONB). Dzięki dyskryminatorowi:
// 1. seed/admin panel/API validuje atrybuty zgodnie z faktyczną kategorią produktu,
// 2. TS w konsumencie (np. ProductCard) zna pełen kształt po `if (attrs.categoryType === "...")`,
// 3. dodanie kategorii = dorzucenie schematu + dorzucenie wpisu do mapowania niżej.
//
// Słownik kolorów trzymamy luźno (`string`) — nie chcę enuma żeby nie blokować przyszłych
// kategorii kolorystycznych. SKU/cena/stock są w kolumnach tabelarycznych, nie w `attributes`.

const keyboardAttrs = z.object({
  categoryType: z.literal("keyboard"),
  layout: z.enum(["60", "65", "75", "TKL", "Full"]),
  switch: z.enum(["Brown", "Blue", "Red", "Silent"]),
  color: z.string().min(1),
})

const mouseAttrs = z.object({
  categoryType: z.literal("mouse"),
  connectivity: z.enum(["wireless", "wired"]),
  dpi: z.enum(["800", "1600", "3200", "8000", "16000", "26000"]),
  color: z.string().min(1),
})

const headphonesAttrs = z.object({
  categoryType: z.literal("headphones"),
  connectivity: z.enum(["wireless", "wired", "USB"]),
  driverSize: z.enum(["32mm", "40mm", "50mm", "60mm"]),
  color: z.string().min(1),
})

const microphoneAttrs = z.object({
  categoryType: z.literal("microphone"),
  connectivity: z.enum(["USB", "XLR"]),
  pattern: z.enum(["cardioid", "omnidirectional", "bidirectional"]),
  color: z.string().min(1),
})

const monitorAttrs = z.object({
  categoryType: z.literal("monitor"),
  diagonal: z.string().regex(/^\d+(\.\d+)?$/), // np. "27", "27.5"
  refreshRate: z.enum(["60Hz", "75Hz", "144Hz", "165Hz", "240Hz"]),
  panel: z.enum(["IPS", "VA", "TN", "OLED"]),
})

const driveAttrs = z.object({
  categoryType: z.literal("drive"),
  capacity: z.enum(["256GB", "512GB", "1TB", "2TB", "4TB"]),
  interface: z.enum(["SATA", "NVMe", "USB-A", "USB-C"]),
})

const cableAttrs = z.object({
  categoryType: z.literal("cable"),
  length: z.enum(["0.5m", "1m", "1.5m", "2m", "3m", "5m"]),
  color: z.string().min(1),
  standard: z.string().min(1), // USB-C, USB-A, Lightning, HDMI, DisplayPort itp.
})

const chairAttrs = z.object({
  categoryType: z.literal("chair"),
  color: z.string().min(1),
  armrests: z.enum(["fixed", "2D", "3D", "4D"]),
})

const deskAccessoriesAttrs = z.object({
  categoryType: z.literal("deskAccessories"),
  color: z.string().min(1),
  type: z.enum([
    "laptop-stand",
    "cable-organizer",
    "desk-lamp",
    "monitor-arm",
    "desk-mat",
    "headphone-stand",
  ]),
})

const apparelAttrs = z.object({
  categoryType: z.literal("apparel"),
  size: z.enum(["XS", "S", "M", "L", "XL", "XXL"]),
  color: z.string().min(1),
})

export const productSortSchema = z.enum(["newest", "price-asc", "price-desc"])
export type ProductSort = z.infer<typeof productSortSchema>

export const listProductsSchema = z.object({
  category: z.string().min(1).optional().catch(undefined), // slug liścia, np. "keyboards"
  brand: z.string().min(1).optional().catch(undefined),
  priceMin: z.coerce.number().min(0).optional().catch(undefined),
  priceMax: z.coerce.number().min(0).optional().catch(undefined),
  inStock: z.preprocess((v) => v === "true" || v === "1" || v === true, z.boolean()),
  page: z.coerce.number().int().min(1).catch(1),
  sort: productSortSchema.catch("newest"),
})
export type ListProductsFilters = z.infer<typeof listProductsSchema>

export const variantAttributesSchema = z.discriminatedUnion("categoryType", [
  keyboardAttrs,
  mouseAttrs,
  headphonesAttrs,
  microphoneAttrs,
  monitorAttrs,
  driveAttrs,
  cableAttrs,
  chairAttrs,
  deskAccessoriesAttrs,
  apparelAttrs,
])

export type VariantAttributes = z.infer<typeof variantAttributesSchema>
export type CategoryType = VariantAttributes["categoryType"]

// Mapowanie `categoryType` (klucz dyskryminatora w atrybutach wariantu) → slug kategorii liść
// w DB (po angielsku, ADR-014). Liczba mnoga, bo URL-e są np. `/shop/keyboards`. Używane
// w seedzie (do wstawienia `categoryId` zgodnego z typem wariantu) oraz w admin panelu.
export const CATEGORY_TYPE_TO_SLUG: Record<CategoryType, string> = {
  keyboard: "keyboards",
  mouse: "mice",
  headphones: "headphones",
  microphone: "microphones",
  monitor: "monitors",
  drive: "drives",
  cable: "cables",
  chair: "chairs",
  deskAccessories: "desk-accessories",
  apparel: "t-shirts",
}

// Mapowanie odwrotne — slug liścia → categoryType. Przyda się gdy mamy produkt z bazy i chcemy
// zawęzić typ atrybutów wariantu przez TS. Generujemy z `CATEGORY_TYPE_TO_SLUG` żeby trzymać
// single source of truth (zmiana w jednym miejscu propaguje obie strony).
export const CATEGORY_SLUG_TO_TYPE = Object.fromEntries(
  Object.entries(CATEGORY_TYPE_TO_SLUG).map(([type, slug]) => [slug, type as CategoryType]),
) as Record<string, CategoryType>
