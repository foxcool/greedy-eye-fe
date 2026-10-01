'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listHoldings } from '@/lib/api/portfolio-api'
import { holdingToDecimal, type Account, type Asset } from '@/lib/api/backend-types'
import { USE_BACKEND } from '@/lib/config/data-source'
import { useAccounts } from './use-accounts'
import { useAssetsByIds } from './use-assets'
import { usePortfolio } from './use-portfolio'

/**
 * Whether an asset's positions count toward the total.
 *
 * "partial" is real: the same token can be counted in one account and excluded
 * by hand in another, and folding that into either word misstates one of them.
 */
export type CountedState = 'counted' | 'partial' | 'excluded'

export interface HeldAsset {
  assetId: string
  /** Absent only if the catalogue lost the row a holding points at. */
  asset?: Asset
  symbol: string
  name: string
  /** Sum over counted positions. Excluded amounts are not added to it. */
  quantity: number
  positions: number
  excludedPositions: number
  state: CountedState
  accounts: Pick<Account, 'id' | 'name' | 'type'>[]
  chains: string[]
  /**
   * From the portfolio summary, the same numbers the portfolio pages print.
   * Absent for an asset with nothing counted: the summary never saw it.
   */
  value?: number
  percentage?: number
  change24h?: number
  /** Counted, but no price the backend was willing to use. */
  unpriced: boolean
}

/**
 * Every asset the reader holds, across all portfolios, excluded positions
 * included — the view of the catalogue that is theirs.
 *
 * Values come from usePortfolio rather than being recomputed here: that summary
 * is what the portfolio pages show, and a second calculation is a second chance
 * for two pages to disagree about one position. What the summary drops — excluded
 * holdings — is added back from the raw holdings list, without a value.
 */
export function useHeldAssets() {
  const accountsQuery = useAccounts()
  const holdingsQuery = useQuery({
    // Under ['holdings'] so every holding mutation that invalidates that prefix
    // refreshes this list too.
    queryKey: ['holdings', 'all'],
    queryFn: () => listHoldings(),
    enabled: USE_BACKEND,
  })
  // The assets the reader holds and nothing else; the catalogue is searched,
  // never loaded (personal-1asm).
  const assetsQuery = useAssetsByIds(holdingsQuery.data?.map((h) => h.assetId))
  const summaryQuery = usePortfolio()

  const data = useMemo<HeldAsset[] | undefined>(() => {
    if (!holdingsQuery.data || !assetsQuery.data || !accountsQuery.data) return undefined

    const assetById = new Map(assetsQuery.data.map((a) => [a.id, a]))
    const accountById = new Map(accountsQuery.data.map((a) => [a.id, a]))
    const summaryById = new Map((summaryQuery.data?.holdings ?? []).map((h) => [h.assetId, h]))

    const byAsset = new Map<string, HeldAsset>()
    for (const h of holdingsQuery.data) {
      const amount = holdingToDecimal(h.amount, h.decimals)
      // A zero row is a position that was sold: sync keeps it as a marker, and
      // listing it here would call it held.
      if (amount === 0) continue

      let row = byAsset.get(h.assetId)
      if (!row) {
        const asset = assetById.get(h.assetId)
        row = {
          assetId: h.assetId,
          asset,
          symbol: asset?.symbol ?? asset?.name ?? h.assetId,
          name: asset?.name ?? '',
          quantity: 0,
          positions: 0,
          excludedPositions: 0,
          state: 'counted',
          accounts: [],
          chains: [],
          unpriced: false,
        }
        byAsset.set(h.assetId, row)
      }

      row.positions++
      if (h.excluded) row.excludedPositions++
      else row.quantity += amount

      const account = accountById.get(h.accountId)
      if (account && !row.accounts.some((a) => a.id === account.id)) {
        row.accounts.push({ id: account.id, name: account.name, type: account.type })
      }
      if (h.chain && !row.chains.includes(h.chain)) row.chains.push(h.chain)
    }

    for (const row of byAsset.values()) {
      row.state =
        row.excludedPositions === 0
          ? 'counted'
          : row.excludedPositions === row.positions
            ? 'excluded'
            : 'partial'
      const s = summaryById.get(row.assetId)
      if (s && row.state !== 'excluded') {
        row.unpriced = Boolean(s.unpriced)
        if (!s.unpriced) {
          row.value = s.value
          row.percentage = s.percentage
          row.change24h = s.change24h
        }
      }
    }

    return [...byAsset.values()]
  }, [holdingsQuery.data, assetsQuery.data, accountsQuery.data, summaryQuery.data])

  return {
    data,
    assets: assetsQuery.data,
    /** Backend total, the number the portfolio pages lead with. */
    totalValue: summaryQuery.data?.totalValue,
    isLoading: assetsQuery.isLoading || accountsQuery.isLoading || holdingsQuery.isLoading,
    /** Values arrive later than the list; the list renders without them. */
    isValuing: summaryQuery.isLoading,
    error: assetsQuery.error ?? accountsQuery.error ?? holdingsQuery.error,
  }
}
