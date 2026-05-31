import { describe, expect, it } from "vitest"

import { formatMoney } from "./format"
import { toMoney } from "./types"

// Intl dla pl-PL używa U+00A0 (non-breaking space) jako separatora tysięcy i przed "zł".
// \s w JS obejmuje U+00A0/U+202F — normalizujemy do zwykłej spacji, żeby asercje były czytelne.
const norm = (s: string) => s.replace(/\s/g, " ")

describe("formatMoney", () => {
  it("formatuje typową wartość", () => {
    expect(norm(formatMoney(toMoney("249.00")))).toBe("249,00 zł")
  })

  it("formatuje zero", () => {
    expect(norm(formatMoney(toMoney("0.00")))).toBe("0,00 zł")
  })

  it("formatuje duże liczby z separatorem tysięcy", () => {
    expect(norm(formatMoney(toMoney("1234567.89")))).toBe("1 234 567,89 zł")
  })
})
