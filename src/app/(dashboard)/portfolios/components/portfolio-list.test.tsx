import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Portfolio } from '@/lib/api/backend-types'
import { PortfolioList } from './portfolio-list'
import { PortfolioSettings } from '../[id]/components/portfolio-settings'

vi.mock('@/lib/config/data-source', () => ({ DEMO_MODE: false, USE_BACKEND: true }))
const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))

const main: Portfolio = { id: 'main', userId: 'u', name: 'main', createdAt: '2026-01-01T00:00:00Z', updatedAt: '' }
let listed: Portfolio[] = []

function requestsTo(method: string) {
  return vi.mocked(fetch).mock.calls.filter(([input]) => String(input).endsWith(`/${method}`))
}

beforeEach(() => {
  listed = []
  vi.mocked(fetch).mockImplementation(async (input) => {
    const body = String(input).endsWith('/ListPortfolios') ? { portfolios: listed } : {}
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

// The empty list used to offer an import that wrote the demo's mock holdings
// into the real backend, against asset ids the backend never issued.
describe('an empty portfolio list', () => {
  it('offers to create a portfolio and nothing that seeds mock data', async () => {
    renderWithClient(<PortfolioList />)

    expect(await screen.findByText('No portfolios yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create portfolio' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /import/i })).not.toBeInTheDocument()
  })
})

// A row used to carry a Delete that removed the portfolio on one click. Deleting
// is offered only on the portfolio's Settings tab, behind a confirmation.
describe('deleting a portfolio', () => {
  it('is not offered from the list, whatever is clicked there', async () => {
    listed = [main]
    renderWithClient(<PortfolioList />)

    const row = (await screen.findByText('main')).closest('tr')!
    expect(within(row).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/delete/i)).not.toBeInTheDocument()

    for (const button of within(row).getAllByRole('button')) fireEvent.click(button)
    expect(requestsTo('DeletePortfolio')).toHaveLength(0)
  })

  it('asks for confirmation on the Settings tab before it is sent', async () => {
    renderWithClient(<PortfolioSettings portfolio={main} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete portfolio' }))
    expect(requestsTo('DeletePortfolio')).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    await waitFor(() => expect(requestsTo('DeletePortfolio')).toHaveLength(1))
    expect(JSON.parse(String(requestsTo('DeletePortfolio')[0][1]?.body))).toEqual({ id: 'main' })
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/portfolios'))
  })

  it('is called off by Cancel without a request', async () => {
    renderWithClient(<PortfolioSettings portfolio={main} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete portfolio' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('button', { name: 'Delete portfolio' })).toBeInTheDocument()
    expect(requestsTo('DeletePortfolio')).toHaveLength(0)
  })
})
