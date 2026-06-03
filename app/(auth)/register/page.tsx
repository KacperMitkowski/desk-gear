import { redirect } from "next/navigation"

import { RegisterForm } from "@/features/auth/components/register-form"
import { auth } from "@/lib/auth/auth"
import { AuthCardTabs } from "@/features/auth/components/auth-card-tabs"

export default async function RegisterPage() {
  const session = await auth()
  if (session?.user) redirect("/account")

  return (
    <>
      <AuthCardTabs />
      <RegisterForm />
    </>
  )
}
