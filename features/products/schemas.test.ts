import { describe, expect, it } from "vitest"

import {
  CATEGORY_SLUG_TO_TYPE,
  CATEGORY_TYPE_TO_SLUG,
  type CategoryType,
  type VariantAttributes,
  variantAttributesSchema,
} from "./schemas"

// Zbiór poprawnych payloadów per categoryType. Trzymamy w jednym miejscu jako referencję dla
// happy-path testów. Gdy ktoś rozszerzy schemat o nowe pole, niech ten test pęknie i niech
// świadomie zaktualizuje fixture-y (oraz seed-owe `generateAttributes` w `prisma/seed.ts`).
const VALID_PAYLOADS: Record<CategoryType, VariantAttributes> = {
  keyboard: { categoryType: "keyboard", layout: "75", switch: "Brown", color: "Czarny" },
  mouse: { categoryType: "mouse", connectivity: "wireless", dpi: "16000", color: "Czarny" },
  headphones: {
    categoryType: "headphones",
    connectivity: "wireless",
    driverSize: "40mm",
    color: "Czarny",
  },
  microphone: {
    categoryType: "microphone",
    connectivity: "USB",
    pattern: "cardioid",
    color: "Czarny",
  },
  monitor: { categoryType: "monitor", diagonal: "27", refreshRate: "144Hz", panel: "IPS" },
  drive: { categoryType: "drive", capacity: "1TB", interface: "NVMe" },
  cable: { categoryType: "cable", length: "1m", color: "Czarny", standard: "USB-C" },
  chair: { categoryType: "chair", color: "Czarny", armrests: "3D" },
  deskAccessories: {
    categoryType: "deskAccessories",
    color: "Czarny",
    type: "laptop-stand",
  },
  apparel: { categoryType: "apparel", size: "M", color: "Czarny" },
}

describe("variantAttributesSchema — happy paths", () => {
  // Pokrywamy każdy wariant z discriminated union. Test pęknie gdy ktoś usunie wariant ze schematu
  // (TS się wkurzy w `VALID_PAYLOADS`) lub gdy zmieni typy pól tak że referencja przestanie pasować.
  it.each(Object.entries(VALID_PAYLOADS))(
    "akceptuje poprawne atrybuty dla categoryType=%s",
    (_categoryType, payload) => {
      const result = variantAttributesSchema.safeParse(payload)
      expect(result.success).toBe(true)
      if (result.success) {
        // Sanity: parsed data ma ten sam `categoryType` co input — discriminator zachowany.
        expect(result.data.categoryType).toBe(payload.categoryType)
      }
    },
  )
})

describe("variantAttributesSchema — discriminator", () => {
  it("odrzuca nieznany categoryType (poza unią)", () => {
    const result = variantAttributesSchema.safeParse({
      categoryType: "spaceship", // celowo poza unią
      color: "Czarny",
    })
    expect(result.success).toBe(false)
  })

  it("odrzuca brak pola categoryType (discriminator wymagany)", () => {
    const result = variantAttributesSchema.safeParse({ color: "Czarny" })
    expect(result.success).toBe(false)
  })
})

// Per-variant rejection tests — wybieramy jedno reprezentatywne pole z każdego wariantu, podajemy
// nielegalną wartość, sprawdzamy że Zod odrzuca. To pokrywa „enum drift" — gdyby ktoś usunął
// wartość z enuma, test pęknie i wymusi aktualizację fixture-ów.

