import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PortfolioValueHeader } from '@/components/portfolio/portfolio-value-header'
import { PortfolioScopeProvider } from '@/lib/portfolio-scope'
import type { Portfolio } from '@/lib/api/backend-types'
import { PortfolioList } from './components/portfolio-list'
import { PortfolioSettings } from './[id]/components/portfolio-settings'

vi.mock('@/lib/config/data-source', () => ({ DEMO_MODE: false, USE_BACKEND: true }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }))

// One portfolio of real money and one paper model flagged out of totals. The
// backend list is raw unless asked otherwise, and so is this stub: a reader
// that forgets to ask gets the paper position too.
const real: Portfolio = { id: 'real', userId: 'u', name: 'main', createdAt: '2026-01-01T00:00:00Z', updatedAt: '' }
const paper: Portfolio = { ...real, id: 'paper', name: 'paper model', excludedFromTotals: true }

const holdings = [
  { id: 'h1', amount: '100000000', decimals: 8, assetId: 'btc', accountId: 'a1', portfolioId: 'real' },
  { id: 'h2', amount: '500000000', decimals: 8, assetId: 'eth', accountId: 'a1', portfolioId: 'paper' },
]
const values: Record<string, string> = { real: '100000', paper: '99335' } // cents

function requestsTo(method: string) {
  return vi.mocked(fetch).mock.calls
    .filter(([input]) => String(input).endsWith(`/${method}`))
    .map(([, init]) => JSON.parse(String(init?.body)))
}

beforeEach(() => {
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    const url = String(input)
    const req = JSON.parse(String(init?.body ?? '{}'))
    const body = url.endsWith('/ListPortfolios') ? { portfolios: [real, paper] }
      : url.endsWith('/ListHoldings') ? {
          holdings: holdings.filter((h) =>
            req.portfolioId ? h.portfolioId === req.portfolioId
              : req.omitExcludedFromTotals ? h.portfolioId !== 'paper'
              : true),
        }
      : url.endsWith('/CalculatePortfolioValue') ? { portfolioId: req.portfolioId, totalValueAmount: values[req.portfolioId], decimals: 2 }
      : url.endsWith('/ListAssets') ? { assets: (req.ids as string[]).map((id) => ({ id, symbol: id.toUpperCase(), name: id })) }
      : url.endsWith('/ListAccounts') ? { accounts: [{ id: 'a1', userId: 'u', name: 'wallet', type: 'ACCOUNT_TYPE_WALLET' }] }
      : url.endsWith('/UpdatePortfolio') ? req.portfolio
      : {}
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
})

function renderWithClient(ui: React.ReactNode) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {ui}
    </QueryClientProvider>
  )
}

describe('a portfolio flagged out of totals', () => {
  it('is left out of the unscoped total, and never asked for its value', async () => {
    renderWithClient(<PortfolioValueHeader />)

    expect(await screen.findByText('$1,000')).toBeInTheDocument()
    expect(screen.getByText('1 assets')).toBeInTheDocument()

    expect(requestsTo('CalculatePortfolioValue').map((r) => r.portfolioId)).toEqual(['real'])
    expect(requestsTo('ListHoldings')[0]).toMatchObject({ omitExcludedFromTotals: true })
  })

  it('is valued in full when scoped on its own', async () => {
    renderWithClient(
      <PortfolioScopeProvider portfolioId="paper">
        <PortfolioValueHeader />
      </PortfolioScopeProvider>
    )

    expect(await screen.findByText('$993')).toBeInTheDocument()
    expect(screen.getByText('1 assets')).toBeInTheDocument()
    expect(requestsTo('ListHoldings')[0]).not.toHaveProperty('omitExcludedFromTotals')
  })

  it('carries the mark in the list, and the others do not', async () => {
    renderWithClient(<PortfolioList />)

    const flagged = (await screen.findByText('paper model')).closest('tr')!
    expect(within(flagged).getByText('not in totals')).toBeInTheDocument()
    expect(within(screen.getByText('main').closest('tr')!).queryByText('not in totals')).not.toBeInTheDocument()
  })

  it('is toggled from its settings by the flag alone, both ways', async () => {
    renderWithClient(
      <PortfolioScopeProvider portfolioId="paper">
        <PortfolioSettings portfolio={paper} />
      </PortfolioScopeProvider>
    )
    const box = screen.getByRole('checkbox', { name: 'Keep out of All portfolios totals' })
    expect(box).toBeChecked()

    // false is a real value here, not an absent field: it has to be named.
    fireEvent.click(box)
    await waitFor(() => expect(requestsTo('UpdatePortfolio')).toHaveLength(1))
    expect(requestsTo('UpdatePortfolio')[0]).toEqual({
      portfolio: { id: 'paper', excludedFromTotals: false },
      updateMask: 'excludedFromTotals',
    })
  })

  it('offers an unflagged portfolio the same switch, unchecked', async () => {
    renderWithClient(
      <PortfolioScopeProvider portfolioId="real">
        <PortfolioSettings portfolio={real} />
      </PortfolioScopeProvider>
    )
    const box = screen.getByRole('checkbox', { name: 'Keep out of All portfolios totals' })
    expect(box).not.toBeChecked()

    fireEvent.click(box)
    await waitFor(() => expect(requestsTo('UpdatePortfolio')).toHaveLength(1))
    expect(requestsTo('UpdatePortfolio')[0]).toEqual({
      portfolio: { id: 'real', excludedFromTotals: true },
      updateMask: 'excludedFromTotals',
    })
  })
})
