import { redirect } from "next/navigation"

import { RegisterForm } from "@/features/auth/components/register-form"
import { auth } from "@/lib/auth/auth"
import { ROUTES } from "@/lib/routes"
import { AuthCardTabs } from "@/features/auth/components/auth-card-tabs"

export default async function RegisterPage() {
  const session = await auth()
  if (session?.user) redirect(ROUTES.HOME)

  return (
    <>
      <AuthCardTabs />
      <RegisterForm />
    </>
  )
}
