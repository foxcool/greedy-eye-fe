import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PortfolioList } from './portfolio-list'

vi.mock('@/lib/config/data-source', () => ({ DEMO_MODE: false, USE_BACKEND: true }))

beforeEach(() => {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const body = String(input).endsWith('/ListPortfolios') ? { portfolios: [] } : {}
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
})

// The empty list used to offer an import that wrote the demo's mock holdings
// into the real backend, against asset ids the backend never issued.
describe('an empty portfolio list', () => {
  it('offers to create a portfolio and nothing that seeds mock data', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <PortfolioList />
      </QueryClientProvider>
    )

    expect(await screen.findByText('No portfolios yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create portfolio' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /import/i })).not.toBeInTheDocument()
  })
})
