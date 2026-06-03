import { describe, expect, it } from "vitest"

import { isPrismaErrorCode, isSafeRedirectPath } from "./utils"

describe("isPrismaErrorCode", () => {
  it("zwraca true dla obiektu Prisma z dokładnym kodem", () => {
    const err = { code: "P2002", meta: { target: ["email"] } }
    expect(isPrismaErrorCode(err, "P2002")).toBe(true)
  })

  it("zwraca false gdy code się nie zgadza", () => {
    expect(isPrismaErrorCode({ code: "P2003" }, "P2002")).toBe(false)
  })

  it("zwraca false dla null/undefined (defensive — nie wybuchnie na pustym wejściu)", () => {
    expect(isPrismaErrorCode(null, "P2002")).toBe(false)
    expect(isPrismaErrorCode(undefined, "P2002")).toBe(false)
  })

  it("zwraca false dla prymitywów (string/number/boolean)", () => {
    expect(isPrismaErrorCode("P2002", "P2002")).toBe(false)
    expect(isPrismaErrorCode(42, "P2002")).toBe(false)
    expect(isPrismaErrorCode(true, "P2002")).toBe(false)
  })

  it("zwraca false dla obiektu bez pola code", () => {
    expect(isPrismaErrorCode({}, "P2002")).toBe(false)
    expect(isPrismaErrorCode({ message: "boom" }, "P2002")).toBe(false)
  })

  it("zwraca false gdy code jest nie-stringiem (strict ===)", () => {
    // Liczba 2002 nie matchuje stringa "P2002" — strict equality nie konwertuje typów.
    expect(isPrismaErrorCode({ code: 2002 }, "P2002")).toBe(false)
    expect(isPrismaErrorCode({ code: undefined }, "P2002")).toBe(false)
    expect(isPrismaErrorCode({ code: null }, "P2002")).toBe(false)
  })

  it("działa na instancji Error z dodanym polem code (case z natywnymi błędami node)", () => {
    const err = Object.assign(new Error("boom"), { code: "P2002" })
    expect(isPrismaErrorCode(err, "P2002")).toBe(true)
  })
})

describe("isSafeRedirectPath", () => {
  it("akceptuje ścieżki względne zaczynające się od /", () => {
    expect(isSafeRedirectPath("/account")).toBe(true)
    expect(isSafeRedirectPath("/account/orders/123")).toBe(true)
    expect(isSafeRedirectPath("/")).toBe(true)
  })

  it("odrzuca undefined / pusty string (brak callbackUrl)", () => {
    expect(isSafeRedirectPath(undefined)).toBe(false)
    expect(isSafeRedirectPath("")).toBe(false)
  })

  it("odrzuca absolute URL-e (CWE-601: open redirect na cudzą domenę)", () => {
    expect(isSafeRedirectPath("https://evil.com/steal")).toBe(false)
    expect(isSafeRedirectPath("http://evil.com")).toBe(false)
    expect(isSafeRedirectPath("ftp://evil.com")).toBe(false)
    expect(isSafeRedirectPath("javascript:alert(1)")).toBe(false)
  })

  it("odrzuca protocol-relative URL (//evil.com — przeglądarka traktuje to jak https://evil.com)", () => {
    expect(isSafeRedirectPath("//evil.com")).toBe(false)
    expect(isSafeRedirectPath("//evil.com/steal")).toBe(false)
  })

  it("odrzuca ścieżki bez wiodącego / (nie wiemy gdzie nas wyśle przeglądarka)", () => {
    expect(isSafeRedirectPath("account")).toBe(false)
    expect(isSafeRedirectPath("evil.com")).toBe(false)
  })

  it("acts as type guard — narrowing url do string", () => {
    const url: string | undefined = "/account"
    if (isSafeRedirectPath(url)) {
      // Sprawdzenie typu kompilacyjnie — url ma już typ string, nie string | undefined.
      const _: string = url
      expect(_).toBe("/account")
    } else {
      throw new Error("powinno przejść")
    }
  })
})
