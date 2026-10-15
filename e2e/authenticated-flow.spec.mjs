import { test, expect } from '@playwright/test'

const userEmail = process.env.E2E_TEST_USER_EMAIL
const userPassword = process.env.E2E_TEST_USER_PASSWORD
const adminEmail = process.env.E2E_TEST_ADMIN_EMAIL
const adminPassword = process.env.E2E_TEST_ADMIN_PASSWORD

const hasCredentials = userEmail && userPassword && adminEmail && adminPassword

function requireCredentials() {
  if (!hasCredentials) {
    throw new Error('Missing E2E_TEST_USER_EMAIL/E2E_TEST_USER_PASSWORD/E2E_TEST_ADMIN_EMAIL/E2E_TEST_ADMIN_PASSWORD')
  }
}

async function login(page, email, password) {
  await page.goto('/login')
  await page.getByLabel('Adresse e-mail').fill(email)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/$/)
}

test('authenticated flow: login → submission → moderation → favorite → review', async ({ browser }) => {
  test.skip(!hasCredentials && !process.env.CI, 'Authenticated E2E requires dedicated test credentials')
  requireCredentials()

  const uniqueName = `E2E Sahaba ${Date.now()}`
  const userContext = await browser.newContext()
  const adminContext = await browser.newContext()
  const userPage = await userContext.newPage()
  const adminPage = await adminContext.newPage()

  try {
    await login(userPage, userEmail, userPassword)

    await userPage.goto('/submit')
    await expect(userPage.getByRole('heading', { name: 'Proposer un lieu' })).toBeVisible()
    await userPage.getByLabel("Nom de l’établissement *").fill(uniqueName)
    await userPage.getByLabel('Adresse').fill('Grand-Place 1')
    await userPage.getByLabel('Ville *').fill('Bruxelles')
    await userPage.getByLabel('Pays *').fill('Belgique')
    await userPage.getByLabel('Description').fill('Lieu créé automatiquement par le parcours E2E authentifié.')
    await userPage.getByRole('button', { name: /Soumettre à la modération/ }).click()
    await expect(userPage.getByRole('status')).toContainText('attend une validation')

    await login(adminPage, adminEmail, adminPassword)
    await adminPage.goto('/admin')
    const pendingRow = adminPage.locator('article.admin-row').filter({ hasText: uniqueName })
    await expect(pendingRow).toBeVisible({ timeout: 30_000 })
    const locationHref = await pendingRow.getByRole('link', { name: 'Voir la fiche' }).getAttribute('href')
    expect(locationHref).toMatch(/^\/location\/.+/)
    await pendingRow.getByRole('button', { name: 'Publier le lieu' }).click()
    await expect(adminPage.getByRole('status')).toContainText('Lieu publié.')
    await expect(pendingRow).toHaveCount(0)

    await userPage.goto(locationHref)
    await expect(userPage.getByRole('heading', { name: uniqueName })).toBeVisible()

    await userPage.getByRole('button', { name: /Favoris/ }).click()
    await expect(userPage.getByRole('button', { name: /Enregistré/ })).toBeVisible()

    await userPage.getByLabel('Votre avis').fill('Avis automatique du parcours E2E authentifié.')
    await userPage.getByRole('button', { name: 'Publier l’avis' }).click()
    await expect(userPage.getByText('Avis automatique du parcours E2E authentifié.')).toBeVisible()
  } finally {
    await adminContext.close()
    await userContext.close()
  }
})
