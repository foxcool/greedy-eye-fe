import type { Holding } from '@/lib/api/backend-types'

export interface ScaleConflict {
  chain: string
  scales: number[]
}

/**
 * Chains on which one asset's holdings disagree about decimals.
 *
 * Grouped by chain because scale belongs to a contract, not to an asset:
 * bridged USDT is 6 decimals on Ethereum and 18 on BSC, and comparing across
 * chains flags every bridged stablecoin. Off-chain rows are skipped — each
 * exchange or manual entry reports its own precision, which says nothing about
 * which token it is.
 */
export function scaleConflicts(holdings: Pick<Holding, 'chain' | 'decimals'>[]): ScaleConflict[] {
  const byChain = new Map<string, Set<number>>()
  for (const h of holdings) {
    if (!h.chain) continue
    const scales = byChain.get(h.chain) ?? new Set<number>()
    scales.add(h.decimals)
    byChain.set(h.chain, scales)
  }
  return [...byChain]
    .filter(([, scales]) => scales.size > 1)
    .map(([chain, scales]) => ({ chain, scales: [...scales].sort((a, b) => a - b) }))
}
