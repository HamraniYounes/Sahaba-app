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
