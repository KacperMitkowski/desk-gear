import Link from "next/link"

import { t } from "@/i18n/translate"

// Stopka sklepu z dummy contentem (puste linki) — profesjonalny wygląd e-commerce.
export function SiteFooter() {
  const year = new Date().getFullYear()

  const columns = [
    {
      title: t("layout.footer.shop"),
      links: [
        t("layout.footer.links.keyboards"),
        t("layout.footer.links.audio"),
        t("layout.footer.links.displays"),
        t("layout.footer.links.workspace"),
      ],
    },
    {
      title: t("layout.footer.company"),
      links: [
        t("layout.footer.links.about"),
        t("layout.footer.links.careers"),
        t("layout.footer.links.blog"),
        t("layout.footer.links.press"),
      ],
    },
    {
      title: t("layout.footer.support"),
      links: [
        t("layout.footer.links.help"),
        t("layout.footer.links.shipping"),
        t("layout.footer.links.returns"),
        t("layout.footer.links.contact"),
      ],
    },
  ]

  return (
    <footer className="border-t bg-muted dark:bg-card">
      <div className="mx-auto max-w-7xl p-6 pb-3">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link
              href="/"
              className="flex items-baseline gap-2 text-lg font-extrabold tracking-tight"
            >
              <span className="text-primary">▮</span>
              <span>DESKGEAR</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              {t("layout.footer.tagline")}
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t pt-3 text-center text-xs text-muted-foreground">
          © {year} DeskGear. {t("layout.footer.rights")}
        </div>
      </div>
    </footer>
  )
}
