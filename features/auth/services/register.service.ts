import { hash } from "bcryptjs"

import { prisma } from "@/lib/db/prisma"
import { RegisterUserInput } from "../types"

// Salt rounds = 12 — spójnie z prisma/seed.ts (hashowanie hasła admina).
const SALT_ROUNDS = 12

export async function registerUser({ email, password }: RegisterUserInput) {
  const passwordHash = await hash(password, SALT_ROUNDS)
  return prisma.user.create({ data: { email, passwordHash } })
}
