import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { auth, signOut } from "@/lib/auth/auth"
import { t } from "@/i18n/translate"

// Minimalna chroniona strona — cel redirectu po zalogowaniu + miejsce na wylogowanie.
// Dostęp pilnuje też proxy.ts (matcher /account/:path*); auth() jest tu drugą warstwą.
export default async function AccountPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <section className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px] rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">{t("auth.account.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("auth.account.loggedInAs")}:{" "}
          <span className="font-medium text-foreground">{session.user.email}</span>
        </p>
        <form
          action={async () => {
            "use server"
            await signOut({ redirectTo: "/login" })
          }}
          className="mt-6"
        >
          <Button type="submit" variant="outline" size="lg">
            {t("auth.account.signOut")}
          </Button>
        </form>
      </div>
    </section>
  )
}
