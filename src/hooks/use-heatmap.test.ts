import { describe, expect, it } from 'vitest'
import { rawHoldings } from '@/lib/mocks'
import { demoChange } from './use-heatmap'

describe('demoChange', () => {
  it('uses the holding change for 24h, so the tiles agree with the total', () => {
    expect(demoChange('BTC', 'HEATMAP_WINDOW_24H', 2.1)).toBe(2.1)
    expect(demoChange('USDC', 'HEATMAP_WINDOW_24H', 0)).toBe(0)
  })

  it('keeps the longer windows inside [-6, +6) for every demo symbol', () => {
    // Before the fix a negative hash reached -18: a stablecoin showed -17%.
    for (const { symbol } of rawHoldings) {
      for (const window of ['HEATMAP_WINDOW_7D', 'HEATMAP_WINDOW_30D'] as const) {
        const change = demoChange(symbol, window, 0)
        expect(change, `${symbol} ${window}`).toBeGreaterThanOrEqual(-6)
        expect(change, `${symbol} ${window}`).toBeLessThan(6)
      }
    }
  })
})
