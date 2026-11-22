import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteAssetExternalRef, getMacroRates, listAssetsByIds, mergeAssets, searchAssets } from './assets-api'

// The catalogue is thousands of rows of airdropped litter (personal-1asm).
// These reads exist so a page never has to load it: what goes on the wire is
// the contract.
function bodies(): Record<string, unknown>[] {
  return vi.mocked(fetch).mock.calls.map(([, init]) => JSON.parse(String(init?.body)))
}

beforeEach(() => {
  vi.mocked(fetch).mockImplementation(async () =>
    new Response(JSON.stringify({ assets: [{ id: 'x' }], nextPageToken: 'more' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
})

describe('listAssetsByIds', () => {
  it('asks for nothing when given nothing — never "no filter, everything"', async () => {
    expect(await listAssetsByIds([])).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('splits more ids than the server accepts into several requests, deduplicated', async () => {
    const ids = Array.from({ length: 1500 }, (_, i) => `id-${i}`)
    await listAssetsByIds([...ids, 'id-0'])
    const sent = bodies()
    expect(sent).toHaveLength(2)
    expect((sent[0].ids as string[]).length).toBe(1000)
    expect((sent[1].ids as string[]).length).toBe(500)
  })
})

describe('searchAssets', () => {
  it('sends the query and reads one page, reporting that more matched', async () => {
    const page = await searchAssets({ query: 'usdt', identityVerdict: 'scam', pageSize: 200 })
    expect(bodies()).toEqual([{ query: 'usdt', identityVerdict: 'scam', pageSize: 200 }])
    expect(page.truncated).toBe(true)
  })
})

describe('deleteAssetExternalRef', () => {
  it('names both sides of the binding, never the ref id alone', async () => {
    await deleteAssetExternalRef('asset-1', 'ref-1')
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('DeleteAssetExternalRef')
    expect(bodies()).toEqual([{ assetId: 'asset-1', id: 'ref-1' }])
  })
})

describe('mergeAssets', () => {
  it('always states dry_run and the symbols the caller saw, and reads counts as numbers', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      new Response(JSON.stringify({ dryRun: true, holdingsMoved: '3', pricesDropped: '1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))

    const plan = await mergeAssets({
      source: { id: 's', symbol: 'USDT' },
      target: { id: 't', symbol: 'USDT' },
      dryRun: true,
    })

    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('MergeAssets')
    expect(bodies()).toEqual([{
      sourceId: 's', targetId: 't',
      expectedSourceSymbol: 'USDT', expectedTargetSymbol: 'USDT',
      dryRun: true,
    }])
    // Zero counts are absent on the wire; they must read as 0, not NaN.
    expect(plan).toEqual({
      dryRun: true, holdingsMoved: 3, ledgerLegsMoved: 0, pricesMoved: 0, pricesDropped: 1,
      externalRefsMoved: 0, riskFlagsMoved: 0, rulesRewritten: 0,
    })
  })

  it('sends dryRun false to commit', async () => {
    await mergeAssets({ source: { id: 's', symbol: 'A' }, target: { id: 't', symbol: 'B' }, dryRun: false })
    expect(bodies()[0]).toMatchObject({ dryRun: false })
  })
})

describe('getMacroRates', () => {
  it('asks for every supported series and returns them as sent', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      new Response(JSON.stringify({ series: [{ series: 'fed_funds', available: true, value: '3.88' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    const series = await getMacroRates()
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('GetMacroRates')
    expect(bodies()).toEqual([{}])
    expect(series).toEqual([{ series: 'fed_funds', available: true, value: '3.88' }])
  })
})
