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
  description?: ReactNode
  disabled?: boolean
}

type FormRadioGroupProps<T extends FieldValues> = {
  name: Path<T>
  label: string
  options: RadioOption[]
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
            <div key={option.value} className="flex items-start gap-3">
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
