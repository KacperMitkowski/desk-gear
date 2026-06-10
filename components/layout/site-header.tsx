import Link from "next/link"

import { HeaderAuth } from "@/components/layout/header-auth"
import { HeaderCart } from "@/components/layout/header-cart"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { buildProductsQuery } from "@/features/products/filters-url"
import { t } from "@/i18n/translate"
import { auth } from "@/lib/auth/auth"

export async function SiteHeader() {
  const session = await auth()

  const nav = [
    { label: t("layout.nav.keyboards"), category: "keyboards" },
    { label: t("layout.nav.audio"), category: "headphones" },
    { label: t("layout.nav.display"), category: "monitors" },
    { label: t("layout.nav.workspace"), category: "desk-accessories" },
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
              href={buildProductsQuery({ category: item.category })}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <HeaderCart />
          <HeaderAuth email={session?.user?.email ?? null} />
        </div>
      </div>
    </header>
  )
}
