import { PRODUCTS_PAGE_SIZE, type ListProductsFilters } from "../schemas"
import * as productRepository from "../repositories/product.repository"

// Wynik listy gotowy do renderu w RSC: pozycje strony + metadane paginacji.
export type ProductListResult = {
  items: productRepository.ProductListItem[]
  total: number
  page: number
  pageCount: number
}

// Orkiestracja nad repozytorium. Na teraz cienka warstwa (doliczenie `pageCount`), ale to tutaj
// dojdzie z czasem logika biznesowa (np. promocje, wyróżnienia). RSC woła ten serwis bezpośrednio
// — bez Server Action, bo to odczyt.
export async function listProducts(filters: ListProductsFilters): Promise<ProductListResult> {
  const { items, total } = await productRepository.findMany(filters)
  const pageCount = Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE))
  return { items, total, page: filters.page, pageCount }
}

// Opcje filtrów (kategorie/marki) do sidebara — przekazujemy dalej z repozytorium.
export async function getProductFilterOptions() {
  return productRepository.getFilterOptions()
}
