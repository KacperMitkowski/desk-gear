import { describe, it, expect } from "vitest"
import { add } from "./add"

describe("add", () => {
  it("sums two positive integers", () => {
    expect(add(2, 2)).toBe(4)
  })
})
