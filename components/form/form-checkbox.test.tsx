import { zodResolver } from "@hookform/resolvers/zod"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { FormProvider, useForm, type Resolver, type UseFormProps } from "react-hook-form"
import { describe, expect, it } from "vitest"
import * as z from "zod"

// Side-effect: globalna mapa błędów Zoda (JSON z code/params), bez niej kaskada nie ma czego dekodować.
import "@/lib/validation/zod-error-map"

import { FormCheckbox } from "./form-checkbox"

type FieldValues = { value: boolean }

function renderInForm(field: ReactNode, formOptions: UseFormProps<FieldValues> = {}) {
  function Wrapper() {
    const methods = useForm<FieldValues>({
      mode: "onTouched",
      defaultValues: { value: false },
      ...formOptions,
    })
    return <FormProvider {...methods}>{field}</FormProvider>
  }
  return render(<Wrapper />)
}

describe("FormCheckbox", () => {
  it("renderuje label powiązany z polem wyboru", () => {
    renderInForm(<FormCheckbox<FieldValues> name="value" label="Akceptuję regulamin" />)
    expect(screen.getByLabelText("Akceptuję regulamin")).toBeInTheDocument()
  })

  it("po blur pokazuje polski komunikat błędu z resolveErrorMessage + i18n", async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.literal(true) })
    renderInForm(<FormCheckbox<FieldValues> name="value" label="Akceptuję regulamin" />, {
      resolver: zodResolver(schema) as Resolver<FieldValues>,
    })

    await user.tab() // fokus na checkboxie
    await user.tab() // blur → walidacja w trybie onTouched

    expect(await screen.findByText("Niedozwolona wartość")).toBeInTheDocument()
  })

  it("override per pole zastępuje komunikat z i18n", async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.literal(true) })
    renderInForm(
      <FormCheckbox<FieldValues>
        name="value"
        label="Akceptuję regulamin"
        errorMessages={{ invalid_value: "Musisz zaakceptować regulamin" }}
      />,
      { resolver: zodResolver(schema) as Resolver<FieldValues> },
    )

    await user.tab()
    await user.tab()

    expect(await screen.findByText("Musisz zaakceptować regulamin")).toBeInTheDocument()
    expect(screen.queryByText("Niedozwolona wartość")).not.toBeInTheDocument()
  })

  it('ustawia aria-invalid="true" gdy pole ma błąd', async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.literal(true) })
    renderInForm(<FormCheckbox<FieldValues> name="value" label="Akceptuję regulamin" />, {
      resolver: zodResolver(schema) as Resolver<FieldValues>,
    })

    const checkbox = screen.getByRole("checkbox")
    expect(checkbox).toHaveAttribute("aria-invalid", "false")

    await user.tab()
    await user.tab()

    expect(checkbox).toHaveAttribute("aria-invalid", "true")
  })

  it("klik aktualizuje wartość pola (zaznacza checkbox)", async () => {
    const user = userEvent.setup()
    renderInForm(<FormCheckbox<FieldValues> name="value" label="Akceptuję regulamin" />)

    const checkbox = screen.getByRole("checkbox")
    expect(checkbox).not.toBeChecked()

    await user.click(checkbox)

    expect(checkbox).toBeChecked()
  })
})
