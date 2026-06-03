import { expect, test } from "@playwright/test"

// Admin z seeda — testy duplikatu używają jego emaila, bo wiadomo że istnieje w DB.
// Prereq: `npm run db:seed`.
const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL ?? "admin@desk-gear.local"

// Hasło spełniające politykę z registerSchema (min 12 + małe + WIELKIE + cyfra).
const VALID_PASSWORD = "TestPass1234"

// Kontrakt rejestracji: NIE robimy auto-loginu. Po `registerUser` redirect na `/login` i
// user samodzielnie wpisuje hasło. To jest świadoma zmiana względem pierwotnego acceptance
// criteria w issue #24 (które mówiło o auto-loginie + redirect na /account) — rationale
// w ARCHITECTURE.md §E6.2 (decyzje UX: utrwalenie hasła + brak phishing-friendly „magic"
// + cieńszy `registerAction` bez `signIn`). Jeśli AC ma kiedyś zostać przywrócone,
// zmiana jest mechaniczna (test + akcja + i18n + ARCHITECTURE.md), nie tykać bez sygnału
// od product owner-a.
test("rejestracja nowego konta → toast sukcesu + redirect na /login (bez auto-loginu)", async ({
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

  // Zamierzone: /login, NIE /account. Patrz komentarz nad testem + ARCHITECTURE.md §E6.2.
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText("Konto utworzone — możesz się teraz zalogować")).toBeVisible()
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
