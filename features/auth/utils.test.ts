import { describe, expect, it } from "vitest"

import { isPrismaErrorCode } from "./utils"

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
