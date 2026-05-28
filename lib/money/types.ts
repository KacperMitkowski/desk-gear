import type { Prisma } from "@/lib/generated/prisma"

// Branded type — pieniądze trzymamy jako string ("249.00") w API/Server Actions, nigdy jako number
// poza warstwą prezentacji. Brand zapobiega przypadkowemu przekazaniu surowego stringa tam, gdzie
// oczekiwana jest zwalidowana wartość pieniężna.
export type Money = string & { readonly __brand: "Money" }

export function toMoney(value: string | number | Prisma.Decimal): Money {
  if (typeof value === "string") return value as Money
  if (typeof value === "number") return value.toFixed(2) as Money
  return value.toFixed(2) as Money // Prisma.Decimal
}
