import { http, HttpResponse } from "msw"

export const handlers = [
  http.get("https://api.example.com/ping", () => {
    return HttpResponse.json({ status: "ok" })
  }),
]
