import { describe, expect, it } from "vitest"

import { t } from "./translate"

describe("t (i18n helper)", () => {
  it("podstawia wartości z params w miejsce placeholderów {param}", () => {
    expect(t("errors.too_small.string", { minimum: 8 })).toBe("Wymagane co najmniej 8 znaków")
  })

  it("zwraca gotowe tłumaczenie, gdy nie podano params", () => {
    expect(t("errors.invalid_email")).toBe("Nieprawidłowy adres email")
  })

  it("gdy brak tłumaczenia dla klucza, zwraca sam klucz (fallback)", () => {
    expect(t("nonexistent.key")).toBe("nonexistent.key")
  })

  it("rozwiązuje zagnieżdżony klucz i podstawia params", () => {
    expect(t("errors.too_big.string", { maximum: 20 })).toBe("Dozwolone najwyżej 20 znaków")
  })

  it("znajduje klucz scalony z innego pliku tłumaczeń (nav.json)", () => {
    expect(t("nav.dashboard")).toBe("Panel")
  })

  it("pozostawia nietknięty placeholder, dla którego brakuje wartości w params", () => {
    expect(t("errors.too_small.string")).toBe("Wymagane co najmniej {minimum} znaków")
  })

  it("zwraca sam klucz, gdy wskazuje on na obiekt, a nie na pojedynczy tekst", () => {
    expect(t("errors.too_small")).toBe("errors.too_small")
  })
})
