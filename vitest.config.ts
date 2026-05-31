import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    reporters: ["tree"],
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["**/*.test.{ts,tsx}"],
          exclude: ["**/node_modules/**", "**/.next/**", "tests/integration/**", "tests/e2e/**"],
          setupFiles: ["./tests/setup.unit.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.integration.test.ts"],
          setupFiles: ["./tests/setup.integration.ts"],
        },
      },
    ],
  },
})
