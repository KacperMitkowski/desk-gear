import { z } from "zod"

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export type LoginFormValues = z.infer<typeof loginSchema>

const PASSWORD_MIN_LENGTH = 12

export const registerSchema = z
  .object({
    email: z.email(),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH)
      .regex(/[a-z]/) // wymaga przynajmniej jednej małej litery (a-z)
      .regex(/[A-Z]/) // wymaga przynajmniej jednej wielkiej litery (A-Z)
      .regex(/[0-9]/), // wymaga przynajmniej jednej cyfry (0-9)
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((val) => val === true),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
  })

export type RegisterFormValues = z.infer<typeof registerSchema>
