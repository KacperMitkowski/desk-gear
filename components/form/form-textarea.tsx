"use client"

import type { ComponentProps, ReactNode } from "react"
import { useController, useFormContext, type FieldValues, type Path } from "react-hook-form"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { t } from "@/i18n/translate"
import { cn } from "@/lib/utils"
import {
  resolveErrorMessage,
  type ErrorMessageOverride,
} from "@/lib/validation/resolve-error-message"

type FormTextareaProps<T extends FieldValues> = {
  name: Path<T>
  label: string
  /** Dodatkowy opis pod polem (np. limit znaków, format). */
  description?: ReactNode
  required?: boolean
  errorMessages?: Record<string, ErrorMessageOverride>
} & Omit<ComponentProps<typeof Textarea>, "name">

export function FormTextarea<T extends FieldValues>({
  name,
  label,
  description,
  required,
  errorMessages,
  className,
  ...textareaProps
}: FormTextareaProps<T>) {
  const { control } = useFormContext<T>()
  const { field, fieldState } = useController({ control, name })
  const hasError = !!fieldState.error
  const errorMsg = hasError
    ? resolveErrorMessage(fieldState.error?.message ?? "", "string", errorMessages, t)
    : undefined

  const describedBy = hasError ? `${name}-error` : description ? `${name}-description` : undefined

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Textarea
        id={name}
        {...field}
        {...textareaProps}
        aria-invalid={hasError}
        aria-describedby={describedBy}
        className={cn("border-foreground/10 bg-input dark:bg-input", className)}
      />
      {description && !hasError && (
        <p id={`${name}-description`} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {hasError && (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {errorMsg}
        </p>
      )}
    </div>
  )
}
