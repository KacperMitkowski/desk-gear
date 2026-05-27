import { signIn } from "@/lib/auth/auth"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const { callbackUrl } = await searchParams

  async function action(formData: FormData) {
    "use server"
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: callbackUrl ?? "/",
    })
  }

  return (
    <form action={action}>
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Password
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      <button type="submit">Sign in</button>
    </form>
  )
}
