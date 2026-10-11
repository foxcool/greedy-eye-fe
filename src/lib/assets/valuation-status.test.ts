import { describe, expect, it } from 'vitest'
import type { Holding, ValuationCoverage } from '@/lib/api/backend-types'
import { holdingStatus, pricingEvidence, statusExplanation } from './valuation-status'

const holding: Holding = {
  id: 'h-1',
  amount: '100',
  decimals: 2,
  assetId: 'a-1',
  accountId: 'acc-1',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
}

// A contested ticker is never asked about, so its pricing record can carry no
// attempt at all. Read as an ordinary record it would say "every source was
// asked and none answered" — a claim about the market nobody observed.
describe('contested ticker', () => {
  it('names the contest when the coverage sample carries the position', () => {
    const coverage: ValuationCoverage = {
      unpriced: [{ holdingId: 'h-1', assetId: 'a-1', reason: 'UNPRICED_REASON_AMBIGUOUS_TICKER' }],
    }
    const status = holdingStatus(holding, undefined, coverage, false)
    expect(status).toEqual({ kind: 'unpriced', reason: 'AMBIGUOUS_TICKER', askedSince: undefined, sourcesAsked: undefined })
    expect(statusExplanation(status)).toContain('may be the real asset')
  })

  it('reads the contest, not silence, from a record with no attempts', () => {
    const coverage: ValuationCoverage = { unpriced: [], unpricedTruncated: true, unpricedCount: 80 }
    const status = holdingStatus(holding, undefined, coverage, false, {
      state: 'known',
      status: { assetId: 'a-1', ambiguousTicker: true },
    })
    expect(status).toEqual({ kind: 'unpriced', reason: 'AMBIGUOUS_TICKER' })
    expect(statusExplanation(status)).not.toContain('none has ever answered')
  })

  it('tells the asset page the same thing', () => {
    const text = pricingEvidence({ state: 'known', status: { assetId: 'a-1', ambiguousTicker: true } })
    expect(text).toContain('claims this ticker')
    expect(text).not.toContain('none has ever answered')
  })
})
