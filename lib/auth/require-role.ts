import { AppError } from "@/lib/errors/app-error"
import type { UserRole } from "@/lib/generated/prisma"

import { auth } from "./auth"

export async function requireRole(roles: UserRole[]) {
  const session = await auth()
  if (!session?.user) throw new AppError("UNAUTHORIZED")
  if (!roles.includes(session.user.role)) throw new AppError("FORBIDDEN")
  return session
}
