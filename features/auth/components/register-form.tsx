"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { FormProvider, useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormCheckbox } from "@/components/form/form-checkbox"
import { FormPasswordInput } from "@/components/form/form-password-input"
import { FormSubmitButton } from "@/components/form/form-submit-button"
import { FormTextInput } from "@/components/form/form-text-input"
import { registerAction } from "@/features/auth/actions"
import { OAuthButtons } from "@/features/auth/components/oauth-buttons"
import { registerSchema, type RegisterInput } from "@/features/auth/schemas"
import { t } from "@/i18n/translate"

export function RegisterForm() {
  const methods = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onSubmit",
    defaultValues: { email: "", password: "", confirmPassword: "", acceptTerms: false },
  })

  async function onSubmit(values: RegisterInput) {
    const result = await registerAction(values)

    // Sukces = serwer rzucił redirect i Next nawiguje na /account — tu trafiamy wyłącznie z błędem.
    if (result.status !== "error") return

    const { error } = result
    switch (error.type) {
      case "validation":
        // Safety-net: walidację zwykle łapie klient (zodResolver). Komunikaty pól są JSON-em
        // {code, params} — FormTextInput zresolwuje je przez i18n.
        for (const fieldError of error.fieldErrors ?? []) {
          const path = String(fieldError.path[0]) as keyof RegisterInput
          methods.setError(path, { message: fieldError.message })
        }
        break
      case "business":
        // EMAIL_ALREADY_EXISTS niesie fieldError z path ["email"] — pokazujemy gotowy
        // (przetłumaczony) komunikat przy polu email; w razie braku pola — toast.
        if (error.fieldErrors?.length) {
          for (const fieldError of error.fieldErrors) {
            const path = String(fieldError.path[0]) as keyof RegisterInput
            methods.setError(path, { message: t(error.message) })
          }
        } else {
          toast.error(t(error.message))
        }
        break
      case "server":
        toast.error(t(error.message), {
          description: error.traceId ? `ID błędu: ${error.traceId}` : undefined,
        })
        break
      default:
        toast.error(t(error.message))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
          <FormTextInput<RegisterInput>
            name="email"
            type="email"
            label={t("auth.register.email")}
            placeholder={t("auth.register.emailPlaceholder")}
            autoComplete="email"
            errorMessages={{
              invalid_format: t("auth.register.errors.email"),
              invalid_type: t("auth.register.errors.emailRequired"),
            }}
          />
          <FormPasswordInput<RegisterInput>
            name="password"
            label={t("auth.register.password")}
            placeholder={t("auth.register.passwordPlaceholder")}
            autoComplete="new-password"
            errorMessages={{
              too_small: t("auth.register.errors.passwordTooShort"),
              invalid_format: t("auth.register.errors.passwordComplexity"),
            }}
          />
          <FormPasswordInput<RegisterInput>
            name="confirmPassword"
            label={t("auth.register.confirmPassword")}
            placeholder={t("auth.register.confirmPasswordPlaceholder")}
            autoComplete="new-password"
            errorMessages={{
              custom: t("auth.register.errors.passwordMismatch"),
            }}
          />
          <FormCheckbox<RegisterInput>
            name="acceptTerms"
            label={
              <>
                {t("auth.register.acceptTerms")}{" "}
                <Link
                  href="/terms"
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  {t("auth.register.acceptTermsLink")}
                </Link>{" "}
                {t("auth.register.acceptTermsConnector")}{" "}
                <Link
                  href="/privacy"
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  {t("auth.register.acceptPrivacyLink")}
                </Link>
              </>
            }
            errorMessages={{
              custom: t("auth.register.errors.acceptTermsRequired"),
            }}
          />
          <FormSubmitButton
            label={t("auth.register.submit")}
            submittingLabel={t("auth.register.submitting")}
          />
        </form>
      </FormProvider>

      <OAuthButtons />

      <p className="text-center text-sm text-muted-foreground">
        {t("auth.register.haveAccount")}{" "}
        <Link href="/login" className="text-primary underline underline-offset-4">
          {t("auth.register.signIn")}
        </Link>
      </p>
    </div>
  )
}
