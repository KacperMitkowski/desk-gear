import Link from "next/link"

import { t } from "@/i18n/translate"
import { ROUTES } from "@/lib/routes"

export function AuthFooter() {
  return (
    <p className="mt-8 text-center text-xs text-muted-foreground">
      {t("auth.footer.prefix")}{" "}
      <Link
        href={ROUTES.TERMS}
        className="text-primary underline underline-offset-4 hover:text-primary/80"
      >
        {t("auth.footer.terms")}
      </Link>{" "}
      {t("auth.footer.middle")}{" "}
      <Link
        href={ROUTES.PRIVACY}
        className="text-primary underline underline-offset-4 hover:text-primary/80"
      >
        {t("auth.footer.privacy")}
      </Link>
    </p>
  )
}
