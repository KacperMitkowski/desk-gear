import { redirect } from "next/navigation"
import { Suspense } from "react"

import { AuthCard } from "@/features/auth/components/auth-card"
import { LoginForm } from "@/features/auth/components/login-form"
import { auth } from "@/lib/auth/auth"

// Zalogowanych odsyłamy na /account — manualne wejście /login dla aktywnej sesji nie ma
// sensu (proxy.ts puszcza /login zawsze, bo to publiczna trasa).
export default async function LoginPage() {
  const session = await auth()
  if (session?.user) redirect("/account")

  return (
    <AuthCard activeTab="login">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  )
}
