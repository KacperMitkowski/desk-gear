import { beforeEach, describe, expect, it, vi } from "vitest"

// Mockujemy bazę — sprawdzamy pipeline akcji (walidacja → service → signIn → redirect), nie realny zapis.
// prisma.user.create jest sterowane per test (zwraca usera albo rzuca P2002).
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

// redirect() przy sukcesie rzuca NEXT_REDIRECT — mockujemy je rozpoznawalnym błędem.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

import { redirect } from "next/navigation"

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

  it("duplikat email (P2002) → błąd business EMAIL_ALREADY_EXISTS przy polu email, signIn nie wołane", async () => {
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
      expect(result.error.fieldErrors?.[0]?.path).toEqual(["email"])
    }
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it("poprawne dane → user utworzony, auto-login signIn(redirect:false) + redirect na /account", async () => {
    mockCreate.mockResolvedValue({ id: "u1", email: VALID_INPUT.email } as never)
    mockSignIn.mockResolvedValue(undefined as never)

    await expect(registerAction(VALID_INPUT)).rejects.toThrow("REDIRECT:/account")

    expect(mockCreate).toHaveBeenCalledOnce()
    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: VALID_INPUT.email,
      password: VALID_INPUT.password,
      redirect: false,
    })
    expect(redirect).toHaveBeenCalledWith("/account")
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
