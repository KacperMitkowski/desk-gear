import { describe, expect, it } from "vitest"

import { resolveErrorMessage, type Translate } from "./resolve-error-message"

const json = (obj: Record<string, unknown>) => JSON.stringify(obj)

describe("resolveErrorMessage", () => {
  it("zwraca surowy string gdy komunikat nie jest JSON-em (parse-fail)", () => {
    expect(resolveErrorMessage("po prostu tekst", "string")).toBe("po prostu tekst")
  })

  it("POZIOM 1: override jako funkcja dostaje params", () => {
    const msg = json({ code: "too_small", params: { minimum: 8 } })
    const result = resolveErrorMessage(msg, "string", {
      too_small: (params) => `min ${params.minimum} znaków`,
    })
    expect(result).toBe("min 8 znaków")
  })

  it("POZIOM 1: override jako string", () => {
    const msg = json({ code: "too_small", params: { minimum: 8 } })
    const result = resolveErrorMessage(msg, "string", { too_small: "Za krótkie" })
    expect(result).toBe("Za krótkie")
  })

  it("POZIOM 2/3: tłumaczenie przez wstrzyknięte t (klucz specyficzny)", () => {
    const t: Translate = (key) =>
      key === "errors.too_small.string" ? "Wymagane co najmniej 8 znaków" : key
    const msg = json({ code: "too_small", params: { minimum: 8 } })
    expect(resolveErrorMessage(msg, "string", undefined, t)).toBe("Wymagane co najmniej 8 znaków")
  })

  it("fallback z backendu gdy brak override i tłumaczenia", () => {
    const msg = json({ code: "EMAIL_ALREADY_EXISTS", fallback: "Email zajęty" })
    // domyślne t (identity) nie znajdzie tłumaczenia → fallback
    expect(resolveErrorMessage(msg, "string")).toBe("Email zajęty")
  })

  it("zwraca code gdy nie ma override, tłumaczenia ani fallbacku", () => {
    const msg = json({ code: "SOME_CODE" })
    expect(resolveErrorMessage(msg, "string")).toBe("SOME_CODE")
  })
})
