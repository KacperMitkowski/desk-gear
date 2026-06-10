"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { FormProvider, useForm } from "react-hook-form"

import { FormCheckbox } from "@/components/form/form-checkbox"
import { FormRadioGroup, type RadioOption } from "@/components/form/form-radio-group"
import { FormSelect, type SelectOption } from "@/components/form/form-select"
import { Button } from "@/components/ui/button"
import { t } from "@/i18n/translate"
import { ROUTES } from "@/lib/routes"

import { buildProductsQuery } from "../filters-url"
import type { ProductSort } from "../schemas"

// Wartość sentinel dla opcji "wszystkie" — Radix Select nie pozwala na pusty string jako value,
// więc używamy `ALL` i mapujemy na `undefined` przy budowaniu URL-a.
const ALL = "all"

// Gotowe przedziały cenowe (zamiast surowych pól od/do). `value` = klucz radia oraz sufiks i18n
// (`filters.priceRanges.<value>`). `min`/`max` opcjonalne → krańce otwarte: "Do 250" ma tylko max,
// "3000 i więcej" tylko min. URL trzyma nadal priceMin/priceMax, więc repo/schema bez zmian.
const PRICE_RANGES: { value: string; min?: number; max?: number }[] = [
  { value: "to250", max: 250 },
  { value: "from250to500", min: 250, max: 500 },
  { value: "from500to1500", min: 500, max: 1500 },
  { value: "from1500to3000", min: 1500, max: 3000 },
  { value: "from3000", min: 3000 },
]

// Mapuje wartości z URL (priceMin/priceMax) na klucz wybranego przedziału. Brak dopasowania
// (np. ręcznie sklejony URL z nietypowym zakresem) → `ALL`, czyli "wszystkie ceny".
function matchPriceRange(min?: number, max?: number): string {
  return PRICE_RANGES.find((r) => r.min === min && r.max === max)?.value ?? ALL
}

type FilterFormValues = {
  category: string
  brand: string
  priceRange: string
  inStock: boolean
  // Sortowanie ma własny control nad listą (ProductsSort), nie jest renderowane w sidebarze. Trzymamy
  // je jednak w stanie formularza, żeby zmiana innego filtra (toQuery) nie gubiła aktywnego `?sort=`.
  sort: ProductSort
}

export type FilterSidebarProps = {
  categories: { slug: string; name: string }[]
  brands: string[]
  current: {
    category?: string
    brand?: string
    priceMin?: number
    priceMax?: number
    inStock: boolean
    sort: ProductSort
  }
}

// Mapuje stan formularza na wartości URL-a (zdejmuje sentinel `ALL`) i zawsze resetuje stronę do 1
// — zmiana filtra unieważnia bieżącą paginację.
function toQuery(values: FilterFormValues): string {
  const range = PRICE_RANGES.find((r) => r.value === values.priceRange)
  return buildProductsQuery({
    category: values.category !== ALL ? values.category : undefined,
    brand: values.brand !== ALL ? values.brand : undefined,
    priceMin: range?.min,
    priceMax: range?.max,
    inStock: values.inStock,
    sort: values.sort,
    page: 1,
  })
}

export function FilterSidebar({ categories, brands, current }: FilterSidebarProps) {
  const router = useRouter()
  const form = useForm<FilterFormValues>({
    defaultValues: {
      category: current.category ?? ALL,
      brand: current.brand ?? ALL,
      priceRange: matchPriceRange(current.priceMin, current.priceMax),
      inStock: current.inStock,
      sort: current.sort,
    },
  })

  // Debounce — pola liczbowe (cena) zmieniają się na każdy keystroke; bez tego każda cyfra to
  // osobna nawigacja. `replace` (nie `push`) żeby filtrowanie nie zaśmiecało historii przeglądarki.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    // `form.watch(callback)` to udokumentowany wzorzec RHF na efekty uboczne przy zmianie pól;
    // React Compiler nie potrafi go zmemoizować, ale tu używamy go tylko do nawigacji (bez UI).
    // eslint-disable-next-line react-hooks/incompatible-library
    const subscription = form.watch((values) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        router.replace(toQuery(values as FilterFormValues), { scroll: false })
      }, 300)
    })
    return () => {
      subscription.unsubscribe()
      if (timer.current) clearTimeout(timer.current)
    }
  }, [form, router])

  // Synchronizacja URL → formularz. Komponent NIE remountuje się przy soft-nav, więc `defaultValues`
  // (ustawiane raz, na mount) nie odzwierciedlają zmiany filtra przychodzącej z zewnątrz — np. klik
  // kategorii na górnej belce. Bez tego select kategorii pozostawałby na starej wartości. Resetujemy
  // tylko gdy wartości z URL faktycznie różnią się od stanu formularza — inaczej (zmiana wywołana
  // samym sidebarem: form → URL → te same `current`) byłby zbędny reset, a w trakcie szybkiej edycji
  // mógłby skasować pole, które user właśnie zmienił, zanim nawigacja się dopięła.
  useEffect(() => {
    const v = form.getValues()
    const next: FilterFormValues = {
      category: current.category ?? ALL,
      brand: current.brand ?? ALL,
      priceRange: matchPriceRange(current.priceMin, current.priceMax),
      inStock: current.inStock,
      sort: current.sort,
    }
    const differs =
      v.category !== next.category ||
      v.brand !== next.brand ||
      v.priceRange !== next.priceRange ||
      v.inStock !== next.inStock ||
      v.sort !== next.sort
    if (differs) form.reset(next)
  }, [
    form,
    current.category,
    current.brand,
    current.priceMin,
    current.priceMax,
    current.inStock,
    current.sort,
  ])

  function handleReset() {
    form.reset({
      category: ALL,
      brand: ALL,
      priceRange: ALL,
      inStock: false,
      sort: "newest",
    })
    router.replace(ROUTES.PRODUCTS, { scroll: false })
  }

  const categoryOptions: SelectOption[] = [
    { value: ALL, label: t("products.list.filters.allCategories") },
    ...categories.map((c) => ({ value: c.slug, label: c.name })),
  ]
  const brandOptions: SelectOption[] = [
    { value: ALL, label: t("products.list.filters.allBrands") },
    ...brands.map((b) => ({ value: b, label: b })),
  ]
  const priceOptions: RadioOption[] = [
    { value: ALL, label: t("products.list.filters.priceRanges.all") },
    ...PRICE_RANGES.map((r) => ({
      value: r.value,
      label: t(`products.list.filters.priceRanges.${r.value}`),
    })),
  ]

  return (
    <aside className="flex flex-col gap-5 md:w-60 md:shrink-0">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("products.list.filters.heading")}
      </h2>

      <FormProvider {...form}>
        {/* Filtrowanie jest live (watch → URL), więc form bez onSubmit; preventDefault na wszelki wypadek. */}
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
          <FormSelect<FilterFormValues>
            name="category"
            label={t("products.list.filters.category")}
            options={categoryOptions}
          />
          <FormSelect<FilterFormValues>
            name="brand"
            label={t("products.list.filters.brand")}
            options={brandOptions}
          />

          <FormRadioGroup<FilterFormValues>
            name="priceRange"
            label={t("products.list.filters.price")}
            options={priceOptions}
            className="gap-3"
          />

          <FormCheckbox<FilterFormValues>
            name="inStock"
            label={t("products.list.filters.inStock")}
          />

          <Button type="button" variant="outline" onClick={handleReset}>
            {t("products.list.filters.reset")}
          </Button>
        </form>
      </FormProvider>
    </aside>
  )
}
