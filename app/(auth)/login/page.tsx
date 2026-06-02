import { redirect } from "next/navigation"

import { LoginForm } from "@/features/auth/components/login-form"
import { auth } from "@/lib/auth/auth"

// Zalogowanych odsyłamy na /account — manualne wejście /login dla aktywnej sesji nie ma
// sensu (proxy.ts puszcza /login zawsze, bo to publiczna trasa).
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const session = await auth()
  if (session?.user) redirect("/account")

  const { callbackUrl } = await searchParams

  return <LoginForm callbackUrl={callbackUrl} />
}
