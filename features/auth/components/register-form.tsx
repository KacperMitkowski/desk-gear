"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { UserPlus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormProvider, useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormCheckbox } from "@/components/form/form-checkbox"
import { FormPasswordInput } from "@/components/form/form-password-input"
import { FormSubmitButton } from "@/components/form/form-submit-button"
import { FormTextInput } from "@/components/form/form-text-input"
import { registerAction } from "@/features/auth/actions"
import { AuthSwitchLink } from "@/features/auth/components/auth-switch-link"
import { OAuthButtons } from "@/features/auth/components/oauth-buttons"
import { registerSchema, type RegisterFormValues } from "@/features/auth/schemas"
import { t } from "@/i18n/translate"

export function RegisterForm() {
  const router = useRouter()
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onSubmit",
    defaultValues: { email: "", password: "", confirmPassword: "", acceptTerms: false },
  })

  async function onSubmit(values: RegisterFormValues) {
    const result = await registerAction(values)

    if (result.status === "success") {
      toast.success(t("auth.register.success"))
      router.push(result.data.redirectTo)
      return
    }

    const { error } = result
    switch (error.type) {
      case "validation":
        for (const fieldError of error.fieldErrors ?? []) {
          const path = String(fieldError.path[0]) as keyof RegisterFormValues
          form.setError(path, { message: fieldError.message })
        }
        break
      case "business":
        toast.error(t(error.message))
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
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
          <FormTextInput<RegisterFormValues>
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
          <FormPasswordInput<RegisterFormValues>
            name="password"
            label={t("auth.register.password")}
            placeholder={t("auth.register.passwordPlaceholder")}
            autoComplete="new-password"
            errorMessages={{
              too_small: t("auth.register.errors.passwordTooShort"),
              invalid_format: t("auth.register.errors.passwordComplexity"),
            }}
          />
          <FormPasswordInput<RegisterFormValues>
            name="confirmPassword"
            label={t("auth.register.confirmPassword")}
            placeholder={t("auth.register.confirmPasswordPlaceholder")}
            autoComplete="new-password"
            errorMessages={{
              custom: t("auth.register.errors.passwordMismatch"),
            }}
          />
          <FormCheckbox<RegisterFormValues>
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
              </>
            }
            errorMessages={{
              custom: t("auth.register.errors.acceptTermsRequired"),
            }}
          />
          <FormSubmitButton
            label={t("auth.register.submit")}
            submittingLabel={t("auth.register.submitting")}
            icon={<UserPlus />}
          />
        </form>
      </FormProvider>

      <OAuthButtons />

      <AuthSwitchLink />
    </div>
  )
}
