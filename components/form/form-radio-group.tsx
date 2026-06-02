"use client"

import type { ComponentProps, ReactNode } from "react"
import { useController, useFormContext, type FieldValues, type Path } from "react-hook-form"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { t } from "@/i18n/translate"
import { cn } from "@/lib/utils"
import {
  resolveErrorMessage,
  type ErrorMessageOverride,
} from "@/lib/validation/resolve-error-message"

export type RadioOption = {
  value: string
  label: ReactNode
  /** Opcjonalny podtytuł pod etykietą wariantu (np. czas dostawy, cena). */
  description?: ReactNode
  disabled?: boolean
}

type FormRadioGroupProps<T extends FieldValues> = {
  name: Path<T>
  label: string
  options: RadioOption[]
  /** Dodatkowy opis pod całą grupą. */
  description?: ReactNode
  required?: boolean
  errorMessages?: Record<string, ErrorMessageOverride>
} & Omit<ComponentProps<typeof RadioGroup>, "name" | "value" | "onValueChange">

export function FormRadioGroup<T extends FieldValues>({
  name,
  label,
  options,
  description,
  required,
  errorMessages,
  className,
  ...groupProps
}: FormRadioGroupProps<T>) {
  const { control } = useFormContext<T>()
  const { field, fieldState } = useController({ control, name })
  // `value`/`onChange`/`onBlur` mapujemy na API Radix RadioGroup, resztę (ref, name) spreadujemy.
  const { value, onChange, onBlur, ...fieldProps } = field
  const hasError = !!fieldState.error
  const errorMsg = hasError
    ? resolveErrorMessage(fieldState.error?.message ?? "", "string", errorMessages, t)
    : undefined

  const describedBy = hasError ? `${name}-error` : description ? `${name}-description` : undefined

  return (
    <div className="space-y-1.5">
      <Label id={`${name}-label`}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <RadioGroup
        {...fieldProps}
        value={value ?? ""}
        onValueChange={onChange}
        onBlur={onBlur}
        aria-labelledby={`${name}-label`}
        aria-invalid={hasError}
        aria-describedby={describedBy}
        className={cn(className)}
        {...groupProps}
      >
        {options.map((option) => {
          const optionId = `${name}-${option.value}`
          return (
            <div key={option.value} className="flex items-start gap-2">
              <RadioGroupItem id={optionId} value={option.value} disabled={option.disabled} />
              <div className="grid gap-0.5 leading-none">
                <Label htmlFor={optionId} className="font-normal">
                  {option.label}
                </Label>
                {option.description && (
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                )}
              </div>
            </div>
          )
        })}
      </RadioGroup>
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
