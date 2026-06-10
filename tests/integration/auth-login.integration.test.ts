import { beforeEach, describe, expect, it, vi } from "vitest"

// Mockujemy całą instancję Auth.js — prawdziwy signIn wymaga kontekstu request/cookies, którego
// nie ma w środowisku node. Weryfikujemy mapowanie wyników na ActionResult (3 scenariusze z AC).
// Realna sesja/JWT jest sprawdzana w E2E (tests/e2e/login.spec.ts).
vi.mock("@/lib/auth/auth", () => ({ signIn: vi.fn() }))

// Mockujemy też pakiet next-auth — jego realny import ciągnie `next/server`, którego node-owe
// środowisko Vitest nie rozwiązuje. Potrzebujemy tylko klasy AuthError; akcja i test dostają tę
// samą (zmockowaną) klasę, więc `instanceof AuthError` w akcji działa poprawnie.
vi.mock("next-auth", () => {
  class AuthError extends Error {
    constructor(message?: string) {
      super(message)
      this.name = "AuthError"
    }
  }
  return { AuthError }
})

import { AuthError } from "next-auth"

import { loginAction } from "@/features/auth/actions"
import { signIn } from "@/lib/auth/auth"

const mockSignIn = vi.mocked(signIn)

describe("loginAction", () => {
  beforeEach(() => {
    mockSignIn.mockReset()
  })

  it("zły email → błąd walidacji, signIn nie jest wołane", async () => {
    const result = await loginAction({ email: "niepoprawny", password: "haslo123" })

    expect(result.status).toBe("error")
    if (result.status === "error") {
      expect(result.error.type).toBe("validation")
    }
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it("błędne dane (signIn rzuca AuthError) → błąd auth ze spójnym komunikatem", async () => {
    mockSignIn.mockRejectedValue(new AuthError("CredentialsSignin"))

    const result = await loginAction({ email: "admin@desk-gear.local", password: "zle-haslo" })

    expect(result.status).toBe("error")
    if (result.status === "error") {
      expect(result.error.type).toBe("auth")
      expect(result.error.message).toBe("errors.INVALID_CREDENTIALS")
    }
  })

  it("poprawne dane → signIn(redirect:false) + redirectTo na callbackUrl", async () => {
    mockSignIn.mockResolvedValue(undefined as never)

    const result = await loginAction(
      { email: "admin@desk-gear.local", password: "ChangeMe1234!" },
      "/products",
    )

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "admin@desk-gear.local",
      password: "ChangeMe1234!",
      redirect: false,
    })
    expect(result.status).toBe("success")
    if (result.status === "success") {
      expect(result.data.redirectTo).toBe("/products")
    }
  })

  it("niebezpieczny callbackUrl (absolute URL) → redirectTo wraca do / (anti-open-redirect)", async () => {
    mockSignIn.mockResolvedValue(undefined as never)

    const result = await loginAction(
      { email: "admin@desk-gear.local", password: "ChangeMe1234!" },
      "https://evil.com/steal",
    )

    expect(result.status).toBe("success")
    if (result.status === "success") {
      expect(result.data.redirectTo).toBe("/")
    }
  })

  it("protocol-relative callbackUrl (//evil.com) → redirectTo wraca do /", async () => {
    mockSignIn.mockResolvedValue(undefined as never)

    const result = await loginAction(
      { email: "admin@desk-gear.local", password: "ChangeMe1234!" },
      "//evil.com/steal",
    )

    expect(result.status).toBe("success")
    if (result.status === "success") {
      expect(result.data.redirectTo).toBe("/")
    }
  })
})
