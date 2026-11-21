import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MergeAssetDialog } from './merge-asset-dialog'
import type { Asset } from '@/lib/api/backend-types'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const source = { id: 'src', symbol: 'USDT', name: 'USDT (forex)' } as Asset
const target = { id: 'tgt', symbol: 'USDT', name: 'Tether' } as Asset

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

// Routes the stubbed backend by RPC; merge answers come from `merge` in order.
function backend(merge: Response[]) {
  vi.mocked(fetch).mockImplementation(async (url) => {
    if (String(url).includes('ListAssets')) return json({ assets: [source, target] })
    if (String(url).includes('MergeAssets')) return merge.shift() ?? json({}, 500)
    return json({})
  })
}

function mergeBodies() {
  return vi.mocked(fetch).mock.calls
    .filter(([url]) => String(url).includes('MergeAssets'))
    .map(([, init]) => JSON.parse(String(init?.body)))
}

function renderDialog() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MergeAssetDialog source={source} open onOpenChange={() => {}} />
    </QueryClientProvider>
  )
}

async function pickTarget() {
  fireEvent.change(screen.getByRole('combobox', { name: 'Search the asset to merge into' }), {
    target: { value: 'usdt' },
  })
  await userEvent.click(await screen.findByRole('option', { name: 'USDT — Tether' }))
}

// A merge cannot be undone: the commit button must stand next to the plan for
// this exact pair, and only an explicit dryRun false may write.
describe('MergeAssetDialog', () => {
  it('shows the plan for the picked target, then commits and goes to the survivor', async () => {
    backend([
      json({ dryRun: true, holdingsMoved: '2', pricesDropped: '1', rulesRewritten: '1' }),
      json({ holdingsMoved: '2', pricesDropped: '1', rulesRewritten: '1' }),
    ])
    renderDialog()
    const commit = screen.getByRole('button', { name: 'Merge and delete this asset' })
    expect(commit).toBeDisabled()

    await pickTarget()
    expect(screen.queryByRole('option', { name: 'USDT — USDT (forex)' })).toBeNull()

    const plan = await screen.findByRole('list', { name: 'Merge plan' })
    expect(plan).toHaveTextContent('2 holdings move')
    expect(plan).toHaveTextContent('1 prices are dropped')
    expect(plan).toHaveTextContent('1 automation rules are repointed')
    expect(plan).not.toHaveTextContent('ledger')

    await userEvent.click(commit)
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/assets/tgt'))
    expect(mergeBodies().map((b) => b.dryRun)).toEqual([true, false])
    expect(mergeBodies()[1]).toMatchObject({ sourceId: 'src', targetId: 'tgt' })
  })

  it('shows a refusal in the backend words and offers no commit', async () => {
    backend([json({
      code: 'failed_precondition',
      message: 'providers name these as different instruments (binance: KSMUSDT vs DOTUSDT)',
    }, 400)])
    renderDialog()

    await pickTarget()

    expect(await screen.findByRole('alert')).toHaveTextContent('different instruments (binance: KSMUSDT vs DOTUSDT)')
    expect(screen.getByRole('button', { name: 'Merge and delete this asset' })).toBeDisabled()
    expect(mergeBodies()).toHaveLength(1)
  })
})
