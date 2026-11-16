import type { Locator, Page } from '@playwright/test'
import { test, expect } from './fixtures'

// Screenshots for the project landing page, taken in demo mode so that no real
// balance, address or portfolio composition can reach them (the demo portfolio
// is invented, see src/lib/mocks/portfolio-data.ts). Not a test of behaviour:
// it runs only in the "screenshots" project (make screenshots).
//
// Only the screens that have demo data are here. Assets, Prices and Rules need
// a backend and render empty states in demo mode.

const OUT = 'screenshots'

type Shot = {
  name: string
  path: string
  style: 'observatory' | 'ledger'
  scheme: 'dark' | 'light'
  // Brings the screen to the state worth showing, and waits for it.
  prepare?: (page: Page) => Promise<void>
  // Shoot one element instead of the viewport.
  target?: (page: Page) => Locator
}

const SHOTS: Shot[] = [
  { name: 'dashboard', path: '', style: 'observatory', scheme: 'dark' },
  { name: 'allocation', path: 'portfolios', style: 'observatory', scheme: 'dark' },
  {
    // The holdings table under the portfolio's Overview tab (the Holdings tab
    // edits backend holdings and is empty in demo mode). The unpriced row is
    // the point of this frame: it sorts last, at zero value.
    name: 'holdings',
    path: 'portfolios/pf-main',
    style: 'observatory',
    scheme: 'dark',
    prepare: async (page) => {
      await expect(page.getByText('unpriced').first()).toBeVisible()
    },
    target: (page) =>
      page.getByRole('heading', { level: 2, name: 'Holdings', exact: true }).locator('..'),
  },
  { name: 'dashboard-ledger-light', path: '', style: 'ledger', scheme: 'light' },
]

for (const shot of SHOTS) {
  test(shot.name, async ({ page }) => {
    await page.emulateMedia({ colorScheme: shot.scheme })
    await page.addInitScript(({ style, scheme }) => {
      localStorage.setItem('ge-style', style)
      localStorage.setItem('theme', scheme)
    }, { style: shot.style, scheme: shot.scheme })
    await page.goto(shot.path)
    await expect(page.getByText('Demo', { exact: true }).first()).toBeVisible()
    await shot.prepare?.(page)
    await page.waitForLoadState('networkidle')
    // Let charts finish their entry animation.
    await page.waitForTimeout(1500)
    const path = `${OUT}/${shot.name}.png`
    // The app header is sticky: scrolled to an element, it would sit on top
    // of the element's first rows.
    if (shot.target) await shot.target(page).screenshot({ path, style: 'header { position: static !important; }' })
    else await page.screenshot({ path })
  })
}
