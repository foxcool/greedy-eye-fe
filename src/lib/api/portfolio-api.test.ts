import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAccountHealth, setAccountDisabled, updateAccount, updatePortfolio } from './portfolio-api'

// The backend writes exactly the fields the update mask names, and rejects a
// mask-less update. Before the mask was derived from the payload, an update
// that sent only `excluded` zeroed the holding's amount — so what matters here
// is the request on the wire, not what the UI shows afterwards.
function lastRequest(): { url: string; body: Record<string, unknown> } {
  const calls = vi.mocked(fetch).mock.calls
  const [input, init] = calls[calls.length - 1]
  return { url: String(input), body: JSON.parse(String(init?.body)) }
}

beforeEach(() => {
  vi.mocked(fetch).mockImplementation(async () =>
    new Response(JSON.stringify({ id: 'a1' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
})

describe('update requests', () => {
  it('names exactly the fields sent, and sends data whole', async () => {
    const data = { provider: 'coingecko', api_key: '••••1a2b', tier: 'pro', quota: '500000' }
    await updateAccount('a1', { name: 'Gecko', data })

    const { url, body } = lastRequest()
    expect(url).toContain('/eye.v1.PortfolioService/UpdateAccount')
    expect(body.updateMask).toBe('name,data')
    expect(body.account).toEqual({ id: 'a1', name: 'Gecko', data })
  })

  it('leaves an undefined field out of the mask', async () => {
    await updatePortfolio('p1', { name: 'Crypto', description: undefined })
    expect(lastRequest().body.updateMask).toBe('name')
  })

  it('refuses an update with nothing in it rather than sending a bare mask', async () => {
    await expect(updatePortfolio('p1', {})).rejects.toThrow(/at least one field/)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('standing an account down', () => {
  it('sends the flag alone under its own mask, both ways', async () => {
    await setAccountDisabled('a1', true)
    expect(lastRequest().body).toEqual({ account: { id: 'a1', disabled: true }, updateMask: 'disabled' })

    // false is a real value here, not an absent field: enabling must name it.
    await setAccountDisabled('a1', false)
    expect(lastRequest().body).toEqual({ account: { id: 'a1', disabled: false }, updateMask: 'disabled' })
  })
})

describe('account health', () => {
  it('asks the portfolio service for every account at once', async () => {
    await getAccountHealth()
    const { url, body } = lastRequest()
    expect(url).toContain('/eye.v1.PortfolioService/GetAccountHealth')
    expect(body).toEqual({})
  })
})
