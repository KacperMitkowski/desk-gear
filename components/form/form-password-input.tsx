"use client"

import { Eye, EyeOff } from "lucide-react"
import { useState, type ComponentProps } from "react"
import type { FieldValues } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { t } from "@/i18n/translate"

import { FormTextInput } from "./form-text-input"

type FormPasswordInputProps<T extends FieldValues> = Omit<
  ComponentProps<typeof FormTextInput<T>>,
  "type" | "endAdornment"
>

export function FormPasswordInput<T extends FieldValues>(props: FormPasswordInputProps<T>) {
  const [visible, setVisible] = useState(false)

  return (
    <FormTextInput
      {...props}
      type={visible ? "text" : "password"}
      endAdornment={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={visible ? t("forms.passwordToggle.hide") : t("forms.passwordToggle.show")}
          aria-pressed={visible}
          className="cursor-pointer"
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff /> : <Eye />}
        </Button>
      }
    />
  )
}
