import { describe, expect, it } from "vitest"
import * as z from "zod"

// Import dla efektu — instaluje globalną mapę błędów przed parsowaniem.
import "./zod-error-map"

describe("zod-error-map", () => {
  it("zwraca komunikat jako JSON z code i params", () => {
    const result = z.string().min(8).safeParse("x")
    expect(result.success).toBe(false)
    const parsed = JSON.parse(result.error!.issues[0]!.message)
    expect(parsed.code).toBe("too_small")
    // params jest nadzbiorem ({minimum, inclusive}) — asercja na minimum.
    expect(parsed.params.minimum).toBe(8)
  })

  it("dla invalid_type zwraca code i expected w params", () => {
    const result = z.string().safeParse(123)
    const parsed = JSON.parse(result.error!.issues[0]!.message)
    expect(parsed.code).toBe("invalid_type")
    expect(parsed.params.expected).toBe("string")
  })
})
