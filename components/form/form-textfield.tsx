"use client"

import type { ComponentProps } from "react"
import { useController, useFormContext, type FieldValues, type Path } from "react-hook-form"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { t } from "@/i18n/translate"
import {
  resolveErrorMessage,
  type ErrorMessageOverride,
} from "@/lib/validation/resolve-error-message"

type FormTextFieldProps<T extends FieldValues> = {
  name: Path<T>
  label: string
  hint?: string
  required?: boolean
  errorMessages?: Record<string, ErrorMessageOverride>
} & Omit<ComponentProps<typeof Input>, "name">

export function FormTextField<T extends FieldValues>({
  name,
  label,
  hint,
  required,
  errorMessages,
  ...inputProps
}: FormTextFieldProps<T>) {
  const { control } = useFormContext<T>()
  const { field, fieldState } = useController({ control, name })
  const hasError = !!fieldState.error
  const errorMsg = hasError
    ? resolveErrorMessage(fieldState.error?.message ?? "", "string", errorMessages, t)
    : undefined

  const describedBy = hasError ? `${name}-error` : hint ? `${name}-hint` : undefined

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Input
        id={name}
        {...field}
        {...inputProps}
        aria-invalid={hasError}
        aria-describedby={describedBy}
      />
      {hint && !hasError && (
        <p id={`${name}-hint`} className="text-sm text-muted-foreground">
          {hint}
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