describe("variantAttributesSchema — rejection per variant", () => {
  it("keyboard: odrzuca nieznany layout", () => {
    const result = variantAttributesSchema.safeParse({
      ...VALID_PAYLOADS.keyboard,
      layout: "INVALID",
    })
    expect(result.success).toBe(false)
  })

  it("mouse: odrzuca nieznane connectivity (np. 'bluetooth')", () => {
    const result = variantAttributesSchema.safeParse({
      ...VALID_PAYLOADS.mouse,
      connectivity: "bluetooth",
    })
    expect(result.success).toBe(false)
  })

  it("headphones: odrzuca nieznany driverSize", () => {
    const result = variantAttributesSchema.safeParse({
      ...VALID_PAYLOADS.headphones,
      driverSize: "100mm",
    })
    expect(result.success).toBe(false)
  })

  it("microphone: odrzuca nieznany pattern", () => {
    const result = variantAttributesSchema.safeParse({
      ...VALID_PAYLOADS.microphone,
      pattern: "hypercardioid",
    })
    expect(result.success).toBe(false)
  })

  it("monitor: odrzuca diagonal niezgodny z regex (litery)", () => {
    const result = variantAttributesSchema.safeParse({
      ...VALID_PAYLOADS.monitor,
      diagonal: "twenty-seven",
    })
    expect(result.success).toBe(false)
  })

  it("monitor: akceptuje diagonal z kropką (regex `^\\d+(\\.\\d+)?$`)", () => {
    const result = variantAttributesSchema.safeParse({
      ...VALID_PAYLOADS.monitor,
      diagonal: "27.5",
    })
    expect(result.success).toBe(true)
  })

  it("drive: odrzuca nieznaną capacity (np. '8TB')", () => {
    const result = variantAttributesSchema.safeParse({
      ...VALID_PAYLOADS.drive,
      capacity: "8TB",
    })
    expect(result.success).toBe(false)
  })

  it("cable: odrzuca nieznaną length", () => {
    const result = variantAttributesSchema.safeParse({
      ...VALID_PAYLOADS.cable,
      length: "10m",
    })
    expect(result.success).toBe(false)
  })

  it("cable: akceptuje dowolny `standard` (string, nie enum)", () => {
    // standard jest świadomie string-iem (nie enumem) bo dorzucanie nowych standardów (USB4,
    // Thunderbolt-5) ma być bezbolesne. Test pilnuje że ta swoboda się nie zepsuje.
    const result = variantAttributesSchema.safeParse({
      ...VALID_PAYLOADS.cable,
      standard: "Thunderbolt-5",
    })
    expect(result.success).toBe(true)
  })

  it("chair: odrzuca nieznane armrests", () => {
    const result = variantAttributesSchema.safeParse({
      ...VALID_PAYLOADS.chair,
      armrests: "5D",
    })
    expect(result.success).toBe(false)
  })

  it("deskAccessories: odrzuca nieznany type", () => {
    const result = variantAttributesSchema.safeParse({
      ...VALID_PAYLOADS.deskAccessories,
      type: "coffee-mug",
    })
    expect(result.success).toBe(false)
  })

  it("apparel: odrzuca nieznany size", () => {
    const result = variantAttributesSchema.safeParse({
      ...VALID_PAYLOADS.apparel,
      size: "XXXL",
    })
    expect(result.success).toBe(false)
  })

  it("odrzuca pusty color (z.string().min(1))", () => {
    const result = variantAttributesSchema.safeParse({
      ...VALID_PAYLOADS.keyboard,
      color: "",
    })
    expect(result.success).toBe(false)
  })
})

// Kontrakt mappingów — zmiana w jednym (np. usunięcie wariantu ze schematu) musi propagować się
// na drugi. Test pęknie gdy ktoś doda nowy wariant a zapomni mappingu, lub usunie wariant a
// zostawi sierocy wpis.

describe("CATEGORY_TYPE_TO_SLUG i CATEGORY_SLUG_TO_TYPE", () => {
  const allTypes = Object.keys(VALID_PAYLOADS) as CategoryType[]

  it("CATEGORY_TYPE_TO_SLUG ma wpis dla każdego wariantu schematu", () => {
    for (const type of allTypes) {
      expect(CATEGORY_TYPE_TO_SLUG[type]).toBeTypeOf("string")
      expect(CATEGORY_TYPE_TO_SLUG[type].length).toBeGreaterThan(0)
    }
  })

  it("CATEGORY_TYPE_TO_SLUG nie ma duplikatów po stronie slug", () => {
    const slugs = Object.values(CATEGORY_TYPE_TO_SLUG)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it("CATEGORY_SLUG_TO_TYPE jest dokładną odwrotnością CATEGORY_TYPE_TO_SLUG", () => {
    for (const [type, slug] of Object.entries(CATEGORY_TYPE_TO_SLUG)) {
      expect(CATEGORY_SLUG_TO_TYPE[slug]).toBe(type)
    }
    // I w drugą stronę — zero sierot.
    expect(Object.keys(CATEGORY_SLUG_TO_TYPE).length).toBe(
      Object.keys(CATEGORY_TYPE_TO_SLUG).length,
    )
  })

  it("slugi są kebab-case lowercase (zgodne z URL convention z ADR-014)", () => {
    for (const slug of Object.values(CATEGORY_TYPE_TO_SLUG)) {
      expect(slug).toMatch(/^[a-z]+(-[a-z]+)*$/)
    }
  })
})
