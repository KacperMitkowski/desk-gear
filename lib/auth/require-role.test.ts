import { describe, expect, it, vi } from "vitest"

import { AppError } from "@/lib/errors/app-error"
import { UserRole } from "@/lib/generated/prisma"

import { auth } from "./auth"
import { requireRole } from "./require-role"

vi.mock("./auth", () => ({ auth: vi.fn() }))

describe("requireRole", () => {
  it("rzuca AppError('UNAUTHORIZED') gdy brak sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    await expect(requireRole([UserRole.ADMIN])).rejects.toBeInstanceOf(AppError)
    await expect(requireRole([UserRole.ADMIN])).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("rzuca AppError('FORBIDDEN') gdy rola nie pasuje", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "u1",
        email: "x@y.z",
        role: UserRole.CUSTOMER,
      },
      expires: new Date(Date.now() + 60_000).toISOString(),
    } as never)
    await expect(requireRole([UserRole.ADMIN])).rejects.toBeInstanceOf(AppError)
    await expect(requireRole([UserRole.ADMIN])).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
})
