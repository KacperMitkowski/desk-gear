// Ducktyping na błąd Prismy po polu `code` zamiast `instanceof Prisma.PrismaClientKnownRequestError`.
// Powód: pod Turbopack/HMR generowany klient ląduje w wielu module-layerach (server-action vs
// service vs runtime), tożsamości klas się rozjeżdżają i instanceof zwraca false. Kontrakt
// Prismy jest stabilny: pole `code` to string „P" + cyfry (P1xxx-P6xxx) — patrz
// https://www.prisma.io/docs/orm/reference/error-reference.
export function isPrismaErrorCode(err: unknown, code: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === code
  )
}

// Akceptujemy tylko ścieżki względne ("/foo/bar"). Odrzucamy protocol-relative URL ("//evil.com")
// i wszystkie absolutne URL-e — inaczej atakujący mógłby podać `?callbackUrl=https://evil.com`
// i wykorzystać formularz logowania jako open redirect (CWE-601). Walidacja MUSI być na serwerze:
// klient jest źródłem nieufnego inputu, nie można mu ufać że callbackUrl jest „nasz".
//
// Walidacja per-form (każda osobno musi przejść), żeby zablokować bypassy przez percent-encoding:
// - Surowy URL — łapie literalne `//evil.com`, znaki kontrolne w sygnale (CRLF injection).
// - Decoded (`decodeURIComponent`) — łapie `/%2Fevil.com` → `//evil.com`, `/%5Cevil.com` → `/\…`,
//   `/%0ALocation:…` → `/\nLocation:…` (HTTP response splitting).
// - Double-decoded — łapie double-encoding (`/%252Fevil.com` → `/%2Fevil.com` → `//evil.com`).
// Dla każdej formy wymagamy: zaczyna się od `/`, nie zaczyna od `//` (protocol-relative) ani
// `/\` (niektóre przeglądarki normalizują backslash do slash), brak znaków kontrolnych.
const CONTROL_CHARS = /[\x00-\x1F\x7F]/

function safeDecode(s: string): string | null {
  try {
    return decodeURIComponent(s)
  } catch {
    // malformowane percent-encoding (np. `%ZZ`) — odrzucamy w całości.
    return null
  }
}

function isCleanRelativePath(form: string): boolean {
  if (!form.startsWith("/")) return false
  if (form.startsWith("//") || form.startsWith("/\\")) return false
  if (CONTROL_CHARS.test(form)) return false
  return true
}

export function isSafeRedirectPath(url: string | undefined): url is string {
  if (!url) return false
  if (!isCleanRelativePath(url)) return false

  const decoded = safeDecode(url)
  if (decoded === null || !isCleanRelativePath(decoded)) return false

  // Double-decode na wypadek `/%252Fevil.com` (% → %25 → %). Jeśli nie udało się rozkodować
  // jeszcze raz (już nie ma percent-encoding-u), to OK — single-decoded już zwalidowane.
  const doubleDecoded = safeDecode(decoded)
  if (doubleDecoded !== null && !isCleanRelativePath(doubleDecoded)) return false

  return true
}
