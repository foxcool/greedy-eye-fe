import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PricesView } from './prices-view'

vi.mock('@/hooks/use-held-assets', () => ({
  useHeldAssets: () => ({
    data: [{ assetId: 'eth', asset: { id: 'eth', symbol: 'eth', name: 'Ethereum' } }],
    isLoading: false,
  }),
}))
vi.mock('./price-history-chart', () => ({
  PriceHistoryChart: ({ assetLabel }: { assetLabel?: string }) => <div data-testid="chart">{assetLabel ?? 'none'}</div>,
}))

beforeEach(() => {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const body = String(input).includes('/ListAssets') ? { assets: [{ id: 'usdc', symbol: 'usdc', name: 'USD Coin' }] } : {}
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
})

// The chart keeps the label of what it plots when the list underneath it
// switches from your assets to search results.
describe('PricesView', () => {
  it('keeps the selected asset labelled across a search', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <PricesView />
      </QueryClientProvider>
    )
    fireEvent.click(screen.getByText('Ethereum'))
    expect(screen.getByTestId('chart')).toHaveTextContent('ETH')

    fireEvent.change(screen.getByPlaceholderText(/Search the catalogue/), { target: { value: 'usdc' } })
    expect(await screen.findByText('USD Coin')).toBeInTheDocument()
    expect(screen.getByTestId('chart')).toHaveTextContent('ETH')
  })
})
