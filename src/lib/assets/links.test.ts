import { describe, expect, it } from 'vitest'
import type { Asset, AssetExternalRef } from '@/lib/api/backend-types'
import { refsOnChain } from './links'

function ref(id: string, source: string, address: string): AssetExternalRef {
  return { id, assetId: 'a', source, ref: address, origin: 'auto', createdAt: '' }
}

const asset = {
  id: 'a',
  externalRefs: [
    ref('1', 'onchain:eth', '0xreal'),
    ref('2', 'onchain:polygon', '0xfake'),
    ref('3', 'onchain:polygon', '0xother'),
    ref('4', 'coingecko', 'aave'),
  ],
} as Asset

describe('refsOnChain', () => {
  it('returns every binding on the chain, so two contracts on one chain stay visible', () => {
    expect(refsOnChain(asset, 'polygon').map((r) => r.ref)).toEqual(['0xfake', '0xother'])
  })

  it('does not match a chain whose name only shares a prefix', () => {
    expect(refsOnChain(asset, 'et')).toEqual([])
  })

  it('has nothing for a position that is not chain-scoped', () => {
    expect(refsOnChain(asset, '')).toEqual([])
    expect(refsOnChain(asset, undefined)).toEqual([])
  })
})
