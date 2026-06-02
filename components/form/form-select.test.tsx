import { zodResolver } from "@hookform/resolvers/zod"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { FormProvider, useForm, type Resolver, type UseFormProps } from "react-hook-form"
import { describe, expect, it } from "vitest"
import * as z from "zod"

import "@/lib/validation/zod-error-map"

import { FormSelect, type SelectOption } from "./form-select"

type FieldValues = { value: string }

const OPTIONS: SelectOption[] = [
  { value: "asc", label: "Cena rosnąco" },
  { value: "desc", label: "Cena malejąco" },
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

describe("FormSelect", () => {
  it("renderuje label powiązany z kontrolką i placeholder", () => {
    renderInForm(
      <FormSelect<FieldValues>
        name="value"
        label="Sortowanie"
        placeholder="Wybierz"
        options={OPTIONS}
      />,
    )
    expect(screen.getByLabelText("Sortowanie")).toBeInTheDocument()
    expect(screen.getByText("Wybierz")).toBeInTheDocument()
  })

  it("po submit pokazuje polski komunikat błędu z resolveErrorMessage + i18n", async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.enum(["asc", "desc"]) })
    renderInForm(<FormSelect<FieldValues> name="value" label="Sortowanie" options={OPTIONS} />, {
      resolver: zodResolver(schema) as Resolver<FieldValues>,
    })

    await user.click(screen.getByRole("button", { name: "Wyślij" }))

    expect(await screen.findByText("Niedozwolona wartość")).toBeInTheDocument()
  })

  it("override per pole zastępuje komunikat z i18n", async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.enum(["asc", "desc"]) })
    renderInForm(
      <FormSelect<FieldValues>
        name="value"
        label="Sortowanie"
        options={OPTIONS}
        errorMessages={{ invalid_value: "Wybierz sposób sortowania" }}
      />,
      { resolver: zodResolver(schema) as Resolver<FieldValues> },
    )

    await user.click(screen.getByRole("button", { name: "Wyślij" }))

    expect(await screen.findByText("Wybierz sposób sortowania")).toBeInTheDocument()
    expect(screen.queryByText("Niedozwolona wartość")).not.toBeInTheDocument()
  })

  it('ustawia aria-invalid="true" gdy pole ma błąd', async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.enum(["asc", "desc"]) })
    renderInForm(<FormSelect<FieldValues> name="value" label="Sortowanie" options={OPTIONS} />, {
      resolver: zodResolver(schema) as Resolver<FieldValues>,
    })

    const trigger = screen.getByLabelText("Sortowanie")
    expect(trigger).toHaveAttribute("aria-invalid", "false")

    await user.click(screen.getByRole("button", { name: "Wyślij" }))

    expect(trigger).toHaveAttribute("aria-invalid", "true")
  })

  it("wybór opcji aktualizuje wartość pola", async () => {
    const user = userEvent.setup()
    renderInForm(
      <FormSelect<FieldValues>
        name="value"
        label="Sortowanie"
        placeholder="Wybierz"
        options={OPTIONS}
      />,
    )

    const trigger = screen.getByLabelText("Sortowanie")
    expect(trigger).toHaveTextContent("Wybierz")

    await user.click(trigger)
    await user.click(await screen.findByRole("option", { name: "Cena malejąco" }))

    // Wybrana wartość renderuje się w triggerze (combobox), placeholder znika.
    expect(trigger).toHaveTextContent("Cena malejąco")
    expect(trigger).not.toHaveTextContent("Wybierz")
  })
})
