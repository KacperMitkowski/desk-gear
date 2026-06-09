import authLogin from "./pl/auth/login.json"
import authRegister from "./pl/auth/register.json"
import errors from "./pl/common/errors.json"
import forms from "./pl/common/forms.json"
import layout from "./pl/common/layout.json"
import nav from "./pl/common/nav.json"
import productsList from "./pl/products/list.json"

// Namespace `auth` zbiera klucze logowania i rejestracji (rozłączne podobiekty: login.*, register.*).
const auth = { ...authLogin, ...authRegister }

// Namespace `products` — klucze listy produktów (PLP). Plik trzyma już zagnieżdżenie `list.*`.
const products = { ...productsList }

// Namespace = nazwa pliku. Kolejne featurey dokładać tu jako importy (np. i18n/pl/products/...).
export const messages = { errors, forms, nav, layout, auth, products } as const

export type Messages = typeof messages
