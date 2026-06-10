import { describe, expect, it } from "vitest"

import { firstValue } from "./search-params"

describe("firstValue", () => {
  it("zwraca string bez zmian", () => {
    expect(firstValue("keyboards")).toBe("keyboards")
  })

  it("dla tablicy (parametr powtórzony w URL) bierze pierwszą wartość", () => {
    expect(firstValue(["a", "b"])).toBe("a")
  })

  it("zwraca undefined gdy brak wartości", () => {
    expect(firstValue(undefined)).toBeUndefined()
  })

  it("zwraca undefined dla pustej tablicy", () => {
    expect(firstValue([])).toBeUndefined()
  })
})
