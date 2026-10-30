import { test, expect } from './fixtures'

test('dashboard loads with the demo portfolio value', async ({ page }) => {
  await page.goto('')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('Total portfolio value')).toBeVisible()
  // Demo mode must say so next to the number (mock data is a mode, not a fallback).
  await expect(page.getByText('Demo', { exact: true }).first()).toBeVisible()
})

test('sidebar navigates between sections', async ({ page }) => {
  await page.goto('')
  const nav = page.getByRole('navigation').first()
  for (const [label, heading] of [
    ['Portfolios', 'Portfolios overview'],
    ['Prices', 'Prices'],
    ['Settings', 'Settings'],
  ]) {
    await nav.getByRole('link', { name: label, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page')
  }
})

test('portfolio list renders the portfolios from the API', async ({ page }) => {
  await page.goto('portfolios')
  await expect(page.getByRole('heading', { name: 'Portfolios', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Long term' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Playground' })).toBeVisible()
})

test('portfolio page opens from the list', async ({ page }) => {
  await page.goto('portfolios')
  await page.getByRole('link', { name: 'Long term' }).click()
  await expect(page).toHaveURL(/\/app\/portfolios\/pf-main$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Long term' })).toBeVisible()
  await expect(page.getByText('Core holdings')).toBeVisible()
  for (const tab of ['Overview', 'Holdings', 'Settings']) {
    await expect(page.getByRole('tab', { name: tab })).toBeVisible()
  }
})

test('unknown portfolio shows not found', async ({ page }) => {
  await page.goto('portfolios/missing')
  await expect(page.getByText('Portfolio not found.')).toBeVisible()
})

test('account form opens, validates and submits', async ({ page, backend }) => {
  await page.goto('settings')
  await page.getByRole('button', { name: 'Add your first account' }).click()

  const dialog = page.getByRole('dialog', { name: 'New Account' })
  await expect(dialog).toBeVisible()

  // Required field: an empty name must not reach the API.
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog.getByText('Name is required')).toBeVisible()
  expect(backend.calls).toEqual([])

  await dialog.getByLabel('Name').fill('Cold storage')
  await dialog.getByRole('combobox').first().click()
  await page.getByRole('option', { name: /^Manual/ }).click()
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByRole('cell', { name: 'Cold storage' })).toBeVisible()
  expect(backend.calls).toHaveLength(1)
  expect(backend.calls[0].body).toMatchObject({ account: { name: 'Cold storage', type: 'ACCOUNT_TYPE_MANUAL' } })
})
