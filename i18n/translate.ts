import { messages } from "./messages"

// Zgodne z typem `Translate` z lib/validation/resolve-error-message.ts.
type TranslationParams = Record<string, unknown>

/**
 * Tłumaczy klucz (np. "errors.too_small.string") na tekst PL z plików w i18n/pl.
 * - Klucz to ścieżka po kropkach przez zagnieżdżone obiekty JSON.
 * - {param} w tekście są podmieniane wartościami z `params`.
 * - Gdy tłumaczenia brak, zwraca sam klucz (czytelny fallback zamiast undefined).
 */
export function t(key: string, params?: TranslationParams): string {
  const text = findTranslation(key)
  if (text === undefined) return key // fallback do klucza
  return params ? fillPlaceholders(text, params) : text
}

// Schodzi po kropkach do zagnieżdżonej wartości; zwraca string albo undefined (brak/niełańcuch).
function findTranslation(key: string): string | undefined {
  let current: unknown = messages
  for (const segment of key.split(".")) {
    if (current === null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return typeof current === "string" ? current : undefined
}

// Podmienia {nazwa} na params.nazwa; nieznane placeholdery zostawia nienaruszone.
function fillPlaceholders(text: string, params: TranslationParams): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}
