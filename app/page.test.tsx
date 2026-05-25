import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import Home from "./page"

describe("Home page", () => {
  it("renders the TEST marker", () => {
    render(<Home />)
    expect(screen.getByText("TEST")).toBeInTheDocument()
  })
})
