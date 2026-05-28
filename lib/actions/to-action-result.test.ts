import { describe, expect, it } from "vitest"
import * as z from "zod"

import { AppError } from "@/lib/errors/app-error"

import { toActionResult } from "./to-action-result"

describe("toActionResult", () => {
  it("zwraca success gdy fn się powiedzie", async () => {
    const result = await toActionResult(async () => 42)
    expect(result).toEqual({ status: "success", data: 42 })
  })

  it("ZodError → type validation z fieldErrors", async () => {
    const result = await toActionResult(async () => z.string().min(8).parse("x"))
    expect(result.status).toBe("error")
    if (result.status !== "error") return
    expect(result.error.type).toBe("validation")
    expect(result.error.message).toBe("errors.validation.failed")
    expect(result.error.fieldErrors?.[0]?.code).toBe("too_small")
    expect(result.error.fieldErrors?.[0]?.params).toMatchObject({ minimum: 8 })
  })

  it("AppError bez field → type business", async () => {
    const result = await toActionResult(async () => {
      throw new AppError("INSUFFICIENT_STOCK", { available: 1 })
    })
    expect(result.status).toBe("error")
    if (result.status !== "error") return
    expect(result.error.type).toBe("business")
    expect(result.error.message).toBe("errors.INSUFFICIENT_STOCK")
    expect(result.error.fieldErrors).toBeUndefined()
  })

  it("AppError UNAUTHORIZED → type auth", async () => {
    const result = await toActionResult(async () => {
      throw new AppError("UNAUTHORIZED")
    })
    expect(result.status).toBe("error")
    if (result.status !== "error") return
    expect(result.error.type).toBe("auth")
  })

  it("nieznany błąd → type server z traceId", async () => {
    const result = await toActionResult(async () => {
      throw new Error("boom")
    })
    expect(result.status).toBe("error")
    if (result.status !== "error") return
    expect(result.error.type).toBe("server")
    expect(result.error.traceId).toBeTruthy()
  })
})
