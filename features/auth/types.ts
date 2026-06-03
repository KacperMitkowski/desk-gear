import { RegisterFormValues } from "./schemas"

export type AuthSuccess = { redirectTo: string }

export type RegisterUserInput = Omit<RegisterFormValues, "confirmPassword" | "acceptTerms">
