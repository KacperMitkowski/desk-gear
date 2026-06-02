import { zodResolver } from "@hookform/resolvers/zod"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { FormProvider, useForm, type UseFormProps } from "react-hook-form"
import { describe, expect, it } from "vitest"
import * as z from "zod"

import "@/lib/validation/zod-error-map"

import { FormTextarea } from "./form-textarea"

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

describe("FormTextarea", () => {
  it("renderuje label powiązany z polem", () => {
    renderInForm(<FormTextarea<FieldValues> name="value" label="Uwagi" />)
    expect(screen.getByLabelText("Uwagi")).toBeInTheDocument()
  })

  it("po blur pokazuje polski komunikat błędu z resolveErrorMessage + i18n", async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.string().min(10) })
    renderInForm(<FormTextarea<FieldValues> name="value" label="Uwagi" />, {
      resolver: zodResolver(schema),
    })

    const textarea = screen.getByLabelText("Uwagi")
    await user.type(textarea, "krótko")
    await user.tab()

    expect(await screen.findByText("Wymagane co najmniej 10 znaków")).toBeInTheDocument()
  })

  it("override per pole zastępuje komunikat z i18n", async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.string().min(10) })
    renderInForm(
      <FormTextarea<FieldValues>
        name="value"
        label="Uwagi"
        errorMessages={{ too_small: "Opisz dokładniej" }}
      />,
      { resolver: zodResolver(schema) },
    )

    const textarea = screen.getByLabelText("Uwagi")
    await user.type(textarea, "krótko")
    await user.tab()

    expect(await screen.findByText("Opisz dokładniej")).toBeInTheDocument()
    expect(screen.queryByText("Wymagane co najmniej 10 znaków")).not.toBeInTheDocument()
  })

  it('ustawia aria-invalid="true" gdy pole ma błąd', async () => {
    const user = userEvent.setup()
    const schema = z.object({ value: z.string().min(10) })
    renderInForm(<FormTextarea<FieldValues> name="value" label="Uwagi" />, {
      resolver: zodResolver(schema),
    })

    const textarea = screen.getByLabelText("Uwagi")
    expect(textarea).toHaveAttribute("aria-invalid", "false")

    await user.type(textarea, "krótko")
    await user.tab()

    expect(textarea).toHaveAttribute("aria-invalid", "true")
  })

  it("wpisanie tekstu aktualizuje wartość pola", async () => {
    const user = userEvent.setup()
    renderInForm(<FormTextarea<FieldValues> name="value" label="Uwagi" />)

    const textarea = screen.getByLabelText("Uwagi") as HTMLTextAreaElement
    await user.type(textarea, "Treść uwagi")

    expect(textarea.value).toBe("Treść uwagi")
  })
})
