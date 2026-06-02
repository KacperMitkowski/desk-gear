import { zodResolver } from "@hookform/resolvers/zod"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { FormProvider, useForm, type Resolver, type UseFormProps } from "react-hook-form"
import { describe, expect, it } from "vitest"
import * as z from "zod"

import "@/lib/validation/zod-error-map"

import { FormRadioGroup, type RadioOption } from "./form-radio-group"

type FieldValues = { value: string }

const OPTIONS: RadioOption[] = [
  { value: "courier", label: "Kurier", description: "1–2 dni robocze" },
  { value: "pickup", label: "Odbiór osobisty" },
]

function renderInForm(field: ReactNode, formOptions: UseFormProps<FieldValues> = {}) {
  function Wrapper() {
    const methods = useForm<FieldValues>({
      mode: "onTouched",
      defaultValues: { value: "" },
      ...formOptions,
    })
    return (
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(() => {})}>
          {field}
          <button type="submit">Wyślij</button>
        </form>
      </FormProvider>
    )
  }
  return render(<Wrapper />)
}

describe("FormRadioGroup", () => {
  it("renderuje label grupy i etykiety wariantów", () => {
    renderInForm(<FormRadioGroup<FieldValues> name="value" label="Dostawa" options={OPTIONS} />)
    expect(screen.getByText("Dostawa")).toBeInTheDocument()
    expect(screen.getByLabelText("Kurier")).toBeInTheDocument()
    expect(screen.getByLabelText("Odbiór osobisty")).toBeInTheDocument()
  })

  it("po submit pokazuje polski komunikat błędu z resolveErrorMessage + i18n", async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.enum(["courier", "pickup"]) })
    renderInForm(<FormRadioGroup<FieldValues> name="value" label="Dostawa" options={OPTIONS} />, {
      resolver: zodResolver(schema) as Resolver<FieldValues>,
    })

    await user.click(screen.getByRole("button", { name: "Wyślij" }))

    expect(await screen.findByText("Niedozwolona wartość")).toBeInTheDocument()
  })

  it("override per pole zastępuje komunikat z i18n", async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.enum(["courier", "pickup"]) })
    renderInForm(
      <FormRadioGroup<FieldValues>
        name="value"
        label="Dostawa"
        options={OPTIONS}
        errorMessages={{ invalid_value: "Wybierz sposób dostawy" }}
      />,
      { resolver: zodResolver(schema) as Resolver<FieldValues> },
    )

    await user.click(screen.getByRole("button", { name: "Wyślij" }))

    expect(await screen.findByText("Wybierz sposób dostawy")).toBeInTheDocument()
    expect(screen.queryByText("Niedozwolona wartość")).not.toBeInTheDocument()
  })

  it('ustawia aria-invalid="true" gdy pole ma błąd', async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.enum(["courier", "pickup"]) })
    renderInForm(<FormRadioGroup<FieldValues> name="value" label="Dostawa" options={OPTIONS} />, {
      resolver: zodResolver(schema) as Resolver<FieldValues>,
    })

    const group = screen.getByRole("radiogroup")
    expect(group).toHaveAttribute("aria-invalid", "false")

    await user.click(screen.getByRole("button", { name: "Wyślij" }))

    expect(group).toHaveAttribute("aria-invalid", "true")
  })

  it("wybór wariantu aktualizuje wartość pola", async () => {
    const user = userEvent.setup()
    renderInForm(<FormRadioGroup<FieldValues> name="value" label="Dostawa" options={OPTIONS} />)

    const courier = screen.getByLabelText("Kurier")
    expect(courier).not.toBeChecked()

    await user.click(courier)

    expect(courier).toBeChecked()
  })
})
