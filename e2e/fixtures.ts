import { test as base, expect, type Page } from '@playwright/test'
import type { Account, Portfolio } from '../src/lib/api/backend-types'

// Demo mode serves holdings and prices from lib/mocks, but the portfolio and
// account screens have no demo data and still call the backend. This fixture
// stands in for those RPCs inside the browser, so no backend runs at all.
// Every test gets its own copy of the state, which keeps specs independent.

const NOW = '2026-01-01T00:00:00Z'

const SEED_PORTFOLIOS: Portfolio[] = [
  { id: 'pf-main', userId: 'e2e-user', name: 'Long term', description: 'Core holdings', createdAt: NOW, updatedAt: NOW },
  { id: 'pf-play', userId: 'e2e-user', name: 'Playground', createdAt: NOW, updatedAt: NOW },
]

export class FakeBackend {
  portfolios: Portfolio[] = structuredClone(SEED_PORTFOLIOS)
  accounts: Account[] = []
  // Bodies of the write RPCs, for asserting what the UI actually sent.
  calls: { method: string; body: Record<string, unknown> }[] = []

  handle(method: string, body: Record<string, unknown>): { status: number; json: unknown } {
    switch (method) {
      case 'ListPortfolios':
        return ok({ portfolios: this.portfolios })
      case 'GetPortfolio': {
        const found = this.portfolios.find((p) => p.id === body.id)
        return found ? ok(found) : { status: 404, json: { code: 'not_found', message: 'portfolio not found' } }
      }
      case 'ListAccounts':
        return ok({ accounts: this.accounts })
      case 'CreateAccount': {
        this.calls.push({ method, body })
        const input = body.account as Partial<Account>
        const account = { ...input, id: `acc-${this.accounts.length + 1}`, userId: 'e2e-user', createdAt: NOW, updatedAt: NOW } as Account
        this.accounts.push(account)
        return ok(account)
      }
      default:
        // List and health RPCs the screens touch only in passing: an empty
        // answer renders their empty states.
        return ok({})
    }
  }
}

function ok(json: unknown) {
  return { status: 200, json }
}

async function installFakeBackend(page: Page, backend: FakeBackend) {
  // Connect-RPC paths look like /eye.v1.PortfolioService/ListPortfolios.
  await page.route(/\/(eye|auth)\.v1\.\w+\/\w+$/, async (route) => {
    const method = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>
    const { status, json } = backend.handle(method, body)
    await route.fulfill({ status, json })
  })
}

export const test = base.extend<{ backend: FakeBackend }>({
  // auto: a spec that never names the backend still must not reach a real one.
  backend: [async ({ page }, use) => {
    const backend = new FakeBackend()
    await installFakeBackend(page, backend)
    // A render crash is a failure even if the asserted text happens to show.
    const errors: Error[] = []
    page.on('pageerror', (err) => errors.push(err))
    await use(backend)
    expect(errors, 'uncaught errors in the page').toEqual([])
  }, { auto: true }],
})

export { expect }
