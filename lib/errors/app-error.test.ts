import { describe, expect, it } from "vitest"

import { AppError, AppErrors } from "./app-error"

describe("AppError", () => {
  it("ustawia code, domyślne params i brak field", () => {
    const err = new AppError("UNAUTHORIZED")
    expect(err).toBeInstanceOf(Error)
    expect(err.code).toBe("UNAUTHORIZED")
    expect(err.params).toEqual({})
    expect(err.field).toBeUndefined()
    expect(err.message).toBe("UNAUTHORIZED")
    expect(err.name).toBe("AppError")
  })

  it("przyjmuje params i field", () => {
    const err = new AppError("INSUFFICIENT_STOCK", { available: 2 }, "quantity")
    expect(err.params).toEqual({ available: 2 })
    expect(err.field).toBe("quantity")
  })
})

describe("AppErrors", () => {
  it("emailExists ustawia code, params i field", () => {
    const err = AppErrors.emailExists("x@y.z")
    expect(err).toBeInstanceOf(AppError)
    expect(err.code).toBe("EMAIL_ALREADY_EXISTS")
    expect(err.params).toEqual({ email: "x@y.z" })
    expect(err.field).toBe("email")
  })

  it("insufficientStock ustawia code i params", () => {
    const err = AppErrors.insufficientStock(1, 5)
    expect(err.code).toBe("INSUFFICIENT_STOCK")
    expect(err.params).toEqual({ available: 1, requested: 5 })
    expect(err.field).toBeUndefined()
  })
})
