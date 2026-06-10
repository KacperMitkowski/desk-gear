"use client"

import { ShoppingCart } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { t } from "@/i18n/translate"
import { ROUTES } from "@/lib/routes"

export function HeaderCart() {
  const pathname = usePathname()

  const onAuthPage = pathname === ROUTES.LOGIN || pathname === ROUTES.REGISTER
  if (onAuthPage) return null

  return (
    <Button asChild variant="ghost" size="icon" aria-label={t("layout.header.cart")}>
      <Link href="#">
        <ShoppingCart />
      </Link>
    </Button>
  )
}
