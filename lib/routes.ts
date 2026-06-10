// Centralna mapa ścieżek aplikacji. Cel: koniec ze stringami inline ("/login", "/account") w
// akcjach, formularzach, redirectach — typo nie skompiluje się, refactor (zmiana nazwy ścieżki)
// to jedno miejsce, nie grep po całym repo. `as const` daje literal types — `ROUTES.LOGIN`
// jest typu `"/login"`, nie `string`, więc TypeScript widzi konkretne wartości w narrowingu.
//
// Dodawaj kolejne ścieżki w miarę potrzeby, NIE budujemy mapy "na zapas".
export const ROUTES = {
  HOME: "/",
  PRODUCTS: "/products",
  LOGIN: "/login",
  REGISTER: "/register",
  ADMIN: "/admin",
  FORGOT_PASSWORD: "/forgot-password",
  TERMS: "/terms",
  PRIVACY: "/privacy",
} as const
