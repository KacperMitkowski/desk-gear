import { hash } from "bcryptjs"

import { prisma } from "@/lib/db/prisma"
import { AppErrors } from "@/lib/errors/app-error"
import { Prisma } from "@/lib/generated/prisma"

// Salt rounds = 12 — spójnie z prisma/seed.ts (hashowanie hasła admina).
const SALT_ROUNDS = 12

type RegisterUserInput = {
  email: string
  password: string
}

// Tworzy konto klienta (rola CUSTOMER domyślnie). Hasło trafia do DB wyłącznie jako bcrypt hash.
// Duplikat email (unikalny @db.Citext) wykrywamy atomowo przez P2002 z prisma.user.create —
// bez wcześniejszego findUnique, więc bez race condition między sprawdzeniem a zapisem.
export async function registerUser({ email, password }: RegisterUserInput) {
  const passwordHash = await hash(password, SALT_ROUNDS)

  try {
    return await prisma.user.create({ data: { email, passwordHash } })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw AppErrors.emailExists(email)
    }
    throw err
  }
}
