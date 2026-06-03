import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { t } from "@/i18n/translate"

const mockUsePathname = vi.hoisted(() => vi.fn<() => string | null>())
vi.mock("next/navigation", () => ({ usePathname: mockUsePathname }))

import { AuthSwitchLink } from "./auth-switch-link"

describe("AuthSwitchLink", () => {
  beforeEach(() => mockUsePathname.mockReset())

  it("na /login proponuje rejestrację i linkuje na /register", () => {
    mockUsePathname.mockReturnValue("/login")
    render(<AuthSwitchLink />)

    expect(screen.getByText(t("auth.login.noAccount"), { exact: false })).toBeInTheDocument()
    const link = screen.getByRole("link", { name: t("auth.login.createAccount") })
    expect(link).toHaveAttribute("href", "/register")
  })

  it("na /register proponuje logowanie i linkuje na /login", () => {
    mockUsePathname.mockReturnValue("/register")
    render(<AuthSwitchLink />)

    expect(screen.getByText(t("auth.register.haveAccount"), { exact: false })).toBeInTheDocument()
    const link = screen.getByRole("link", { name: t("auth.register.signIn") })
    expect(link).toHaveAttribute("href", "/login")
  })

  it("przy null pathname defaultuje do trybu login (link na /register)", () => {
    mockUsePathname.mockReturnValue(null)
    render(<AuthSwitchLink />)

    const link = screen.getByRole("link", { name: t("auth.login.createAccount") })
    expect(link).toHaveAttribute("href", "/register")
  })
})
