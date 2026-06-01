"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { t } from "@/i18n/translate"

// Przełącznik jasny/ciemny. Ikona sterowana CSS-em (dark:), więc nie ma migotania ani
// niezgodności hydracji — JS potrzebny tylko do samego przełączenia.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={t("layout.header.toggleTheme")}
      className="cursor-pointer"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  )
}
