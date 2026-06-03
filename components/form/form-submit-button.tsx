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
} & Omit<ComponentProps<typeof Button>, "type" | "disabled" | "children">

export function FormSubmitButton({
  label,
  submittingLabel,
  icon,
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
          {icon ?? null}
          {label}
        </>
      )}
    </Button>
  )
}
