// Next.js 16: instrumentation-client.ts ładuje się raz po załadowaniu HTML, ale jeszcze
// przed hydration React i przed jakąkolwiek interakcją użytkownika. Bliźniak
// instrumentation.ts (sekcja 6, ARCHITECTURE.md) — instaluje globalną mapę błędów Zoda
// po stronie przeglądarki, żeby RHF + zodResolver dostawały JSON {code, params} zamiast
// gołych angielskich komunikatów.
import "@/lib/validation/zod-error-map"
