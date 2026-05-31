// Next.js 16: register() odpala się raz przy starcie aplikacji (node + edge runtime).
// Importujemy globalną mapę błędów Zoda jako side-effect, żeby była zainstalowana zanim
// jakikolwiek schemat zacznie parsować dane.
export async function register() {
  await import("@/lib/validation/zod-error-map")
}
