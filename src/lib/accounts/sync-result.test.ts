import { describe, expect, it } from 'vitest'
import { describeSync, summarizeSync } from './sync-result'

describe('summarizeSync', () => {
  it('treats a response without errors as clean (protojson omits zero fields)', () => {
    const o = summarizeSync({ accountId: 'a', assetsUpserted: 1, holdingsUpserted: 2 })
    expect(o).toEqual({ partial: false, errors: [], positionsSkipped: 0, holdingsZeroed: 0 })
  })

  it('flags a response with errors as partial', () => {
    const o = summarizeSync({ errors: ['token X: no decimals', 'provider down'], holdingsZeroed: 1 })
    expect(o.partial).toBe(true)
    const d = describeSync(o)
    expect(d.title).toBe('Sync finished with 2 problem(s)')
    expect(d.detail).toBe('1 holding(s) zeroed\ntoken X: no decimals\nprovider down')
  })

  it('flags skipped positions even without error text', () => {
    const o = summarizeSync({ positionsSkipped: 3 })
    expect(o.partial).toBe(true)
    expect(describeSync(o).detail).toBe('3 position(s) skipped')
  })
})
