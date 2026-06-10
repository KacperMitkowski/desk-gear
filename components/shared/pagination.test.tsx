import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// next/link sprowadzamy do zwykłego <a> (jsdom nie ma routera). Przekazujemy `rest`, żeby zachować
// aria-disabled/tabIndex ustawiane przez komponent.
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: unknown; children: React.ReactNode }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}))

import { Pagination } from "./pagination"

describe("Pagination", () => {
  it("nie renderuje się gdy jest tylko jedna strona (pageCount <= 1)", () => {
    const buildHref = vi.fn((p: number) => `/x?page=${p}`)
    render(<Pagination page={1} pageCount={1} buildHref={buildHref} />)

    expect(screen.queryByRole("navigation")).toBeNull()
    expect(buildHref).not.toHaveBeenCalled()
  })

  it("renderuje prev/next + status gdy jest więcej stron", () => {
    render(<Pagination page={2} pageCount={5} buildHref={(p) => `/x?page=${p}`} />)

    expect(screen.getByRole("navigation", { name: "Paginacja" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Poprzednia" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Następna" })).toBeInTheDocument()
    expect(screen.getByText("Strona 2 z 5")).toBeInTheDocument()
  })

  it("buduje hrefy prev (page-1) i next (page+1) przez buildHref", () => {
    render(<Pagination page={3} pageCount={5} buildHref={(p) => `/x?page=${p}`} />)

    expect(screen.getByRole("link", { name: "Poprzednia" })).toHaveAttribute("href", "/x?page=2")
    expect(screen.getByRole("link", { name: "Następna" })).toHaveAttribute("href", "/x?page=4")
  })

  it("na pierwszej stronie wyłącza 'Poprzednia', zostawia aktywne 'Następna'", () => {
    render(<Pagination page={1} pageCount={3} buildHref={(p) => `/x?page=${p}`} />)

    expect(screen.getByRole("link", { name: "Poprzednia" })).toHaveAttribute(
      "aria-disabled",
      "true",
    )
    expect(screen.getByRole("link", { name: "Następna" })).toHaveAttribute("aria-disabled", "false")
  })

  it("na ostatniej stronie wyłącza 'Następna'", () => {
    render(<Pagination page={3} pageCount={3} buildHref={(p) => `/x?page=${p}`} />)

    expect(screen.getByRole("link", { name: "Następna" })).toHaveAttribute("aria-disabled", "true")
    expect(screen.getByRole("link", { name: "Poprzednia" })).toHaveAttribute(
      "aria-disabled",
      "false",
    )
  })
})
