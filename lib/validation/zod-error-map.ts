import * as z from "zod"

import { extractParams } from "./extract-params"

// Globalna mapa błędów Zoda (POZIOM 3 kaskady). Zamiast gotowego tekstu zwraca JSON `{code, params}`,
// który UI tłumaczy przez i18n (patrz resolve-error-message.ts). Import tego modułu = instalacja mapy
// (side-effect) — robione raz na starcie w instrumentation.ts, przed jakimkolwiek parsowaniem.
z.config({
  customError: (issue) => ({
    message: JSON.stringify({
      code: issue.code,
      params: extractParams(issue),
    }),
  }),
})
