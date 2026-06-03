import { expect, test } from "@playwright/test"

// Admin z seeda — testy duplikatu używają jego emaila, bo wiadomo że istnieje w DB.
// Prereq: `npm run db:seed`.
const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL ?? "admin@desk-gear.local"

// Hasło spełniające politykę z registerSchema (min 12 + małe + WIELKIE + cyfra).
const VALID_PASSWORD = "TestPass1234"

test("rejestracja nowego konta → auto-login + redirect na /account + toast powitalny", async ({
  page,
}) => {
  // Unikalny email per run — bez tego druga próba zwróciłaby EMAIL_ALREADY_EXISTS.
  // Akceptujemy lekkie zaśmiecanie DB w dev/CI; dedykowanego cleanup-u nie ma.
  const uniqueEmail = `e2e+${Date.now()}@desk-gear.local`

  await page.goto("/register")

  await page.getByLabel("Adres email").fill(uniqueEmail)
  await page.getByLabel("Hasło", { exact: true }).fill(VALID_PASSWORD)
  await page.getByLabel("Powtórz hasło").fill(VALID_PASSWORD)
  await page.getByRole("checkbox").check()
  await page.getByRole("button", { name: "Utwórz konto" }).click()

  await expect(page).toHaveURL(/\/account/)
  await expect(page.getByText("Konto utworzone — witamy w DeskGear!")).toBeVisible()
  // Sanity: na /account widać email zalogowanego usera (cookie sesji ustawiony przez signIn).
  await expect(page.getByText(uniqueEmail)).toBeVisible()
})

test("rejestracja na istniejący email → toast błędu, brak redirectu", async ({ page }) => {
  await page.goto("/register")

  await page.getByLabel("Adres email").fill(ADMIN_EMAIL)
  await page.getByLabel("Hasło", { exact: true }).fill(VALID_PASSWORD)
  await page.getByLabel("Powtórz hasło").fill(VALID_PASSWORD)
  await page.getByRole("checkbox").check()
  await page.getByRole("button", { name: "Utwórz konto" }).click()

  await expect(page.getByText("Konto z tym adresem email już istnieje")).toBeVisible()
  await expect(page).toHaveURL(/\/register/)
})
