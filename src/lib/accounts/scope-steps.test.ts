import { describe, expect, it } from 'vitest'
import { scopeSteps } from './scope-steps'

// The backend refuses any save where a system scope is not among the account's
// capabilities, judged against what the other half holds at that moment.
describe('scopeSteps', () => {
  it('withdraws a scope before the capability it rests on goes', () => {
    expect(scopeSteps(['market_data', 'onchain_lookup'], ['onchain_lookup'])).toEqual({
      before: ['onchain_lookup'],
      after: undefined,
    })
  })

  it('grants a scope only after its capability exists', () => {
    expect(scopeSteps([], ['market_data'])).toEqual({ before: undefined, after: ['market_data'] })
  })

  it('splits a swap into a withdrawal first and a grant last', () => {
    expect(scopeSteps(['market_data'], ['onchain_lookup'])).toEqual({ before: [], after: ['onchain_lookup'] })
  })

  it('sends nothing when the scopes did not change, whatever their order', () => {
    expect(scopeSteps(['market_data', 'trading'], ['trading', 'market_data'])).toEqual({
      before: undefined,
      after: undefined,
    })
  })
})
