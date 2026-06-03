"use client"

import type { ComponentProps, ReactNode } from "react"
import { useController, useFormContext, type FieldValues, type Path } from "react-hook-form"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { t } from "@/i18n/translate"
import { cn } from "@/lib/utils"
import {
  resolveErrorMessage,
  type ErrorMessageOverride,
} from "@/lib/validation/resolve-error-message"

export type SelectOption = {
  value: string
  label: ReactNode
  disabled?: boolean
}

type FormSelectProps<T extends FieldValues> = {
  name: Path<T>
  label: string
  options: SelectOption[]
  placeholder?: string
  description?: ReactNode
  required?: boolean
  errorMessages?: Record<string, ErrorMessageOverride>
} & Omit<ComponentProps<typeof SelectTrigger>, "name">

export function FormSelect<T extends FieldValues>({
  name,
  label,
  options,
  placeholder,
  description,
  required,
  errorMessages,
  className,
  ...triggerProps
}: FormSelectProps<T>) {
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
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Select
        value={value ?? ""}
        onValueChange={onChange}
        onOpenChange={(open) => {
          if (!open) onBlur()
        }}
      >
        <SelectTrigger
          id={name}
          {...fieldProps}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          className={cn("w-full", className)}
          {...triggerProps}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
