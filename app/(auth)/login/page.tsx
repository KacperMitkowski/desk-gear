import { redirect } from "next/navigation"

import { LoginForm } from "@/features/auth/components/login-form"
import { auth } from "@/lib/auth/auth"
import { AuthCardTabs } from "@/features/auth/components/auth-card-tabs"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const session = await auth()
  if (session?.user) redirect("/account")

  const { callbackUrl } = await searchParams

  return (
    <>
      <AuthCardTabs />
      <LoginForm callbackUrl={callbackUrl} />
    </>
  )
}
