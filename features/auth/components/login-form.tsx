"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { FormProvider, useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormPasswordField } from "@/components/form/form-passwordfield"
import { FormTextField } from "@/components/form/form-textfield"
import { Button } from "@/components/ui/button"
import { loginAction } from "@/features/auth/actions"
import { OAuthButtons } from "@/features/auth/components/oauth-buttons"
import { loginSchema, type LoginInput } from "@/features/auth/schemas"
import { t } from "@/i18n/translate"

export function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? undefined

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
        // pól, przepisujemy je do RHF — FormTextField zresolwuje komunikat.
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
          <FormTextField<LoginInput>
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
          <FormPasswordField<LoginInput>
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
          <Button
            type="submit"
            size="lg"
            className="mt-2 cursor-pointer"
            disabled={methods.formState.isSubmitting}
          >
            {methods.formState.isSubmitting ? (
              <>
                <Loader2 className="animate-spin" />
                {t("auth.login.submitting")}
              </>
            ) : (
              <>
                {t("auth.login.submit")}
                <ArrowRight />
              </>
            )}
          </Button>
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
