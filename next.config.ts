import type { NextConfig } from "next"

// Wymusza walidację env (@t3-oss/env-nextjs) przy `next build` / `next dev`.
// Brak DATABASE_URL / AUTH_SECRET / AUTH_URL → build pada z czytelnym błędem.
import "./env"

const nextConfig: NextConfig = {
  /* config options here */
}

export default nextConfig
