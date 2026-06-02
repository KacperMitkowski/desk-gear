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

import { FormTextInput } from "./form-text-input"

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

describe("FormTextInput", () => {
  it("renderuje label powiązany z inputem", () => {
    renderInForm(<FormTextInput<FieldValues> name="value" label="Email" />)
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
  })

  it("po blur pokazuje polski komunikat błędu z resolveErrorMessage + i18n", async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.string().min(8) })
    renderInForm(<FormTextInput<FieldValues> name="value" label="Hasło" />, {
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
      <FormTextInput<FieldValues>
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
    renderInForm(<FormTextInput<FieldValues> name="value" label="Email" />, {
      resolver: zodResolver(schema),
    })

    const input = screen.getByLabelText("Email")
    expect(input).toHaveAttribute("aria-invalid", "false")

    await user.click(input)
    await user.tab()

    expect(input).toHaveAttribute("aria-invalid", "true")
  })

  it("renderuje description z aria-describedby i chowa ją gdy pojawi się błąd", async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.string().min(1) })
    renderInForm(
      <FormTextInput<FieldValues> name="value" label="Nazwa" description="Widoczna publicznie" />,
      { resolver: zodResolver(schema) },
    )

    const input = screen.getByLabelText("Nazwa")
    expect(screen.getByText("Widoczna publicznie")).toBeInTheDocument()
    expect(input).toHaveAttribute("aria-describedby", "value-description")

    await user.click(input)
    await user.tab()

    // Po pojawieniu się błędu description znika, a aria-describedby wskazuje error.
    expect(screen.queryByText("Widoczna publicznie")).not.toBeInTheDocument()
    expect(input).toHaveAttribute("aria-describedby", "value-error")
  })
})
