import { config } from "dotenv"
import { afterAll, afterEach, beforeAll } from "vitest"
import { server } from "./mocks/server"

// Testy integracyjne uderzają w realną bazę (Prisma → env.DATABASE_URL). Vitest nie ładuje
// env do process.env, a @next/env przy NODE_ENV=test celowo pomija .env.local — dlatego
// ładujemy .env.local (z fallbackiem na .env) wprost przez dotenv.
config({ path: [".env.local", ".env"] })

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
