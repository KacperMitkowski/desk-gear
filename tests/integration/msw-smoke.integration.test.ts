import { describe, it, expect } from "vitest"

describe("MSW smoke", () => {
  it("intercepts HTTP requests via mocked handler", async () => {
    const response = await fetch("https://api.example.com/ping")
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ status: "ok" })
  })
})
