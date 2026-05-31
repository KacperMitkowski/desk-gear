export type ErrorMessageOverride = string | ((params: Record<string, unknown>) => string)

// Funkcja tłumacząca (i18n). Konwencja: gdy klucz nie istnieje, zwraca sam klucz (jak i18next).
export type Translate = (key: string, params?: Record<string, unknown>) => string

type ResolvedError = { code: string; params?: Record<string, unknown>; fallback?: string }

// Domyślny stub — i18n (sekcja 11) jeszcze nie istnieje. Zwraca klucz, więc lookupy POZIOMU 2/3
// "nie trafiają" i kaskada spada do fallbacku/code. Prawdziwe `t` wstrzykniemy w warstwie UI.
const identityT: Translate = (key) => key

// Trójwarstwowa kaskada nadpisywania komunikatów Zoda:
//   POZIOM 1 — override per pole (komponent), POZIOM 2 — własny kod ze schematu, POZIOM 3 — globalny i18n.
export function resolveErrorMessage(
  rhfErrorMessage: string,
  fieldType: "string" | "number" | "date",
  overrides?: Record<string, ErrorMessageOverride>,
  t: Translate = identityT,
): string {
  let parsed: ResolvedError
  try {
    parsed = JSON.parse(rhfErrorMessage)
  } catch {
    // Komunikat nie jest naszym JSON-em (np. surowy tekst) — zwracamy jak jest.
    return rhfErrorMessage
  }

  const { code, params = {}, fallback } = parsed

  // POZIOM 1: override z komponentu. Sprawdzamy `!== undefined`, żeby nie odrzucać poprawnego "" (np. ukrycie komunikatu).
  const override = overrides?.[code]
  if (override !== undefined) {
    return typeof override === "function" ? override(params) : override
  }

  // POZIOM 2 + 3: i18n lookup. Najpierw specyficzny (`${code}.${fieldType}`), potem generyczny.
  // Własny kod ze schematu (POZIOM 2, np. password_too_short) trafi w generyczny klucz.
  const specific = `errors.${code}.${fieldType}`
  const generic = `errors.${code}`

  const trySpecific = t(specific, params)
  if (trySpecific !== specific) return trySpecific

  const tryGeneric = t(generic, params)
  if (tryGeneric !== generic) return tryGeneric

  // Fallback z backendu, a w ostateczności sam kod. `!== undefined`, by nie odrzucać poprawnego "".
  if (fallback !== undefined) return fallback
  return code
}
