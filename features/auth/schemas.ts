import { z } from "zod"

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export type LoginInput = z.infer<typeof loginSchema>

// Polityka hasła: min. 12 znaków (spójnie z ADMIN_SEED_PASSWORD) + złożoność.
// Wszystkie regexy złożoności dają kod `invalid_format` — formularz pokrywa je jednym
// override'em `passwordComplexity`; długość to `too_small`. Niezgodność haseł i brak akceptacji
// regulaminu to refine'y o kodzie `custom` (na confirmPassword / acceptTerms). acceptTerms jest
// boolean (nie literal), by defaultValues w RHF mógł startować z false bez konfliktu typów.
const PASSWORD_MIN_LENGTH = 12

export const registerSchema = z
  .object({
    email: z.email(),
    password: z.string().min(PASSWORD_MIN_LENGTH).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((val) => val === true),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
  })

export type RegisterInput = z.infer<typeof registerSchema>
