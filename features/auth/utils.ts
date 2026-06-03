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
