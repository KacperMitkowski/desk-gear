"use client"

import type { ComponentProps, ReactNode } from "react"
import { useController, useFormContext, type FieldValues, type Path } from "react-hook-form"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { t } from "@/i18n/translate"
import { cn } from "@/lib/utils"
import {
  resolveErrorMessage,
  type ErrorMessageOverride,
} from "@/lib/validation/resolve-error-message"

type FormCheckboxProps<T extends FieldValues> = {
  name: Path<T>
  /** Treść etykiety obok pola — ReactNode, bo regulamin zwykle zawiera link. */
  label: ReactNode
  /** Dodatkowy opis pod kontrolką (np. konsekwencje zaznaczenia). */
  description?: ReactNode
  required?: boolean
  errorMessages?: Record<string, ErrorMessageOverride>
} & Omit<ComponentProps<typeof Checkbox>, "name" | "checked" | "onCheckedChange" | "onBlur">

export function FormCheckbox<T extends FieldValues>({
  name,
  label,
  description,
  required,
  errorMessages,
  className,
  ...checkboxProps
}: FormCheckboxProps<T>) {
  const { control } = useFormContext<T>()
  const { field, fieldState } = useController({ control, name })
  // Rozpakowanie: `value`/`onChange` remapujemy na API checkboxa, resztę (ref, name, onBlur) spreadujemy.
  const { value, onChange, ...fieldProps } = field
  const hasError = !!fieldState.error
  const errorMsg = hasError
    ? resolveErrorMessage(fieldState.error?.message ?? "", "string", errorMessages, t)
    : undefined

  const describedBy = hasError ? `${name}-error` : description ? `${name}-description` : undefined

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Checkbox
          id={name}
          {...fieldProps}
          checked={!!value}
          onCheckedChange={(checked) => onChange(checked === true)}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          className={cn(className)}
          {...checkboxProps}
        />
        <Label htmlFor={name} className="font-normal">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      </div>
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
