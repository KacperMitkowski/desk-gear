import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"
import prettier from "eslint-config-prettier"

const eslintConfig = [
  { ignores: ["lib/generated/**", ".next/**", "node_modules/**"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettier,
]

export default eslintConfig
