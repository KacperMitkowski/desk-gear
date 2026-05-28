import * as z from "zod"

// Waliduje string pieniężny: cyfry + opcjonalnie 1-2 miejsca po kropce (np. "249", "249.0", "249.99").
// Normalizuje do 2 miejsc. Regex nie dopuszcza znaku minus, więc wartości są zawsze nieujemne;
// refine jest dodatkowym zabezpieczeniem (np. gdyby regex się zmienił).
export const moneySchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, { error: "invalid_money_format" })
  .transform((v) => Number(v).toFixed(2))
  .refine((v) => Number(v) >= 0, { error: "too_small" })

export type MoneyInput = z.infer<typeof moneySchema>
