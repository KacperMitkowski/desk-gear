import { redirect } from "next/navigation"

import { RegisterForm } from "@/features/auth/components/register-form"
import { auth } from "@/lib/auth/auth"

// Zalogowanych odsyłamy na /account — manualne wejście /register dla aktywnej sesji nie ma sensu.
export default async function RegisterPage() {
  const session = await auth()
  if (session?.user) redirect("/account")

  return <RegisterForm />
}
