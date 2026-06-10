"use client"

import { useRouter } from "next/navigation"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { t } from "@/i18n/translate"

import { buildProductsQuery, type ProductFilterValues } from "../filters-url"
import { productSortSchema, type ProductSort } from "../schemas"

type Props = {
  current: ProductSort
  filters: ProductFilterValues
}

export function ProductsSort({ current, filters }: Props) {
  const router = useRouter()

  const options: { value: ProductSort; label: string }[] = [
    { value: "newest", label: t("products.list.sort.newest") },
    { value: "price-asc", label: t("products.list.sort.priceAsc") },
    { value: "price-desc", label: t("products.list.sort.priceDesc") },
  ]

  function handleChange(value: string) {
    const sort = productSortSchema.catch("newest").parse(value)
    router.replace(buildProductsQuery({ ...filters, sort, page: 1 }), { scroll: false })
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="products-sort" className="whitespace-nowrap text-sm text-muted-foreground">
        {t("products.list.filters.sort")}
      </Label>
      <Select value={current} onValueChange={handleChange}>
        <SelectTrigger id="products-sort" className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
