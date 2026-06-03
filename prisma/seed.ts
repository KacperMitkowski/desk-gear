// Prisma 7 nie auto-loaduje env dla `db seed` — używamy @next/env żeby trzymać tę samą
// hierarchię (.env.local → .env.<env>.local → .env.<env> → .env) co Next.js i prisma.config.ts.
import { loadEnvConfig } from "@next/env"

loadEnvConfig(process.cwd())

// Dynamic imports w main() — env.ts waliduje przy załadowaniu modułu (createEnv),
// więc moduł nie może być załadowany przed loadEnvConfig.
async function main() {
  const { hash } = await import("bcryptjs")
  const { faker } = await import("@faker-js/faker/locale/pl")
  const { readdirSync } = await import("node:fs")
  const { join } = await import("node:path")
  const { env } = await import("@/env")
  const { prisma } = await import("@/lib/db/prisma")
  const { OrderStatus, UserRole } = await import("@/lib/generated/prisma")
  const { Prisma } = await import("@/lib/generated/prisma")
  const { CATEGORY_TYPE_TO_SLUG, variantAttributesSchema } =
    await import("@/features/products/schemas")
  const { toMoney } = await import("@/lib/money/types")

  // Determinizm — re-run seedera daje te same wartości, więc upserty trafiają w te same
  // rekordy. Bez tego: każdy run nadpisywałby losowymi cenami/nazwami (idempotentność by szła,
  // ale za każdym razem inne dane).
  faker.seed(42)

  try {
    // ============================================================
    // 1. Admin (zachowane z poprzedniego seedera)
    // ============================================================
    let adminId: string | null = null
    if (env.ADMIN_SEED_EMAIL && env.ADMIN_SEED_PASSWORD) {
      const passwordHash = await hash(env.ADMIN_SEED_PASSWORD, 12)
      const admin = await prisma.user.upsert({
        where: { email: env.ADMIN_SEED_EMAIL },
        update: { role: UserRole.ADMIN, passwordHash },
        create: { email: env.ADMIN_SEED_EMAIL, role: UserRole.ADMIN, passwordHash },
      })
      adminId = admin.id
      console.log(`✓ Admin: ${admin.email}`)
    } else {
      console.log("⚠ ADMIN_SEED_EMAIL/PASSWORD nieustawione — pomijam admin seed.")
    }

    // ============================================================
    // 2. Kategorie (5 root + 10 leaf)
    // ============================================================
    // Mapping leaf-slug → display name (po polsku) i parent root slug.
    // Trzymamy w jednym miejscu żeby seed/UI/admin mogły pobrać z jednego źródła.
    const ROOTS: Array<{ slug: string; name: string }> = [
      { slug: "peripherals", name: "Peryferia" },
      { slug: "displays", name: "Wyświetlacze" },
      { slug: "storage", name: "Pamięci i łączność" },
      { slug: "workspace", name: "Stanowisko pracy" },
      { slug: "apparel", name: "Odzież" },
    ]

    const LEAFS: Array<{ slug: string; name: string; parent: string }> = [
      { slug: "keyboards", name: "Klawiatury", parent: "peripherals" },
      { slug: "mice", name: "Myszki", parent: "peripherals" },
      { slug: "headphones", name: "Słuchawki", parent: "peripherals" },
      { slug: "microphones", name: "Mikrofony", parent: "peripherals" },
      { slug: "monitors", name: "Monitory", parent: "displays" },
      { slug: "drives", name: "Dyski", parent: "storage" },
      { slug: "cables", name: "Kable", parent: "storage" },
      { slug: "chairs", name: "Fotele", parent: "workspace" },
      { slug: "desk-accessories", name: "Akcesoria biurowe", parent: "workspace" },
      { slug: "t-shirts", name: "Koszulki", parent: "apparel" },
    ]

    const categoryBySlug = new Map<string, { id: string }>()
    for (const r of ROOTS) {
      const cat = await prisma.category.upsert({
        where: { slug: r.slug },
        update: { name: r.name, parentId: null },
        create: { slug: r.slug, name: r.name },
      })
      categoryBySlug.set(r.slug, cat)
    }
    for (const l of LEAFS) {
      const parent = categoryBySlug.get(l.parent)
      if (!parent) throw new Error(`Brak root-a dla leaf-a ${l.slug}`)
      const cat = await prisma.category.upsert({
        where: { slug: l.slug },
        update: { name: l.name, parentId: parent.id },
        create: { slug: l.slug, name: l.name, parentId: parent.id },
      })
      categoryBySlug.set(l.slug, cat)
    }
    console.log(`✓ Kategorie: ${ROOTS.length} root + ${LEAFS.length} leaf`)

    // ============================================================
    // 3. Produkty — skanujemy public/products/ i tworzymy 1 produkt per `{slug}-{n}.jpg`
    // ============================================================
    // Skanujemy folder żeby liczba produktów per kategoria była zgodna z liczbą obrazków
    // (bez duplikatów, bez braków). Zamiast zgadywać 6 albo 7 — bierzemy ile jest.
    const productsDir = join(process.cwd(), "public", "products")
    const allImages = readdirSync(productsDir)

    // Grupowanie: `{categorySlug}-{n}.jpg` → categoryProducts[categorySlug] = [n, n, ...]
    // UWAGA: regex `^([\w-]+?)-(\d+)\.jpg$` greedy-by-backtrack matchuje też variant files
    // (np. `chairs-1-2.jpg` jako slug=`chairs-1`, n=2). Dlatego odsiewamy slugi kończące się
    // cyfrą po myślniku — slugi kategorii nigdy nie kończą się numerem.
    const categoryProducts = new Map<string, number[]>()
    const MAIN_IMG_RE = /^([\w-]+?)-(\d+)\.jpg$/
    for (const file of allImages) {
      const match = MAIN_IMG_RE.exec(file)
      if (!match || !match[1] || !match[2]) continue
      const slug = match[1]
      if (/-\d+$/.test(slug)) continue // to jest variant file (slug-n-m.jpg), nie main
      const n = Number.parseInt(match[2], 10)
      const arr = categoryProducts.get(slug) ?? []
      arr.push(n)
      categoryProducts.set(slug, arr)
    }
    for (const arr of categoryProducts.values()) arr.sort((a, b) => a - b)

    // Singular polish category names dla nazw produktów (faker prepend-uje adjective).
    const SINGULAR_NAME: Record<string, string> = {
      keyboards: "Klawiatura",
      mice: "Myszka",
      headphones: "Słuchawki",
      microphones: "Mikrofon",
      monitors: "Monitor",
      drives: "Dysk",
      cables: "Kabel",
      chairs: "Fotel",
      "desk-accessories": "Akcesorium biurowe",
      "t-shirts": "Koszulka",
    }

    // Singular form sluga dla URL produktu — `keyboard-1`, `microphone-3`.
    const SINGULAR_SLUG: Record<string, string> = {
      keyboards: "keyboard",
      mice: "mouse",
      headphones: "headphones-set",
      microphones: "microphone",
      monitors: "monitor",
      drives: "drive",
      cables: "cable",
      chairs: "chair",
      "desk-accessories": "desk-accessory",
      "t-shirts": "t-shirt",
    }

    // Zakresy cen [min, max] w zł — z ARCH §5.7 + uzupełnione z domysłu dla brakujących.
    const PRICE_RANGES: Record<string, [number, number]> = {
      keyboards: [250, 1500],
      mice: [100, 600],
      headphones: [200, 1500],
      microphones: [250, 1500],
      monitors: [1000, 5000],
      drives: [200, 1500],
      cables: [25, 150],
      chairs: [800, 3500],
      "desk-accessories": [50, 400],
      "t-shirts": [89, 129],
    }

    // Brand-y per kategoria — własna lista mieszanki realistycznych firm. Faker random-uje.
    const BRANDS: Record<string, string[]> = {
      keyboards: ["Logitech", "Keychron", "Corsair", "Razer", "HyperX", "Ducky"],
      mice: ["Logitech", "Razer", "SteelSeries", "Glorious", "Endgame Gear"],
      headphones: ["Sony", "Sennheiser", "Bose", "Audio-Technica", "HyperX", "Logitech"],
      microphones: ["Shure", "Rode", "Audio-Technica", "Blue", "HyperX"],
      monitors: ["LG", "Dell", "ASUS", "Samsung", "BenQ", "AOC"],
      drives: ["Samsung", "WD", "Seagate", "Kingston", "SanDisk", "Crucial"],
      cables: ["Anker", "UGREEN", "Baseus", "AmazonBasics", "Belkin"],
      chairs: ["Secretlab", "Herman Miller", "DXRacer", "Diablo", "Sense7"],
      "desk-accessories": ["IKEA", "BoYata", "Rain Design", "Nillkin", "Satechi"],
      "t-shirts": ["DeskGear Originals", "DevWear", "CodeStyle", "Pixel Apparel"],
    }

    // Adjektywy do nazw produktów — random prepend dla różnorodności.
    const ADJECTIVES: Record<string, string[]> = {
      keyboards: ["Mechaniczna", "Bezprzewodowa", "Cicha", "Niskoprofilowa", "Hot-swap"],
      mice: ["Bezprzewodowa", "Ergonomiczna", "Gamingowa", "Lekka", "Precyzyjna"],
      headphones: ["Bezprzewodowe", "Studyjne", "Otwarte", "Zamknięte", "Aktywnie tłumiące"],
      microphones: ["Studyjny", "Streamerski", "Pojemnościowy", "Dynamiczny", "Kierunkowy"],
      monitors: ["Gamingowy", "Profesjonalny", "4K", "Ultraszeroki", "Kreatywny"],
      drives: ["Szybki", "Pojemny", "Przenośny", "Wewnętrzny", "Zewnętrzny"],
      cables: ["Pleciony", "Wzmocniony", "Szybkiego ładowania", "Magnetyczny", "Krótki"],
      chairs: ["Gamingowy", "Ergonomiczny", "Z zagłówkiem", "Z podnóżkiem", "Premium"],
      "desk-accessories": ["Aluminiowy", "Drewniany", "Modularny", "Składany", "Minimalistyczny"],
      "t-shirts": ["Klasyczna", "Vintage", "Limitowana", "Premium", "Casualowa"],
    }

    // Kolory (PL, do `attributes.color`).
    const COLORS = ["Czarny", "Biały", "Szary", "Srebrny", "Granatowy", "Czerwony", "Zielony"]

    type ProductSeed = {
      id: string
      slug: string
      categorySlug: string
      productNumber: number
      basePrice: number
    }

    const productsCreated: ProductSeed[] = []
    for (const [categorySlug, productNumbers] of categoryProducts) {
      const category = categoryBySlug.get(categorySlug)
      if (!category) {
        console.warn(`⚠ Brak kategorii w bazie dla obrazów ${categorySlug} — pomijam`)
        continue
      }
      const [priceMin, priceMax] = PRICE_RANGES[categorySlug] ?? [100, 500]
      const brands = BRANDS[categorySlug] ?? ["Generic"]
      const adjectives = ADJECTIVES[categorySlug] ?? [""]
      const singularName = SINGULAR_NAME[categorySlug] ?? "Produkt"
      const singularSlug = SINGULAR_SLUG[categorySlug] ?? categorySlug.replace(/s$/, "")

      for (const n of productNumbers) {
        const slug = `${singularSlug}-${n}`
        const adj = faker.helpers.arrayElement(adjectives)
        const name = `${adj} ${singularName} ${n}`.trim()
        const brand = faker.helpers.arrayElement(brands)
        const description = faker.lorem.paragraph({ min: 3, max: 5 })
        const basePrice = faker.number.float({ min: priceMin, max: priceMax, fractionDigits: 0 })

        const product = await prisma.product.upsert({
          where: { slug },
          update: { name, description, brand, categoryId: category.id, isActive: true },
          create: {
            slug,
            name,
            description,
            brand,
            categoryId: category.id,
            isActive: true,
            isFeatured: n === 1, // pierwszy z kategorii featured
          },
        })
        productsCreated.push({
          id: product.id,
          slug,
          categorySlug,
          productNumber: n,
          basePrice,
        })
      }
    }
    console.log(`✓ Produkty: ${productsCreated.length}`)

    // ============================================================
    // 4. Warianty (2-6 per produkt, atrybuty z variantAttributesSchema)
    // ============================================================
    const CATEGORY_SLUG_TO_TYPE = Object.fromEntries(
      Object.entries(CATEGORY_TYPE_TO_SLUG).map(([type, slug]) => [slug, type]),
    ) as Record<string, keyof typeof CATEGORY_TYPE_TO_SLUG>

    // Generator atrybutów per categoryType. Wartości muszą trafiać w enumy z `schemas.ts` —
    // potem i tak parsujemy przez `variantAttributesSchema.parse()` żeby seed pęknął jeśli
    // ktoś zmieni schemat a generator zostanie nieaktualny.
    function generateAttributes(categoryType: string): unknown {
      const color = faker.helpers.arrayElement(COLORS)
      switch (categoryType) {
        case "keyboard":
          return {
            categoryType,
            layout: faker.helpers.arrayElement(["60", "65", "75", "TKL", "Full"]),
            switch: faker.helpers.arrayElement(["Brown", "Blue", "Red", "Silent"]),
            color,
          }
        case "mouse":
          return {
            categoryType,
            connectivity: faker.helpers.arrayElement(["wireless", "wired"]),
            dpi: faker.helpers.arrayElement(["800", "1600", "3200", "8000", "16000", "26000"]),
            color,
          }
        case "headphones":
          return {
            categoryType,
            connectivity: faker.helpers.arrayElement(["wireless", "wired", "USB"]),
            driverSize: faker.helpers.arrayElement(["32mm", "40mm", "50mm", "60mm"]),
            color,
          }
        case "microphone":
          return {
            categoryType,
            connectivity: faker.helpers.arrayElement(["USB", "XLR"]),
            pattern: faker.helpers.arrayElement(["cardioid", "omnidirectional", "bidirectional"]),
            color,
          }
        case "monitor":
          return {
            categoryType,
            diagonal: faker.helpers.arrayElement(["24", "27", "32", "34"]),
            refreshRate: faker.helpers.arrayElement(["60Hz", "75Hz", "144Hz", "165Hz", "240Hz"]),
            panel: faker.helpers.arrayElement(["IPS", "VA", "TN", "OLED"]),
          }
        case "drive":
          return {
            categoryType,
            capacity: faker.helpers.arrayElement(["256GB", "512GB", "1TB", "2TB", "4TB"]),
            interface: faker.helpers.arrayElement(["SATA", "NVMe", "USB-A", "USB-C"]),
          }
        case "cable":
          return {
            categoryType,
            length: faker.helpers.arrayElement(["0.5m", "1m", "1.5m", "2m", "3m", "5m"]),
            color,
            standard: faker.helpers.arrayElement([
              "USB-C",
              "USB-A",
              "Lightning",
              "HDMI",
              "DisplayPort",
            ]),
          }
        case "chair":
          return {
            categoryType,
            color,
            armrests: faker.helpers.arrayElement(["fixed", "2D", "3D", "4D"]),
          }
        case "deskAccessories":
          return {
            categoryType,
            color,
            type: faker.helpers.arrayElement([
              "laptop-stand",
              "cable-organizer",
              "desk-lamp",
              "monitor-arm",
              "desk-mat",
              "headphone-stand",
            ]),
          }
        case "apparel":
          return {
            categoryType,
            size: faker.helpers.arrayElement(["XS", "S", "M", "L", "XL", "XXL"]),
            color,
          }
        default:
          throw new Error(`Brak generatora atrybutów dla categoryType=${categoryType}`)
      }
    }

    let variantCount = 0
    for (const p of productsCreated) {
      const categoryType = CATEGORY_SLUG_TO_TYPE[p.categorySlug]
      if (!categoryType) {
        console.warn(`⚠ Brak categoryType dla ${p.categorySlug} — pomijam warianty`)
        continue
      }
      const variantCountPerProduct = faker.number.int({ min: 2, max: 6 })
      const skuPrefix = p.categorySlug.toUpperCase().slice(0, 3)

      for (let vi = 1; vi <= variantCountPerProduct; vi++) {
        const rawAttrs = generateAttributes(categoryType)
        // Parsujemy żeby wykryć rozjazd schema-vs-generator. Throw = naprawić generator.
        const attrs = variantAttributesSchema.parse(rawAttrs)

        // Cena = baza ± 0-15%. Konwertujemy przez `toMoney` (branded type → string format).
        const priceVariation = faker.number.float({ min: 0.85, max: 1.15, fractionDigits: 3 })
        const priceGrossNum = Math.round(p.basePrice * priceVariation * 100) / 100
        const priceGross = toMoney(priceGrossNum.toFixed(2))

        const sku = `${skuPrefix}-${String(p.productNumber).padStart(3, "0")}-V${vi}`

        await prisma.productVariant.upsert({
          where: { sku },
          update: {
            attributes: attrs,
            priceGross: new Prisma.Decimal(priceGross),
            stockQuantity: faker.number.int({ min: 0, max: 50 }),
          },
          create: {
            productId: p.id,
            sku,
            attributes: attrs,
            priceGross: new Prisma.Decimal(priceGross),
            stockQuantity: faker.number.int({ min: 0, max: 50 }),
          },
        })
        variantCount++
      }
    }
    console.log(`✓ Warianty: ${variantCount}`)

    // ============================================================
    // 5. ProductImage — skan public/products/ per produkt
    // ============================================================
    // Strategia: `deleteMany({ productId })` + `createMany(...)` per produkt. Idempotent
    // i nie wymaga schema change (unique constraint na (productId, position)).
    let imageCount = 0
    for (const p of productsCreated) {
      const prefix = `${p.categorySlug}-${p.productNumber}`
      // Pliki dla tego produktu: główne `{prefix}.jpg` + warianty `{prefix}-{m}.jpg`.
      // Strict regex bo `microphones-1` nie powinno matchnąć `microphones-10`.
      const mainRe = new RegExp(`^${prefix}\\.jpg$`)
      const variantRe = new RegExp(`^${prefix}-(\\d+)\\.jpg$`)
      const mainFile = allImages.find((f) => mainRe.test(f))
      const variantFiles = allImages
        .map((f) => {
          const match = variantRe.exec(f)
          if (!match || !match[1]) return null
          return { file: f, m: Number.parseInt(match[1], 10) }
        })
        .filter((x): x is { file: string; m: number } => x !== null)
        .sort((a, b) => a.m - b.m)

      const records: Array<{ path: string; alt: string; position: number; isPrimary: boolean }> = []
      if (mainFile) {
        records.push({
          path: `/products/${mainFile}`,
          alt: `Zdjęcie główne — produkt ${p.slug}`,
          position: 0,
          isPrimary: true,
        })
      }
      for (let i = 0; i < variantFiles.length; i++) {
        const vf = variantFiles[i]
        if (!vf) continue
        records.push({
          path: `/products/${vf.file}`,
          alt: `Zdjęcie dodatkowe ${i + 1} — produkt ${p.slug}`,
          position: i + 1,
          isPrimary: false,
        })
      }

      await prisma.productImage.deleteMany({ where: { productId: p.id } })
      if (records.length > 0) {
        await prisma.productImage.createMany({
          data: records.map((r) => ({ productId: p.id, ...r })),
        })
        imageCount += records.length
      }
    }
    console.log(`✓ Obrazki: ${imageCount}`)

    // ============================================================
    // 6. Zamówienia testowe (5-10) — tylko jeśli mamy admina
    // ============================================================
    if (!adminId) {
      console.log("⚠ Brak admina — pomijam seed zamówień.")
    } else {
      const allVariants = await prisma.productVariant.findMany({
        select: { id: true, sku: true, priceGross: true, attributes: true, product: true },
      })
      if (allVariants.length === 0) {
        console.log("⚠ Brak wariantów — pomijam seed zamówień.")
      } else {
        const STATUSES = [
          OrderStatus.PENDING,
          OrderStatus.PAID,
          OrderStatus.PROCESSING,
          OrderStatus.SHIPPED,
          OrderStatus.DELIVERED,
          OrderStatus.CANCELLED,
        ]
        // 8 zamówień: po jednym dla każdego statusu (6) + 2 dodatkowe random.
        const ORDER_COUNT = 8
        const SHIPPING_ADDRESS = {
          line1: "ul. Testowa 1",
          city: "Warszawa",
          postalCode: "00-001",
          country: "PL",
        }

        for (let i = 1; i <= ORDER_COUNT; i++) {
          // Klucz idempotentności: `orderNumber` (unique w schemacie). Schemat wymaga UUID dla
          // `id`, więc nie możemy używać deterministycznego stringa jak `seed-order-01`.
          const orderNumber = `ORD-${String(i).padStart(6, "0")}`
          const status =
            i <= STATUSES.length ? STATUSES[i - 1] : faker.helpers.arrayElement(STATUSES)
          // 1-3 items per order.
          const itemCount = faker.number.int({ min: 1, max: 3 })
          const itemVariants = faker.helpers.arrayElements(allVariants, itemCount)
          const items = itemVariants.map((v) => {
            const quantity = faker.number.int({ min: 1, max: 3 })
            return {
              variantId: v.id,
              quantity,
              unitPrice: v.priceGross,
              productNameSnapshot: v.product.name,
              variantAttributesSnapshot: v.attributes ?? {},
            }
          })
          const subtotal = items.reduce((acc, it) => acc + Number(it.unitPrice) * it.quantity, 0)
          const shipping = 15
          const total = subtotal + shipping

          await prisma.order.upsert({
            where: { orderNumber },
            update: {
              status,
              userId: adminId,
              email: env.ADMIN_SEED_EMAIL!,
              subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
              shipping: new Prisma.Decimal(shipping.toFixed(2)),
              total: new Prisma.Decimal(total.toFixed(2)),
              shippingMethod: "courier",
              shippingAddress: SHIPPING_ADDRESS,
              // Items aktualizujemy strategią delete+create (analogicznie do ProductImage).
              items: { deleteMany: {}, createMany: { data: items } },
            },
            create: {
              orderNumber,
              status,
              userId: adminId,
              email: env.ADMIN_SEED_EMAIL!,
              subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
              shipping: new Prisma.Decimal(shipping.toFixed(2)),
              total: new Prisma.Decimal(total.toFixed(2)),
              shippingMethod: "courier",
              shippingAddress: SHIPPING_ADDRESS,
              items: { createMany: { data: items } },
            },
          })
        }
        console.log(`✓ Zamówienia: ${ORDER_COUNT}`)
      }
    }

    console.log("\n✓ Seed zakończony.")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
