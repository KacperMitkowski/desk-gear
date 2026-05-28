import { describe, expect, it } from "vitest"

import { moneySchema } from "./schema"

describe("moneySchema", () => {
  it("akceptuje poprawną wartość i normalizuje do 2 miejsc", () => {
    expect(moneySchema.parse("249")).toBe("249.00")
    expect(moneySchema.parse("249.9")).toBe("249.90")
    expect(moneySchema.parse("249.99")).toBe("249.99")
  })

  it("odrzuca tekst nie będący liczbą", () => {
    const result = moneySchema.safeParse("abc")
    expect(result.success).toBe(false)
  })

  it("odrzuca więcej niż 2 miejsca po przecinku", () => {
    const result = moneySchema.safeParse("1.999")
    expect(result.success).toBe(false)
  })

  it("odrzuca wartość ujemną (zły format)", () => {
    const result = moneySchema.safeParse("-5.00")
    expect(result.success).toBe(false)
  })
})
