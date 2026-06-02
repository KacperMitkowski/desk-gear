"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { FormProvider, useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormPasswordInput } from "@/components/form/form-password-input"
import { FormSubmitButton } from "@/components/form/form-submit-button"
import { FormTextInput } from "@/components/form/form-text-input"
import { loginAction } from "@/features/auth/actions"
import { OAuthButtons } from "@/features/auth/components/oauth-buttons"
import { loginSchema, type LoginInput } from "@/features/auth/schemas"
import { t } from "@/i18n/translate"

// callbackUrl czytamy z searchParams po stronie serwera (LoginPage) i przekazujemy propem —
// dzięki temu formularz nie używa useSearchParams i nie wymaga otoczki <Suspense>, której pusty
// fallback powodował migotanie treści przy wejściu na /login.
export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const methods = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: LoginInput) {
    const result = await loginAction(values, callbackUrl)

    // Sukces = serwer rzucił redirect i Next nawiguje — tu trafiamy wyłącznie z błędem.
    if (result.status !== "error") return

    const { error } = result
    switch (error.type) {
      case "validation":
        // Safety-net: walidację zwykle łapie klient (zodResolver). Gdyby serwer zwrócił błędy
        // pól, przepisujemy je do RHF — FormTextInput zresolwuje komunikat.
        for (const fieldError of error.fieldErrors ?? []) {
          const path = String(fieldError.path[0]) as keyof LoginInput
          methods.setError(path, { message: fieldError.message })
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
        methods.resetField("password")
        toast.error(t(error.message))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
          <FormTextInput<LoginInput>
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
          <FormPasswordInput<LoginInput>
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
          />
        </form>
      </FormProvider>

      <OAuthButtons />

      <p className="text-center text-sm text-muted-foreground">
        {t("auth.login.noAccount")}{" "}
        <Link href="/register" className="text-primary underline underline-offset-4">
          {t("auth.login.createAccount")}
        </Link>
      </p>
    </div>
  )
}
