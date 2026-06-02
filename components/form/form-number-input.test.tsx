import { zodResolver } from "@hookform/resolvers/zod"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { FormProvider, useForm, type Resolver, type UseFormProps } from "react-hook-form"
import { describe, expect, it } from "vitest"
import * as z from "zod"

import "@/lib/validation/zod-error-map"

import { FormNumberInput } from "./form-number-input"

type FieldValues = { value: number | undefined }

function renderInForm(field: ReactNode, formOptions: UseFormProps<FieldValues> = {}) {
  function Wrapper() {
    const methods = useForm<FieldValues>({
      mode: "onTouched",
      defaultValues: { value: undefined },
      ...formOptions,
    })
    return <FormProvider {...methods}>{field}</FormProvider>
  }
  return render(<Wrapper />)
}

describe("FormNumberInput", () => {
  it("renderuje label powiązany z inputem", () => {
    renderInForm(<FormNumberInput<FieldValues> name="value" label="Ilość" />)
    expect(screen.getByLabelText("Ilość")).toBeInTheDocument()
  })

  it("po blur pokazuje liczbowy komunikat błędu z resolveErrorMessage + i18n", async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.number().min(1) })
    renderInForm(<FormNumberInput<FieldValues> name="value" label="Ilość" />, {
      resolver: zodResolver(schema) as Resolver<FieldValues>,
    })

    const input = screen.getByLabelText("Ilość")
    await user.type(input, "0")
    await user.tab()

    // Wariant "number" z i18n (errors.too_small.number), nie "string".
    expect(await screen.findByText("Wartość musi być co najmniej 1")).toBeInTheDocument()
  })

  it("override per pole zastępuje komunikat z i18n", async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.number().min(1) })
    renderInForm(
      <FormNumberInput<FieldValues>
        name="value"
        label="Ilość"
        errorMessages={{ too_small: "Minimum 1 sztuka" }}
      />,
      { resolver: zodResolver(schema) as Resolver<FieldValues> },
    )

    const input = screen.getByLabelText("Ilość")
    await user.type(input, "0")
    await user.tab()

    expect(await screen.findByText("Minimum 1 sztuka")).toBeInTheDocument()
    expect(screen.queryByText("Wartość musi być co najmniej 1")).not.toBeInTheDocument()
  })

  it('ustawia aria-invalid="true" gdy pole ma błąd', async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.number().min(1) })
    renderInForm(<FormNumberInput<FieldValues> name="value" label="Ilość" />, {
      resolver: zodResolver(schema) as Resolver<FieldValues>,
    })

    const input = screen.getByLabelText("Ilość")
    expect(input).toHaveAttribute("aria-invalid", "false")

    await user.type(input, "0")
    await user.tab()

    expect(input).toHaveAttribute("aria-invalid", "true")
  })

  it("wpisanie liczby aktualizuje wartość pola", async () => {
    const user = userEvent.setup()
    renderInForm(<FormNumberInput<FieldValues> name="value" label="Ilość" />)

    const input = screen.getByLabelText("Ilość") as HTMLInputElement
    await user.type(input, "5")

    expect(input.value).toBe("5")
  })
})
