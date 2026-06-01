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

type FormTextFieldProps<T extends FieldValues> = {
  name: Path<T>
  label: string
  /** Dodatkowy opis pod inputem (np. wymogi dotyczące hasła, format wartości). */
  description?: ReactNode
  required?: boolean
  errorMessages?: Record<string, ErrorMessageOverride>
  /** Dodatkowa treść w wierszu etykiety, wyrównana do prawej (np. link "Przypomnij hasło"). */
  labelAction?: ReactNode
  /** Element renderowany absolutnie wewnątrz inputa (np. toggle widoczności hasła). */
  endAdornment?: ReactNode
} & Omit<ComponentProps<typeof Input>, "name">

export function FormTextField<T extends FieldValues>({
  name,
  label,
  description,
  required,
  errorMessages,
  labelAction,
  endAdornment,
  className,
  ...inputProps
}: FormTextFieldProps<T>) {
  const { control } = useFormContext<T>()
  const { field, fieldState } = useController({ control, name })
  const hasError = !!fieldState.error
  const errorMsg = hasError
    ? resolveErrorMessage(fieldState.error?.message ?? "", "string", errorMessages, t)
    : undefined

  const describedBy = hasError ? `${name}-error` : description ? `${name}-description` : undefined

  return (
    <div className="space-y-1.5">
      <div className="flex h-[14px] items-center justify-between gap-2">
        <Label htmlFor={name}>
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        {labelAction && (
          <div className="flex h-[14px] items-center text-sm leading-none">{labelAction}</div>
        )}
      </div>
      <div className="relative">
        <Input
          id={name}
          {...field}
          {...inputProps}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          className={cn(
            "h-10 border-foreground/10 bg-input dark:bg-input",
            endAdornment && "pr-9",
            className,
          )}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-1 flex items-center">{endAdornment}</div>
        )}
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
