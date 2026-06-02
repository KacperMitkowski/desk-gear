"use client"

import type { ComponentProps, ReactNode } from "react"
import { useController, useFormContext, type FieldValues, type Path } from "react-hook-form"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { t } from "@/i18n/translate"
import { cn } from "@/lib/utils"
import {
  resolveErrorMessage,
  type ErrorMessageOverride,
} from "@/lib/validation/resolve-error-message"

type FormNumberInputProps<T extends FieldValues> = {
  name: Path<T>
  label: string
  /** Dodatkowy opis pod inputem (np. zakres dozwolonych wartości). */
  description?: ReactNode
  required?: boolean
  errorMessages?: Record<string, ErrorMessageOverride>
} & Omit<ComponentProps<typeof Input>, "name" | "type" | "value" | "onChange">

export function FormNumberInput<T extends FieldValues>({
  name,
  label,
  description,
  required,
  errorMessages,
  className,
  ...inputProps
}: FormNumberInputProps<T>) {
  const { control } = useFormContext<T>()
  const { field, fieldState } = useController({ control, name })
  // `value`/`onChange` remapujemy (liczba ↔ string inputa), resztę (ref, name, onBlur) spreadujemy.
  const { value, onChange, ...fieldProps } = field
  const hasError = !!fieldState.error
  // fieldType "number" → komunikaty too_small/too_big/invalid_type biorą wariant liczbowy z i18n.
  const errorMsg = hasError
    ? resolveErrorMessage(fieldState.error?.message ?? "", "number", errorMessages, t)
    : undefined

  const describedBy = hasError ? `${name}-error` : description ? `${name}-description` : undefined

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Input
        id={name}
        type="number"
        inputMode="numeric"
        {...fieldProps}
        value={value ?? ""}
        // Pusty input → undefined (Zod zgłosi invalid_type), w innym razie liczba (NaN zostawiamy Zodowi).
        onChange={(event) => {
          const raw = event.target.value
          onChange(raw === "" ? undefined : Number(raw))
        }}
        aria-invalid={hasError}
        aria-describedby={describedBy}
        className={cn("h-10 border-foreground/10 bg-input dark:bg-input", className)}
        {...inputProps}
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
