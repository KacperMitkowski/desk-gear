import { describe, expect, it } from "vitest"

import { t } from "@/i18n/translate"

import { resolveErrorMessage, type Translate } from "./resolve-error-message"

const json = (obj: Record<string, unknown>) => JSON.stringify(obj)

describe("resolveErrorMessage", () => {
  it("gdy komunikat nie jest naszym JSON-em, zwraca go w niezmienionej postaci", () => {
    expect(resolveErrorMessage("po prostu tekst", "string")).toBe("po prostu tekst")
  })

  it("override pola w postaci funkcji otrzymuje parametry błędu i sam buduje komunikat", () => {
    const msg = json({ code: "too_small", params: { minimum: 8 } })
    const result = resolveErrorMessage(msg, "string", {
      too_small: (params) => `min ${params.minimum} znaków`,
    })
    expect(result).toBe("min 8 znaków")
  })

  it("override pola w postaci stałego tekstu zastępuje komunikat", () => {
    const msg = json({ code: "too_small", params: { minimum: 8 } })
    const result = resolveErrorMessage(msg, "string", { too_small: "Za krótkie" })
    expect(result).toBe("Za krótkie")
  })

  it("gdy nie ma override, tłumaczy przez wstrzyknięte t używając klucza specyficznego dla typu pola", () => {
    const t: Translate = (key) =>
      key === "errors.too_small.string" ? "Wymagane co najmniej 8 znaków" : key
    const msg = json({ code: "too_small", params: { minimum: 8 } })
    expect(resolveErrorMessage(msg, "string", undefined, t)).toBe("Wymagane co najmniej 8 znaków")
  })

  it("gdy brak override i tłumaczenia, używa fallbacku przekazanego z backendu", () => {
    const msg = json({ code: "EMAIL_ALREADY_EXISTS", fallback: "Email zajęty" })
    // domyślne t (identity) nie znajdzie tłumaczenia → fallback
    expect(resolveErrorMessage(msg, "string")).toBe("Email zajęty")
  })

  it("gdy nie ma override, tłumaczenia ani fallbacku, zwraca surowy kod błędu", () => {
    const msg = json({ code: "SOME_CODE" })
    expect(resolveErrorMessage(msg, "string")).toBe("SOME_CODE")
  })

  it("integracja z i18n: prawdziwe t i errors.json tłumaczą błąd walidacji Zoda na polski komunikat", () => {
    const msg = json({ code: "too_small", params: { minimum: 8 } })
    expect(resolveErrorMessage(msg, "string", undefined, t)).toBe("Wymagane co najmniej 8 znaków")
  })
})
