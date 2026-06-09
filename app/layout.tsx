import type { Metadata } from "next"
import { Manrope } from "next/font/google"
import "./globals.css"

import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { Toaster } from "@/components/ui/sonner"

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
})

export const metadata: Metadata = {
  title: "DeskGear",
  description: "DeskGear — sklep z akcesoriami biurkowymi",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pl" suppressHydrationWarning className={`${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {/* Wspólny chrome sklepu — jedno źródło dla wszystkich tras (shop, auth, account). */}
          <SiteHeader />
          <main className="flex flex-1 flex-col">{children}</main>
          <SiteFooter />
          <Toaster richColors position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
