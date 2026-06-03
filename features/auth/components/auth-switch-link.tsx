"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { t } from "@/i18n/translate"
import { ROUTES } from "@/lib/routes"

export function AuthSwitchLink() {
  const pathname = usePathname()
  const isRegister = pathname?.startsWith(ROUTES.REGISTER) ?? false

  const prompt = isRegister ? t("auth.register.haveAccount") : t("auth.login.noAccount")
  const linkText = isRegister ? t("auth.register.signIn") : t("auth.login.createAccount")
  const href = isRegister ? ROUTES.LOGIN : ROUTES.REGISTER

  return (
    <p className="text-center text-sm text-muted-foreground">
      {prompt}{" "}
      <Link href={href} className="text-primary underline underline-offset-4">
        {linkText}
      </Link>
    </p>
  )
}
