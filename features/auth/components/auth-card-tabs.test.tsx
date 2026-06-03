import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { t } from "@/i18n/translate"

const mockUsePathname = vi.hoisted(() => vi.fn<() => string | null>())
vi.mock("next/navigation", () => ({ usePathname: mockUsePathname }))

import { AuthCardTabs } from "./auth-card-tabs"

describe("AuthCardTabs", () => {
  beforeEach(() => mockUsePathname.mockReset())

  it("na /login aktywny tab 'Zaloguj się' nie jest linkiem, 'Utwórz konto' linkuje na /register", () => {
    mockUsePathname.mockReturnValue("/login")
    render(<AuthCardTabs />)

    // Aktywny: span (nie link), z aria-current="page" i data-state="active".
    const signIn = screen.getByText(t("auth.tabs.signIn"))
    expect(signIn.tagName).toBe("SPAN")
    expect(signIn).toHaveAttribute("aria-current", "page")
    expect(signIn).toHaveAttribute("data-state", "active")

    // Nieaktywny: link z href.
    const createAccount = screen.getByRole("link", { name: t("auth.tabs.createAccount") })
    expect(createAccount).toHaveAttribute("href", "/register")
    expect(createAccount).not.toHaveAttribute("aria-current", "page")
    expect(createAccount).toHaveAttribute("data-state", "inactive")
  })

  it("na /register aktywny tab 'Utwórz konto' nie jest linkiem, 'Zaloguj się' linkuje na /login", () => {
    mockUsePathname.mockReturnValue("/register")
    render(<AuthCardTabs />)

    const createAccount = screen.getByText(t("auth.tabs.createAccount"))
    expect(createAccount.tagName).toBe("SPAN")
    expect(createAccount).toHaveAttribute("aria-current", "page")
    expect(createAccount).toHaveAttribute("data-state", "active")

    const signIn = screen.getByRole("link", { name: t("auth.tabs.signIn") })
    expect(signIn).toHaveAttribute("href", "/login")
    expect(signIn).not.toHaveAttribute("aria-current", "page")
    expect(signIn).toHaveAttribute("data-state", "inactive")
  })

  it("zagnieżdżona ścieżka /register/step-2 też traktowana jako rejestracja (startsWith)", () => {
    mockUsePathname.mockReturnValue("/register/step-2")
    render(<AuthCardTabs />)

    const createAccount = screen.getByText(t("auth.tabs.createAccount"))
    expect(createAccount.tagName).toBe("SPAN")
    expect(createAccount).toHaveAttribute("aria-current", "page")
  })

  it("aktywnego taba nie da się kliknąć (nie ma roli link)", () => {
    mockUsePathname.mockReturnValue("/login")
    render(<AuthCardTabs />)

    // Jedyny link to ten nieaktywny — aktywny jest renderowany jako span.
    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAccessibleName(t("auth.tabs.createAccount"))
  })
})
