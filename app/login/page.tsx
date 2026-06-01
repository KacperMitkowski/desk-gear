import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

import { signIn } from "@/lib/auth/auth"
import { Button } from "@/components/ui/button"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const { callbackUrl, error } = await searchParams

  async function action(formData: FormData) {
    "use server"
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: callbackUrl ?? "/",
      })
    } catch (err) {
      // signIn rzuca AuthError przy błędnych danych. Sukces rzuca NEXT_REDIRECT — który
      // (jak każdy nie-AuthError) re-throwujemy, żeby Next dokończył przekierowanie.
      if (err instanceof AuthError) {
        const params = new URLSearchParams({ error: "CredentialsSignin" })
        if (callbackUrl) params.set("callbackUrl", callbackUrl)
        redirect(`/login?${params.toString()}`)
      }
      throw err
    }
  }

  return (
    <form action={action}>
      {error ? <p role="alert">Nieprawidłowy email lub hasło.</p> : null}
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Password
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      <Button type="submit">Zaloguj się</Button>
    </form>
  )
}
