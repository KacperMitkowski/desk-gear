"use client"

import { Eye, EyeOff } from "lucide-react"
import { useState, type ComponentProps } from "react"
import type { FieldValues } from "react-hook-form"

import { Button } from "@/components/ui/button"

import { FormTextField } from "./form-textfield"

type FormPasswordFieldProps<T extends FieldValues> = Omit<
  ComponentProps<typeof FormTextField<T>>,
  "type" | "endAdornment"
>

export function FormPasswordField<T extends FieldValues>(props: FormPasswordFieldProps<T>) {
  const [visible, setVisible] = useState(false)

  return (
    <FormTextField
      {...props}
      type={visible ? "text" : "password"}
      endAdornment={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={visible ? "Ukryj hasło" : "Pokaż hasło"}
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
