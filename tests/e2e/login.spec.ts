import { expect, test } from "@playwright/test"

// Dane admina z seeda (prisma/seed.ts). Prereq: `npm run db:seed`.
const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL ?? "admin@desk-gear.local"
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? "ChangeMe1234!"

test("user logs in and lands on home", async ({ page }) => {
  await page.goto("/login")

  await page.getByLabel("Adres email").fill(ADMIN_EMAIL)
  await page.getByLabel("Hasło", { exact: true }).fill(ADMIN_PASSWORD)
  await page.getByRole("button", { name: "Zaloguj się" }).click()

  // Po zalogowaniu redirect na stronę główną (URL kończy się "/"); w nagłówku pojawia się menu
  // użytkownika (przycisk z inicjałem emaila) — dowód zalogowanej sesji.
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole("button", { name: "Menu użytkownika" })).toBeVisible()
})

test("złe dane logowania → komunikat błędu, brak redirectu", async ({ page }) => {
  await page.goto("/login")

  await page.getByLabel("Adres email").fill("nieistnieje@desk-gear.local")
  await page.getByLabel("Hasło", { exact: true }).fill("zle-haslo-123")
  await page.getByRole("button", { name: "Zaloguj się" }).click()

  await expect(page.getByText("Nieprawidłowe dane logowania")).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})
