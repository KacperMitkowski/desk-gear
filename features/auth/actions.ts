"use server"

import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

import { loginSchema, registerSchema } from "@/features/auth/schemas"
import { registerUser } from "@/features/auth/services/register.service"
import type { ActionResult } from "@/lib/actions/action-result"
import { toActionResult } from "@/lib/actions/to-action-result"
import { signIn } from "@/lib/auth/auth"
import { AppError } from "@/lib/errors/app-error"

// Akceptujemy tylko ścieżki względne ("/foo/bar"). Odrzucamy protocol-relative URL ("//evil.com")
// i wszystkie absolutne URL-e — inaczej atakujący mógłby podać `?callbackUrl=https://evil.com`
// i wykorzystać formularz logowania jako open redirect.
function isSafeRedirectPath(url: string | undefined): url is string {
  if (!url) return false
  return url.startsWith("/") && !url.startsWith("//")
}

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

  if (result.status === "success") {
    redirect(isSafeRedirectPath(callbackUrl) ? callbackUrl : "/account")
  }
  return result
}

// Rejestracja przez Credentials + auto-login.
// - Walidacja Zod + utworzenie usera idą przez toActionResult: ZodError → "validation",
//   AppError("EMAIL_ALREADY_EXISTS") (duplikat email, field: "email") → "business".
// - Po utworzeniu konta logujemy od razu tym samym hasłem (signIn redirect:false ustawia cookie sesji).
// - redirect("/account") jest poza toActionResult, więc NEXT_REDIRECT nie zostaje połknięty;
//   Set-Cookie i 302 lecą jedną odpowiedzią — sesja aktywna zanim klient trafi na /account.
export async function registerAction(input: unknown): Promise<ActionResult<null>> {
  const result = await toActionResult(async () => {
    const data = registerSchema.parse(input)

    await registerUser({ email: data.email, password: data.password })

    try {
      await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })
    } catch (err) {
      if (err instanceof AuthError) throw new AppError("INVALID_CREDENTIALS")
      throw err
    }
    return null
  })

  if (result.status === "success") {
    redirect("/account")
  }
  return result
}
