import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient, ApiError } from './client'

const refreshToken = vi.fn()
vi.mock('@/lib/auth/api', () => ({ refreshToken: () => refreshToken() }))

function respond(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
  refreshToken.mockReset()
})

// The client never retries (see query-client.ts); its one re-send follows a
// 401 refresh.
describe('ApiClient sending', () => {
  it('sends a failing call once', async () => {
    vi.mocked(fetch).mockResolvedValue(respond(503))
    await expect(apiClient.post('/rpc', {})).rejects.toBeInstanceOf(ApiError)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('refreshes on 401 and re-sends once', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(respond(401)).mockResolvedValueOnce(respond(200, { ok: true }))
    refreshToken.mockResolvedValue(true)

    await expect(apiClient.post('/rpc', {})).resolves.toEqual({ ok: true })
    expect(refreshToken).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does not refresh twice when the re-sent call is still 401', async () => {
    vi.mocked(fetch).mockResolvedValue(respond(401))
    refreshToken.mockResolvedValue(true)

    await expect(apiClient.post('/rpc', {})).rejects.toMatchObject({ status: 401 })
    expect(refreshToken).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
