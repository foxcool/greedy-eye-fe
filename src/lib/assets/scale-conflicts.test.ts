import { describe, expect, it } from 'vitest'
import { scaleConflicts } from './scale-conflicts'

describe('scaleConflicts', () => {
  it('accepts a bridged token whose scale differs between chains', () => {
    // USDT on dev: 6 on eth/base, 18 on bsc, 8 from an exchange.
    expect(
      scaleConflicts([
        { chain: 'eth', decimals: 6 },
        { chain: 'base', decimals: 6 },
        { chain: 'bsc', decimals: 18 },
        { chain: '', decimals: 8 },
      ])
    ).toEqual([])
  })

  it('flags two scales on one chain, the proof of a collapse', () => {
    expect(
      scaleConflicts([
        { chain: 'polygon', decimals: 18 },
        { chain: 'polygon', decimals: 6 },
        { chain: 'eth', decimals: 18 },
      ])
    ).toEqual([{ chain: 'polygon', scales: [6, 18] }])
  })

  it('ignores off-chain rows reporting different precisions', () => {
    expect(scaleConflicts([{ chain: '', decimals: 8 }, { chain: '', decimals: 2 }])).toEqual([])
  })
})
