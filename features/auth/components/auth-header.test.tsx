import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { t } from "@/i18n/translate"

// Mock next/navigation per test — usePathname jest jedynym hookiem którego komponent używa,
// sterujemy nim po wartości stringa zamiast routera.
const mockUsePathname = vi.hoisted(() => vi.fn<() => string | null>())
vi.mock("next/navigation", () => ({ usePathname: mockUsePathname }))

import { AuthHeader } from "./auth-header"

describe("AuthHeader", () => {
  beforeEach(() => mockUsePathname.mockReset())

  it("na /login pokazuje subtitle logowania", () => {
    mockUsePathname.mockReturnValue("/login")
    render(<AuthHeader />)

    expect(screen.getByText(t("auth.login.subtitle"))).toBeInTheDocument()
    expect(screen.queryByText(t("auth.register.subtitle"))).not.toBeInTheDocument()
  })

  it("na /register pokazuje subtitle rejestracji", () => {
    mockUsePathname.mockReturnValue("/register")
    render(<AuthHeader />)

    expect(screen.getByText(t("auth.register.subtitle"))).toBeInTheDocument()
    expect(screen.queryByText(t("auth.login.subtitle"))).not.toBeInTheDocument()
  })

  it("przy null/nieznanym pathname defaultuje do login (bezpieczna gałąź)", () => {
    mockUsePathname.mockReturnValue(null)
    render(<AuthHeader />)

    expect(screen.getByText(t("auth.login.subtitle"))).toBeInTheDocument()
  })

  it("logo DESKGEAR zawsze linkuje na /", () => {
    mockUsePathname.mockReturnValue("/login")
    render(<AuthHeader />)

    const link = screen.getByRole("link", { name: /DESKGEAR/i })
    expect(link).toHaveAttribute("href", "/")
  })
})
