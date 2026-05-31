import type { Prisma } from "@/lib/generated/prisma"

// Branded type — pieniądze trzymamy jako string ("249.00") w API/Server Actions, nigdy jako number
// poza warstwą prezentacji. Brand zapobiega przypadkowemu przekazaniu surowego stringa tam, gdzie
// oczekiwana jest zwalidowana wartość pieniężna.
export type Money = string & { readonly __brand: "Money" }

// Akceptujemy tylko nieujemne wartości w formacie liczbowym (string: cyfry + opcjonalnie 1-2 miejsca
// po kropce). Branding bez walidacji łamałby niezmiennik Money (non-negative, canonical X.YY).
const MONEY_INPUT_RE = /^\d+(\.\d{1,2})?$/

export function toMoney(value: string | number | Prisma.Decimal): Money {
  if (typeof value === "string") {
    if (!MONEY_INPUT_RE.test(value)) {
      throw new Error(`Invalid Money input: "${value}" (expected non-negative X.YY)`)
    }
    return Number(value).toFixed(2) as Money
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid Money input: ${value} (expected finite non-negative)`)
    }
    return value.toFixed(2) as Money
  }
  // Prisma.Decimal — .toFixed(2) zwraca "-X.YY" dla wartości ujemnej, więc prefix wystarczy do detekcji.
  const formatted = value.toFixed(2)
  if (formatted.startsWith("-")) {
    throw new Error(`Invalid Money input: ${formatted} (expected non-negative)`)
  }
  return formatted as Money
}
