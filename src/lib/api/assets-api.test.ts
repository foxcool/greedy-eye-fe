import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listAssetsByIds, searchAssets } from './assets-api'

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
