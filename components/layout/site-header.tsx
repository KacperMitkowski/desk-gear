import { ShoppingCart } from "lucide-react"
import Link from "next/link"

import { HeaderAuth } from "@/components/layout/header-auth"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Button } from "@/components/ui/button"
import { t } from "@/i18n/translate"
import { auth } from "@/lib/auth/auth"

// Wspólny nagłówek sklepu. Linki nawigacji to na razie placeholdery (kategorie/koszyk
// dochodzą w kolejnych taskach). Server component — czyta sesję, żeby pokazać "Zaloguj się"
// niezalogowanym, a "Konto" zalogowanym.
export async function SiteHeader() {
  const session = await auth()

  const nav = [
    { label: t("layout.nav.keyboards"), href: "#" },
    { label: t("layout.nav.audio"), href: "#" },
    { label: t("layout.nav.display"), href: "#" },
    { label: t("layout.nav.workspace"), href: "#" },
  ]

  return (
    <header className="sticky top-0 z-40 border-b bg-muted/80 backdrop-blur dark:bg-card/80">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-8 px-6">
        <Link href="/" className="flex items-baseline gap-2 text-lg font-extrabold tracking-tight">
          <span className="text-primary">▮</span>
          <span>DESKGEAR</span>
          <span className="font-mono text-[0.6875rem] font-normal text-muted-foreground">/ v1</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="icon" aria-label={t("layout.header.cart")}>
            <Link href="#">
              <ShoppingCart />
            </Link>
          </Button>
          <HeaderAuth email={session?.user?.email ?? null} />
        </div>
      </div>
    </header>
  )
}
