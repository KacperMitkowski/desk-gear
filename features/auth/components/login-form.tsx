"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { LogIn } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormProvider, useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormPasswordInput } from "@/components/form/form-password-input"
import { FormSubmitButton } from "@/components/form/form-submit-button"
import { FormTextInput } from "@/components/form/form-text-input"
import { loginAction } from "@/features/auth/actions"
import { AuthSwitchLink } from "@/features/auth/components/auth-switch-link"
import { OAuthButtons } from "@/features/auth/components/oauth-buttons"
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas"
import { t } from "@/i18n/translate"

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter()
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: LoginFormValues) {
    const result = await loginAction(values, callbackUrl)

    if (result.status === "success") {
      router.push(result.data.redirectTo)
      return
    }

    const { error } = result
    switch (error.type) {
      case "validation":
        for (const fieldError of error.fieldErrors ?? []) {
          const path = String(fieldError.path[0]) as keyof LoginFormValues
          form.setError(path, { message: fieldError.message })
        }
        break
      case "server":
        toast.error(t(error.message), {
          description: error.traceId ? `ID błędu: ${error.traceId}` : undefined,
        })
        break
      default:
        // "auth"/"business" → komunikat z backendu ("Nieprawidłowe dane logowania").
        // Czyścimy hasło, żeby użytkownik wpisał je ponownie.
        form.resetField("password")
        toast.error(t(error.message))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
          <FormTextInput<LoginFormValues>
            name="email"
            type="email"
            label={t("auth.login.email")}
            placeholder={t("auth.login.emailPlaceholder")}
            autoComplete="email"
            errorMessages={{
              invalid_format: t("auth.errors.email"),
              invalid_type: t("auth.errors.emailRequired"),
            }}
          />
          <FormPasswordInput<LoginFormValues>
            name="password"
            label={t("auth.login.password")}
            placeholder={t("auth.login.passwordPlaceholder")}
            autoComplete="current-password"
            labelAction={
              <Link href="/forgot-password" className="text-sm text-primary underline-offset-4">
                {t("auth.login.forgotPassword")}
              </Link>
            }
          />
          <FormSubmitButton
            label={t("auth.login.submit")}
            submittingLabel={t("auth.login.submitting")}
            icon={<LogIn />}
          />
        </form>
      </FormProvider>

      <OAuthButtons />

      <AuthSwitchLink />
    </div>
  )
}
