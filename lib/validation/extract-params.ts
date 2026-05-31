// Strukturalny typ pokrywający pola, które czytamy z issue Zoda. Dzięki temu funkcja przyjmuje
// zarówno $ZodIssue (z ZodError.issues), jak i $ZodRawIssue (z globalnego customError) — te dwa
// typy różnią się opcjonalnością `input`/`message`/`path`, więc celujemy w ich wspólny kształt.
type IssueParams = {
  code: string
  minimum?: unknown
  maximum?: unknown
  inclusive?: unknown
  expected?: unknown
  format?: unknown
}

// Wyciąga parametry istotne dla danego kodu błędu Zoda, żeby UI mogło je wstrzyknąć do tłumaczenia
// (np. "Wymagane co najmniej {minimum} znaków"). Współdzielone przez zod-error-map.ts (globalna mapa)
// i to-action-result.ts (mapowanie ZodError → fieldErrors) — jedno źródło prawdy.
export function extractParams(issue: IssueParams): Record<string, unknown> {
  switch (issue.code) {
    case "too_small":
      return { minimum: issue.minimum, inclusive: issue.inclusive }
    case "too_big":
      return { maximum: issue.maximum, inclusive: issue.inclusive }
    case "invalid_type":
      // Zod 4: issue invalid_type ma tylko `expected` (brak `received`).
      return { expected: issue.expected }
    case "invalid_format":
      return { format: issue.format }
    default:
      return {}
  }
}
