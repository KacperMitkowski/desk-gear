// Parametry zapytania w App Routerze: każda wartość to string, tablica (parametr powtórzony w URL,
// np. ?a=1&a=2) albo undefined. Strony dostają je jako `Promise<SearchParams>`.
export type SearchParams = Record<string, string | string[] | undefined>

// Sprowadza wartość searchParam do pojedynczego stringa — bierze pierwszą z tablicy (gdy parametr
// powtórzony) lub zwraca wartość/undefined. Wspólny helper dla stron czytających searchParams,
// zanim oddamy je schemie (Zod) do walidacji/koercji.
export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}
