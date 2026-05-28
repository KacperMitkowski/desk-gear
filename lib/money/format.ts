import type { Money } from "./types"

// Formatuje wartość pieniężną do prezentacji: formatMoney("249.00") → "249,00 zł".
// Konwersja na number TYLKO tutaj (warstwa prezentacji) — arytmetyka pieniężna idzie na Decimal w services.
export function formatMoney(value: Money, locale = "pl-PL", currency = "PLN"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(value))
}
