import errors from "./pl/common/errors.json"
import forms from "./pl/common/forms.json"
import nav from "./pl/common/nav.json"

// Namespace = nazwa pliku. Kolejne featurey dokładać tu jako importy (np. i18n/pl/products/...).
export const messages = { errors, forms, nav } as const

export type Messages = typeof messages
