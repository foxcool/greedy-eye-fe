import { describe, expect, it } from 'vitest'
import { mergeAccountData } from './account-data'

// UpdateAccount writes `data` by replacement, so what a form sends is the
// whole map afterwards. personal-y4x: the form rebuilt `data` from its own
// fields and erased the plan's tier, quota and trust anchor on every save.
describe('mergeAccountData', () => {
  const stored = {
    provider: 'coingecko',
    api_key: 'k-1',
    tier: 'pro',
    quota: '500000',
    period: 'month',
    root_ca: '-----BEGIN CERTIFICATE-----',
  }

  it('carries every key the form never rendered', () => {
    expect(mergeAccountData(stored, { api_key: 'k-2' })).toEqual({ ...stored, api_key: 'k-2' })
  })

  it('deletes a rendered key the person left blank, and only that one', () => {
    const merged = mergeAccountData(stored, { api_key: '   ', tier: undefined })
    expect(merged).not.toHaveProperty('api_key')
    expect(merged).not.toHaveProperty('tier')
    expect(merged.quota).toBe('500000')
  })

  it('trims what it writes and does not mutate the stored map', () => {
    const before = { ...stored }
    expect(mergeAccountData(stored, { tier: ' free ' }).tier).toBe('free')
    expect(stored).toEqual(before)
  })

  it('starts from nothing when the account has no data yet', () => {
    expect(mergeAccountData(undefined, { provider: 'binance', api_key: '' })).toEqual({ provider: 'binance' })
  })
})
