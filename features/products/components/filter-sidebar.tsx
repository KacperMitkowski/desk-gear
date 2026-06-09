"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { FormProvider, useForm } from "react-hook-form"

import { FormCheckbox } from "@/components/form/form-checkbox"
import { FormNumberInput } from "@/components/form/form-number-input"
import { FormSelect, type SelectOption } from "@/components/form/form-select"
import { Button } from "@/components/ui/button"
import { t } from "@/i18n/translate"

import { buildProductsQuery } from "../filters-url"
import type { ProductSort } from "../schemas"

// Wartość sentinel dla opcji "wszystkie" — Radix Select nie pozwala na pusty string jako value,
// więc używamy `ALL` i mapujemy na `undefined` przy budowaniu URL-a.
const ALL = "all"

type FilterFormValues = {
  category: string
  brand: string
  priceMin?: number
  priceMax?: number
  inStock: boolean
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
  return buildProductsQuery({
    category: values.category !== ALL ? values.category : undefined,
    brand: values.brand !== ALL ? values.brand : undefined,
    priceMin: values.priceMin,
    priceMax: values.priceMax,
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
      priceMin: current.priceMin,
      priceMax: current.priceMax,
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

  function handleReset() {
    form.reset({
      category: ALL,
      brand: ALL,
      priceMin: undefined,
      priceMax: undefined,
      inStock: false,
      sort: "newest",
    })
    router.replace("/", { scroll: false })
  }

  const categoryOptions: SelectOption[] = [
    { value: ALL, label: t("products.list.filters.allCategories") },
    ...categories.map((c) => ({ value: c.slug, label: c.name })),
  ]
  const brandOptions: SelectOption[] = [
    { value: ALL, label: t("products.list.filters.allBrands") },
    ...brands.map((b) => ({ value: b, label: b })),
  ]
  const sortOptions: SelectOption[] = [
    { value: "newest", label: t("products.list.sort.newest") },
    { value: "price-asc", label: t("products.list.sort.priceAsc") },
    { value: "price-desc", label: t("products.list.sort.priceDesc") },
  ]

  return (
    <aside className="flex flex-col gap-5">
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

          <div className="grid grid-cols-2 gap-3">
            <FormNumberInput<FilterFormValues>
              name="priceMin"
              label={t("products.list.filters.priceMin")}
              min={0}
              placeholder="0"
            />
            <FormNumberInput<FilterFormValues>
              name="priceMax"
              label={t("products.list.filters.priceMax")}
              min={0}
              placeholder="∞"
            />
          </div>

          <FormCheckbox<FilterFormValues>
            name="inStock"
            label={t("products.list.filters.inStock")}
          />

          <FormSelect<FilterFormValues>
            name="sort"
            label={t("products.list.filters.sort")}
            options={sortOptions}
          />

          <Button type="button" variant="outline" onClick={handleReset}>
            {t("products.list.filters.reset")}
          </Button>
        </form>
      </FormProvider>
    </aside>
  )
}
