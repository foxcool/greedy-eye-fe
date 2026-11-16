import { describe, expect, it } from 'vitest'
import type { Asset, AssetExternalRef } from '@/lib/api/backend-types'
import { derivedLabelContract, refsOnChain } from './links'

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

describe('derivedLabelContract', () => {
  const address = '0xAbCd00000000000000000000000000000000Ef12'
  const token = (symbol: string, tags: string[]) => ({ id: 't', symbol, tags }) as unknown as Asset

  it('finds the contract behind a label made from its ends', () => {
    expect(derivedLabelContract(token('0xAbCd..Ef12', [`contract:${address}`]))).toEqual({ address })
    expect(derivedLabelContract(token('0xabcd…ef12', [`contract:${address}`]))).toEqual({ address })
  })

  it('leaves a real ticker alone, even one carrying a contract', () => {
    expect(derivedLabelContract(token('USDC', [`contract:${address}`]))).toBeUndefined()
  })

  it('does not take a label pointing at some other contract for this one', () => {
    expect(derivedLabelContract(token('0x1234..5678', [`contract:${address}`]))).toBeUndefined()
  })

  it('has nothing to show without a contract', () => {
    expect(derivedLabelContract(token('0xAbCd..Ef12', []))).toBeUndefined()
  })

  it('finds the binding the label was cut from, not just the first one', () => {
    const bound = {
      ...token('0xAbCd..Ef12', []),
      externalRefs: [ref('1', 'onchain:eth', '0x9999000000000000000000000000000000001111'), ref('2', 'onchain:base', address)],
    } as Asset
    expect(derivedLabelContract(bound)).toEqual({ address, chain: 'base' })
  })
})
