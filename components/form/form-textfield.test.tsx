import { zodResolver } from "@hookform/resolvers/zod"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { FormProvider, useForm, type UseFormProps } from "react-hook-form"
import { describe, expect, it } from "vitest"
import * as z from "zod"

// Side-effect: globalna mapa błędów Zoda (JSON z code/params). Bez niej Zod zwracałby
// gołe komunikaty po angielsku i kaskada `resolveErrorMessage` nie miałaby co dekodować.
import "@/lib/validation/zod-error-map"

import { FormTextField } from "./form-textfield"

type FieldValues = { value: string }

function renderInForm(field: ReactNode, formOptions: UseFormProps<FieldValues> = {}) {
  function Wrapper() {
    const methods = useForm<FieldValues>({
      mode: "onTouched",
      defaultValues: { value: "" },
      ...formOptions,
    })
    return <FormProvider {...methods}>{field}</FormProvider>
  }
  return render(<Wrapper />)
}

describe("FormTextField", () => {
  it("renderuje label powiązany z inputem", () => {
    renderInForm(<FormTextField<FieldValues> name="value" label="Email" />)
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
  })

  it("po blur pokazuje polski komunikat błędu z resolveErrorMessage + i18n", async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.string().min(8) })
    renderInForm(<FormTextField<FieldValues> name="value" label="Hasło" />, {
      resolver: zodResolver(schema),
    })

    const input = screen.getByLabelText("Hasło")
    await user.click(input)
    await user.tab()

    expect(await screen.findByText("Wymagane co najmniej 8 znaków")).toBeInTheDocument()
  })

  it("override per pole zastępuje komunikat z i18n", async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.string().min(8) })
    renderInForm(
      <FormTextField<FieldValues>
        name="value"
        label="Hasło"
        errorMessages={{ too_small: "Za krótkie" }}
      />,
      { resolver: zodResolver(schema) },
    )

    const input = screen.getByLabelText("Hasło")
    await user.click(input)
    await user.tab()

    expect(await screen.findByText("Za krótkie")).toBeInTheDocument()
    expect(screen.queryByText("Wymagane co najmniej 8 znaków")).not.toBeInTheDocument()
  })

  it('ustawia aria-invalid="true" gdy pole ma błąd', async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.string().min(1) })
    renderInForm(<FormTextField<FieldValues> name="value" label="Email" />, {
      resolver: zodResolver(schema),
    })

    const input = screen.getByLabelText("Email")
    expect(input).toHaveAttribute("aria-invalid", "false")

    await user.click(input)
    await user.tab()

    expect(input).toHaveAttribute("aria-invalid", "true")
  })
})
