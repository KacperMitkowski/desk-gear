import authLogin from "./pl/auth/login.json"
import authRegister from "./pl/auth/register.json"
import errors from "./pl/common/errors.json"
import forms from "./pl/common/forms.json"
import layout from "./pl/common/layout.json"
import nav from "./pl/common/nav.json"

// Namespace `auth` zbiera klucze logowania i rejestracji (rozłączne podobiekty: login.*, register.*).
const auth = { ...authLogin, ...authRegister }

// Namespace = nazwa pliku. Kolejne featurey dokładać tu jako importy (np. i18n/pl/products/...).
export const messages = { errors, forms, nav, layout, auth } as const

export type Messages = typeof messages
