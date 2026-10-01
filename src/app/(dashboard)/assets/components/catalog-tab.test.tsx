import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CatalogTab, type VerdictFilter } from './catalog-tab'

function listAssetsBodies(): Record<string, unknown>[] {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([input]) => String(input).includes('/ListAssets'))
    .map(([, init]) => JSON.parse(String(init?.body)))
}

beforeEach(() => {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const body = String(input).includes('/ListAssets')
      ? { assets: [{ id: 'a1', symbol: 'USDT', name: 'Tether', type: 'ASSET_TYPE_CRYPTOCURRENCY' }] }
      : {}
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
})

function renderTab(verdict: VerdictFilter = 'any') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <CatalogTab heldIds={new Set()} verdict={verdict} onVerdictChange={() => {}} />
    </QueryClientProvider>
  )
}

// The catalogue is searched, not loaded (personal-1asm): an empty box asks the
// server for nothing, and what the reader types goes to the server.
describe('CatalogTab', () => {
  it('asks for nothing until there is something to search for', async () => {
    renderTab()
    expect(screen.getByText(/to search the catalogue/)).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 400))
    expect(listAssetsBodies()).toEqual([])
  })

  it('sends the typed text to the server and shows what came back', async () => {
    renderTab()
    fireEvent.change(screen.getByPlaceholderText(/Search name/), { target: { value: 'usdt' } })

    expect(await screen.findByText('Tether')).toBeInTheDocument()
    expect(listAssetsBodies()).toEqual([{ pageSize: 200, query: 'usdt' }])
  })

  it('asks for each flagged verdict, since "flagged" is three of them', async () => {
    renderTab('flagged')
    await waitFor(() => expect(listAssetsBodies()).toHaveLength(3))
    expect(listAssetsBodies().map((b) => b.identityVerdict).sort()).toEqual(['impersonation', 'scam', 'suspect'])
  })
})
