"use client"

import { ArrowRight, Loader2 } from "lucide-react"
import type { ComponentProps } from "react"
import { useFormContext, useFormState } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type FormSubmitButtonProps = {
  /** Etykieta w stanie spoczynku (obok strzałki). */
  label: string
  /** Etykieta w trakcie wysyłki (obok spinnera). */
  submittingLabel: string
} & Omit<ComponentProps<typeof Button>, "type" | "disabled" | "children">

// Przycisk submit dla formularzy RHF: subskrybuje `isSubmitting` z kontekstu formularza
// (useFormState), blokuje się i pokazuje spinner w trakcie wysyłki. Musi być renderowany
// wewnątrz <FormProvider>.
export function FormSubmitButton({
  label,
  submittingLabel,
  className,
  size = "lg",
  ...props
}: FormSubmitButtonProps) {
  const { control } = useFormContext()
  const { isSubmitting } = useFormState({ control })

  return (
    <Button
      type="submit"
      size={size}
      disabled={isSubmitting}
      className={cn("mt-2 cursor-pointer", className)}
      {...props}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="animate-spin" />
          {submittingLabel}
        </>
      ) : (
        <>
          {label}
          <ArrowRight />
        </>
      )}
    </Button>
  )
}
