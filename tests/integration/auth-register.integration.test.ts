import { beforeEach, describe, expect, it, vi } from "vitest"

// Mockujemy bazę — sprawdzamy pipeline akcji (walidacja → service → redirectTo /login), nie realny zapis.
// prisma.user.create jest sterowane per test (zwraca usera albo rzuca P2002). Rejestracja NIE
// loguje usera automatycznie — signIn po sukcesie nie powinno być wołane.
vi.mock("@/lib/db/prisma", () => ({
  prisma: { user: { create: vi.fn() } },
}))

// Mockujemy instancję Auth.js — realny signIn wymaga kontekstu request/cookies (brak w node).
vi.mock("@/lib/auth/auth", () => ({ signIn: vi.fn() }))

// next-auth realnie ciągnie next/server, którego node-owy Vitest nie rozwiązuje — potrzebujemy tylko AuthError.
vi.mock("next-auth", () => {
  class AuthError extends Error {
    constructor(message?: string) {
      super(message)
      this.name = "AuthError"
    }
  }
  return { AuthError }
})

import { registerAction } from "@/features/auth/actions"
import { signIn } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@/lib/generated/prisma"

const mockCreate = vi.mocked(prisma.user.create)
const mockSignIn = vi.mocked(signIn)

const VALID_INPUT = {
  email: "nowy@desk-gear.local",
  password: "MocneHaslo123",
  confirmPassword: "MocneHaslo123",
  acceptTerms: true,
}

describe("registerAction", () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockSignIn.mockReset()
  })

  it("duplikat email (P2002) → błąd business EMAIL_ALREADY_EXISTS bez fieldErrors, signIn nie wołane", async () => {
    mockCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    )

    const result = await registerAction(VALID_INPUT)

    expect(result.status).toBe("error")
    if (result.status === "error") {
      expect(result.error.type).toBe("business")
      expect(result.error.message).toBe("errors.EMAIL_ALREADY_EXISTS")
      // registerAction rzuca `new AppError("EMAIL_ALREADY_EXISTS")` bez field-a — więc
      // fieldErrors jest undefined. Front pokaże tylko toast, bez inline pod inputem.
      expect(result.error.fieldErrors).toBeUndefined()
    }
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  // Pilnujemy że filtr w registerAction zawęża się WYŁĄCZNIE do P2002. Każdy inny błąd
  // Prismy (np. P1001 = brak DB) musi lecieć przez catch-all w toActionResult — bez mapowania
  // na business, bez fieldError pod emailem (bo to nie jest konflikt unikalności, tylko infra).
  it("inny błąd Prismy (np. P1001 — brak DB) → type 'server' + traceId, nie mapowany na business", async () => {
    mockCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Can't reach database server", {
        code: "P1001",
        clientVersion: "test",
      }),
    )

    const result = await registerAction(VALID_INPUT)

    expect(result.status).toBe("error")
    if (result.status === "error") {
      expect(result.error.type).toBe("server")
      expect(result.error.message).toBe("errors.unexpected")
      expect(typeof result.error.traceId).toBe("string")
      expect(result.error.fieldErrors).toBeUndefined()
    }
  })

  it("poprawne dane → user utworzony, auto-login signIn(redirect:false) + redirectTo /account", async () => {
    mockCreate.mockResolvedValue({ id: "u1", email: VALID_INPUT.email } as never)
    mockSignIn.mockResolvedValue(undefined as never)

    const result = await registerAction(VALID_INPUT)

    expect(mockCreate).toHaveBeenCalledOnce()
    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: VALID_INPUT.email,
      password: VALID_INPUT.password,
      redirect: false,
    })
    expect(result.status).toBe("success")
    if (result.status === "success") {
      expect(result.data.redirectTo).toBe("/account")
    }
  })

  it("błąd walidacji (hasła różne) → type validation, user nie tworzony", async () => {
    const result = await registerAction({ ...VALID_INPUT, confirmPassword: "InneHaslo123" })

    expect(result.status).toBe("error")
    if (result.status === "error") {
      expect(result.error.type).toBe("validation")
    }
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("błąd walidacji (brak akceptacji regulaminu) → type validation, user nie tworzony", async () => {
    const result = await registerAction({ ...VALID_INPUT, acceptTerms: false })

    expect(result.status).toBe("error")
    if (result.status === "error") {
      expect(result.error.type).toBe("validation")
    }
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
