import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { HoldingsTable } from './holdings-table'
import { buildRawHoldings } from '@/lib/api/adapters'
import type { Account, Holding } from '@/lib/api/backend-types'
import type { PortfolioHolding } from '@/lib/types/portfolio-view'

const base: PortfolioHolding[] = [
  {
    assetId: 'btc', symbol: 'BTC', name: 'Bitcoin', quantity: 1, price: 100, value: 100,
    percentage: 50, sources: [{ name: 'cold wallet', amount: 1 }],
  },
  {
    assetId: 'eth', symbol: 'ETH', name: 'Ethereum', quantity: 3, price: 100, value: 300,
    percentage: 50,
    sources: [
      { name: 'main exchange', amount: 1 },
      { name: 'hot wallet', amount: 2 },
    ],
  },
]

let holdings = base

vi.mock('@/hooks/use-portfolio', () => ({
  useHoldings: () => ({ data: holdings, totalValue: 400, isLoading: false, error: null }),
}))
vi.mock('@/components/asset/asset-link', () => ({
  AssetLink: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

describe('HoldingsTable', () => {
  beforeEach(() => {
    holdings = base
  })

  it('names the account on a single-source row, which does not expand', () => {
    render(<HoldingsTable />)
    expect(screen.getByText('cold wallet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /BTC/ })).not.toBeInTheDocument()
  })

  it('expands an aggregated row into its accounts', () => {
    render(<HoldingsTable />)
    expect(screen.getByText('2 accounts')).toBeInTheDocument()
    expect(screen.queryByText('hot wallet')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /ETH/ }))
    expect(screen.getByText('main exchange')).toBeInTheDocument()
    expect(screen.getByText('hot wallet')).toBeInTheDocument()
  })

  it('renders no account caption for a holding without sources', () => {
    holdings = [{ ...base[0], sources: [] }]
    render(<HoldingsTable />)
    expect(screen.getByText('BTC')).toBeInTheDocument()
    expect(screen.queryByText(/accounts/)).not.toBeInTheDocument()
  })

  it('hides the account caption and expansion when showSources is false', () => {
    render(<HoldingsTable showSources={false} />)
    expect(screen.queryByText('cold wallet')).not.toBeInTheDocument()
    expect(screen.queryByText('2 accounts')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ETH/ })).not.toBeInTheDocument()
  })

  it('shows a broker position as account name and amount, with no custody badge', () => {
    const accounts = [
      { id: 'acc-broker', name: 'my broker', type: 'ACCOUNT_TYPE_BROKER' },
      { id: 'acc-bank', name: 'my bank', type: 'ACCOUNT_TYPE_BANK' },
    ] as Account[]
    const backendHoldings = [
      { id: 'h1', assetId: 'spy', accountId: 'acc-broker', amount: '200', decimals: 0 },
      { id: 'h2', assetId: 'spy', accountId: 'acc-bank', amount: '100', decimals: 0 },
    ] as Holding[]
    const [raw] = buildRawHoldings(backendHoldings, accounts, [])
    holdings = [{
      assetId: 'spy', symbol: 'SPY', name: 'S&P 500 ETF', quantity: 300, price: 1, value: 300,
      percentage: 100, sources: raw.sources,
    }]

    render(<HoldingsTable />)
    fireEvent.click(screen.getByRole('button', { name: /SPY/ }))

    expect(screen.getByText('my broker')).toBeInTheDocument()
    expect(screen.getByText('my bank')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.queryByText(/^(exchange|wallet|defi|broker|bank)$/i)).not.toBeInTheDocument()
  })
})
