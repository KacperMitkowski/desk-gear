import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    DIRECT_DATABASE_URL: z.url().optional(),
    AUTH_SECRET: z.string().min(32),
    AUTH_URL: z.url(),
    ADMIN_SEED_EMAIL: z.email().optional(),
    ADMIN_SEED_PASSWORD: z.string().min(12).optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    ADMIN_SEED_EMAIL: process.env.ADMIN_SEED_EMAIL,
    ADMIN_SEED_PASSWORD: process.env.ADMIN_SEED_PASSWORD,
    NODE_ENV: process.env.NODE_ENV,
  },
  emptyStringAsUndefined: true,
})
