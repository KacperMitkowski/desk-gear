"use server"

import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

import { loginSchema } from "@/features/auth/schemas"
import type { ActionResult } from "@/lib/actions/action-result"
import { toActionResult } from "@/lib/actions/to-action-result"
import { signIn } from "@/lib/auth/auth"
import { AppError } from "@/lib/errors/app-error"

// Logowanie przez Credentials.
// - Walidacja + signIn idą przez toActionResult: ZodError → "validation",
//   AuthError → AppError("INVALID_CREDENTIALS") → "auth" (ten sam komunikat dla złego emaila
//   i hasła — nie zdradzamy istnienia konta).
// - signIn z redirect:false sam NIE przekierowuje, ale ustawia cookie sesji w odpowiedzi.
//   Po sukcesie robimy redirect() PO STRONIE SERWERA — Set-Cookie i 302 lecą jedną odpowiedzią,
//   więc sesja jest aktywna zanim klient trafi na /account (eliminuje wyścig i zawieszenie UI).
//   redirect() jest wywołany poza toActionResult, więc NEXT_REDIRECT nie zostaje połknięty.
export async function loginAction(
  input: unknown,
  callbackUrl?: string,
): Promise<ActionResult<null>> {
  const result = await toActionResult(async () => {
    const data = loginSchema.parse(input)
    try {
      await signIn("credentials", { ...data, redirect: false })
    } catch (err) {
      if (err instanceof AuthError) throw new AppError("INVALID_CREDENTIALS")
      throw err
    }
    return null
  })

  if (result.status === "success") redirect(callbackUrl ?? "/account")
  return result
}
