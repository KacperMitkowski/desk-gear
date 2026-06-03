"use client"

import { Loader2 } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import { useFormContext, useFormState } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type FormSubmitButtonProps = {
  label: string
  submittingLabel: string
  icon?: ReactNode
  /**
   * Dodatkowy zewnętrzny stan „pending" — sumuje się z `isSubmitting` z RHF (OR).
   * Pomyślany pod `useTransition` w formularzach: po `router.push` przekazujesz tu
   * `isPending` z transition i przycisk pozostaje disabled przez całą nawigację,
   * bez „błysku" enabled stanu między zakończeniem onSubmit a unmount-em strony.
   */
  pending?: boolean
} & Omit<ComponentProps<typeof Button>, "type" | "disabled" | "children">

export function FormSubmitButton({
  label,
  submittingLabel,
  icon,
  pending = false,
  className,
  size = "lg",
  ...props
}: FormSubmitButtonProps) {
  const { control } = useFormContext()
  const { isSubmitting } = useFormState({ control })
  const busy = isSubmitting || pending

  return (
    <Button
      type="submit"
      size={size}
      disabled={busy}
      className={cn("mt-2 cursor-pointer", className)}
      {...props}
    >
      {busy ? (
        <>
          <Loader2 className="animate-spin" />
          {submittingLabel}
        </>
      ) : (
        <>
          {icon ?? null}
          {label}
        </>
      )}
    </Button>
  )
}
