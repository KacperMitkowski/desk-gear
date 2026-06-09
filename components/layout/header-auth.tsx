"use client"

import { LogOut, Package, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logoutAction } from "@/features/auth/actions"
import { t } from "@/i18n/translate"
import { ROUTES } from "@/lib/routes"

// Akcja auth w nagłówku. Klient, bo: (1) zależy od `pathname` (niezalogowanemu nie pokazujemy
// "Zaloguj się" na stronach logowania/rejestracji), (2) menu użytkownika to interaktywny dropdown.
// Stan sesji (email) dostajemy propsem z server-side SiteHeader.
export function HeaderAuth({ email }: { email: string | null }) {
  const pathname = usePathname()

  if (email) {
    return <UserMenu email={email} />
  }

  const onAuthPage = pathname === ROUTES.LOGIN || pathname === ROUTES.REGISTER
  if (onAuthPage) return null

  return (
    <Button asChild size="sm">
      <Link href={ROUTES.LOGIN}>{t("nav.login")}</Link>
    </Button>
  )
}

function UserMenu({ email }: { email: string }) {
  const initial = email.charAt(0).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("nav.menuLabel")}
          className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="truncate font-medium">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={ROUTES.ACCOUNT}>
            <User />
            {t("nav.profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="#">
            <Package />
            {t("nav.orders")}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Wylogowanie przez server action (form) — pewna obsługa redirectu po stronie Next. */}
        <form action={logoutAction}>
          <DropdownMenuItem variant="destructive" asChild>
            <button type="submit" className="w-full">
              <LogOut />
              {t("auth.account.signOut")}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
