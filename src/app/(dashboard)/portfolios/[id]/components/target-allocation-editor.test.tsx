import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TargetAllocationEditor } from './target-allocation-editor'

const mutate = vi.fn()
vi.mock('@/hooks/use-rules', () => ({
  useTargetAllocationRule: () => ({
    isLoading: false,
    rule: { id: 'r1', ruleType: 'target_allocation', configuration: { targets: { gone: 5 } } },
  }),
  useSaveTargetAllocation: () => ({ mutate, isPending: false }),
  useDeleteRule: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/hooks/use-portfolio', () => ({
  useHoldings: () => ({ data: [{ assetId: 'eth', symbol: 'eth', percentage: 100 }] }),
}))

function listAssetsBodies(): Record<string, unknown>[] {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([input]) => String(input).includes('/ListAssets'))
    .map(([, init]) => JSON.parse(String(init?.body)))
}

beforeEach(() => {
  mutate.mockReset()
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    const body = JSON.parse(String(init?.body ?? '{}'))
    const assets = body.ids
      ? [{ id: 'gone', symbol: 'old', name: 'Sold token' }]
      : [{ id: 'usdt', symbol: 'usdt', name: 'Tether' }]
    const res = String(input).includes('/ListAssets') ? { assets } : {}
    return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
})

// The add-asset control searches the server instead of offering the whole
// catalogue, and a saved target the portfolio no longer holds is labelled by id.
describe('TargetAllocationEditor', () => {
  it('adds a searched asset as a row and saves its target', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <TargetAllocationEditor portfolioId="p1" />
      </QueryClientProvider>
    )
    expect(await screen.findByText('OLD')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Add asset' }), { target: { value: 'usdt' } })
    await userEvent.click(await screen.findByRole('option', { name: 'USDT — Tether' }))
    expect(screen.getByText('USDT')).toBeInTheDocument()

    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[inputs.length - 1], { target: { value: '10' } })
    await userEvent.click(screen.getByRole('button', { name: 'Save targets' }))

    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ targets: { gone: 5, usdt: 10 } }))
    expect(listAssetsBodies()).toEqual([
      { ids: ['gone'], pageSize: 1 },
      { query: 'usdt', pageSize: 50 },
    ])
  })
})
