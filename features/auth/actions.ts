"use server"

import { AuthError } from "next-auth"

import {
  LoginFormValues,
  loginSchema,
  RegisterFormValues,
  registerSchema,
} from "@/features/auth/schemas"
import { registerUser } from "@/features/auth/services/register.service"
import type { ActionResult } from "@/lib/actions/action-result"
import { toActionResult } from "@/lib/actions/to-action-result"
import { signIn } from "@/lib/auth/auth"
import { AppError } from "@/lib/errors/app-error"
import { ROUTES } from "@/lib/routes"
import { isPrismaErrorCode, isSafeRedirectPath } from "./utils"
import { AuthSuccess } from "./types"

export async function loginAction(
  input: LoginFormValues,
  callbackUrl?: string,
): Promise<ActionResult<AuthSuccess>> {
  return toActionResult(async () => {
    const data = loginSchema.parse(input)
    try {
      await signIn("credentials", { ...data, redirect: false })
    } catch (err) {
      if (err instanceof AuthError) throw new AppError("INVALID_CREDENTIALS")
      throw err
    }
    return { redirectTo: isSafeRedirectPath(callbackUrl) ? callbackUrl : ROUTES.ACCOUNT }
  })
}

// Rejestracja przez Credentials. NIE robimy auto-loginu — po `registerUser` redirect na
// `/login`, user samodzielnie wpisuje hasło. To świadoma zmiana względem pierwotnego AC
// issue #24 (rationale w ARCHITECTURE.md §E6.2). Jeśli AC ma kiedyś wrócić, dopisz `signIn`
// poniżej i podmień redirect na `ROUTES.ACCOUNT`.
//
// Mapowanie błędów: P2002 → AppError("EMAIL_ALREADY_EXISTS") przez ducktyping. Inne błędy
// Prismy (P1001 brak DB, itd.) lecą przez catch-all `toActionResult` → `server` + traceId.
export async function registerAction(
  input: RegisterFormValues,
): Promise<ActionResult<AuthSuccess>> {
  return toActionResult(async () => {
    const data = registerSchema.parse(input)

    try {
      await registerUser({ email: data.email, password: data.password })
    } catch (err) {
      if (isPrismaErrorCode(err, "P2002")) {
        throw new AppError("EMAIL_ALREADY_EXISTS")
      }
      throw err
    }
    return { redirectTo: ROUTES.LOGIN }
  })
}
