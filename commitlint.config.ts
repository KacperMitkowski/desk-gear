import type { UserConfig } from "@commitlint/types"

const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feature", "hotfix", "refactor", "test", "docs", "chore"]],
    "scope-enum": [
      2,
      "always",
      [
        "products",
        "cart",
        "orders",
        "checkout",
        "auth",
        "admin",
        "ui",
        "form",
        "i18n",
        "db",
        "config",
        "deps",
      ],
    ],
    "subject-case": [2, "always", "lower-case"],
    "subject-max-length": [2, "always", 100],
  },
}

export default config
