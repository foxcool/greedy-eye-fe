import type { Holding, Account, Asset } from './backend-types'
import { holdingToDecimal } from './backend-types'
import type { RawHolding } from '@/lib/mocks/portfolio-data'
import type { HoldingSource } from '@/lib/types/portfolio-view'

/**
 * Converts backend Holdings + Accounts + Assets into RawHolding[]
 * compatible with calculatePortfolio().
 *
 * Groups holdings by assetId, merges sources from different accounts.
 */
export function buildRawHoldings(
  holdings: Holding[],
  accounts: Account[],
  assets: Asset[]
): RawHolding[] {
  const accountMap = new Map(accounts.map((a) => [a.id, a]))
  const assetMap = new Map(assets.map((a) => [a.id, a]))

  // Group holdings by assetId
  const byAsset = new Map<string, Holding[]>()
  for (const h of holdings) {
    if (h.excluded) continue
    const group = byAsset.get(h.assetId) ?? []
    group.push(h)
    byAsset.set(h.assetId, group)
  }

  const rawHoldings: RawHolding[] = []

  for (const [assetId, group] of byAsset) {
    const asset = assetMap.get(assetId)
    const symbol = asset?.symbol ?? assetId.toUpperCase()
    const name = asset?.name ?? assetId

    const sources: HoldingSource[] = group.map((h) => {
      const account = accountMap.get(h.accountId)
      return {
        name: account?.name ?? h.accountId,
        amount: holdingToDecimal(h.amount, h.decimals),
      }
    })

    rawHoldings.push({ assetId, symbol, name, sources })
  }

  return rawHoldings
}
