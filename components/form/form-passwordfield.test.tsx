import { zodResolver } from "@hookform/resolvers/zod"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { FormProvider, useForm, type UseFormProps } from "react-hook-form"
import { describe, expect, it } from "vitest"
import * as z from "zod"

import "@/lib/validation/zod-error-map"

import { FormPasswordField } from "./form-passwordfield"

type FieldValues = { password: string }

function renderInForm(field: ReactNode, formOptions: UseFormProps<FieldValues> = {}) {
  function Wrapper() {
    const methods = useForm<FieldValues>({
      mode: "onTouched",
      defaultValues: { password: "" },
      ...formOptions,
    })
    return <FormProvider {...methods}>{field}</FormProvider>
  }
  return render(<Wrapper />)
}

describe("FormPasswordField", () => {
  it("przełącza widoczność hasła po kliknięciu w ikonę oka", async () => {
    const user = userEvent.setup()
    renderInForm(<FormPasswordField<FieldValues> name="password" label="Hasło" />)

    const input = screen.getByLabelText("Hasło") as HTMLInputElement
    expect(input.type).toBe("password")

    const toggle = screen.getByRole("button", { name: "Pokaż hasło" })
    await user.click(toggle)

    expect(input.type).toBe("text")
    expect(screen.getByRole("button", { name: "Ukryj hasło" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Ukryj hasło" }))
    expect(input.type).toBe("password")
  })

  it("po blur wyświetla polski komunikat błędu (dziedziczy logikę FormTextField)", async () => {
    const user = userEvent.setup()
    const schema = z.object({ password: z.string().min(8) })
    renderInForm(<FormPasswordField<FieldValues> name="password" label="Hasło" />, {
      resolver: zodResolver(schema),
    })

    const input = screen.getByLabelText("Hasło")
    await user.click(input)
    await user.tab()

    expect(await screen.findByText("Wymagane co najmniej 8 znaków")).toBeInTheDocument()
    expect(input).toHaveAttribute("aria-invalid", "true")
  })
})
