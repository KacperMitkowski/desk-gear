import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// next/image i next/link sprowadzamy do prostych elementów DOM (jsdom nie ma routera/optymalizacji obrazów).
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // `fill` nie jest poprawnym atrybutem <img> (React by ostrzegał) — odrzucamy go.
    const imgProps = { ...props }
    delete imgProps.fill
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...imgProps} />
  },
}))
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: unknown; children: React.ReactNode }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}))

import type { ProductListItem } from "@/features/products/repositories/product.repository"
import { toMoney } from "@/lib/money/types"

import { ProductCard } from "./product-card"

function makeProduct(overrides: Partial<ProductListItem> = {}): ProductListItem {
  return {
    id: "p1",
    slug: "keyboard-1",
    name: "Mechaniczna Klawiatura 1",
    brand: "Keychron",
    isFeatured: false,
    primaryImage: { path: "/products/keyboards-1.jpg", alt: "Zdjęcie główne" },
    priceFrom: toMoney("249.00"),
    inStock: true,
    ...overrides,
  }
}

describe("ProductCard", () => {
  it("renderuje nazwę, markę i cenę 'od'", () => {
    render(<ProductCard product={makeProduct()} />)

    expect(screen.getByText("Mechaniczna Klawiatura 1")).toBeInTheDocument()
    expect(screen.getByText("Keychron")).toBeInTheDocument()
    expect(screen.getByText(/249,00/)).toBeInTheDocument()
  })

  it("pokazuje badge 'Bestseller' gdy produkt jest wyróżniony", () => {
    render(<ProductCard product={makeProduct({ isFeatured: true })} />)
    expect(screen.getByText("Bestseller")).toBeInTheDocument()
  })

  it("nie pokazuje badge gdy produkt nie jest wyróżniony", () => {
    render(<ProductCard product={makeProduct({ isFeatured: false })} />)
    expect(screen.queryByText("Bestseller")).not.toBeInTheDocument()
  })

  it("linkuje do PDP po slug", () => {
    render(<ProductCard product={makeProduct({ slug: "mouse-3" })} />)
    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/mouse-3")
  })

  it("renderuje obrazek główny z alt", () => {
    render(<ProductCard product={makeProduct()} />)
    expect(screen.getByAltText("Zdjęcie główne")).toBeInTheDocument()
  })

  it("pokazuje placeholder zamiast obrazka gdy brak primaryImage", () => {
    render(<ProductCard product={makeProduct({ primaryImage: null })} />)
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })

  it("nie renderuje marki gdy brand jest null", () => {
    render(<ProductCard product={makeProduct({ brand: null })} />)
    expect(screen.queryByText("Keychron")).not.toBeInTheDocument()
  })
})
