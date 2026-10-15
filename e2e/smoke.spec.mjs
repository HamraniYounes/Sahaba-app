import { test, expect } from '@playwright/test'

test('home page renders', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Sahaba/i)
  await expect(page.locator('body')).toContainText(/Sahaba/i)
})

test('unknown route falls back to home', async ({ page }) => {
  await page.goto('/route-that-does-not-exist')
  await expect(page).toHaveTitle(/Sahaba/i)
})

test('login page exposes the authentication form', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /Connectez-vous/i })).toBeVisible()
  await expect(page.getByLabel(/Adresse e-mail/i)).toBeVisible()
  await expect(page.getByLabel(/Mot de passe/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /Se connecter/i })).toBeVisible()
})

test('protected submission route redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/submit')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: /Connectez-vous/i })).toBeVisible()
})

test('protected favorites route redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/favorites')
  await expect(page).toHaveURL(/\/login$/)
})

test('admin route redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login$/)
})

test('login form shows configuration error when Supabase is unavailable', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/Adresse e-mail/i).fill('e2e@example.com')
  await page.getByLabel(/Mot de passe/i).fill('password123')
  await page.getByRole('button', { name: /Se connecter/i }).click()
  await expect(page.getByRole('alert')).toContainText(/Configurez Supabase/i)
})
