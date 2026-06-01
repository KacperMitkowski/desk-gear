"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// Wrapper sonnera spięty z next-themes — toasty zmieniają motyw razem z resztą UI.
function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme()

  return <Sonner theme={theme as ToasterProps["theme"]} {...props} />
}

export { Toaster }
