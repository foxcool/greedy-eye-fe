// Latest prices derived from the backend heatmap.
//
// The backend has no batch "latest prices" RPC, but GetHeatmap (flat, 24h)
// returns every held position with its unit price and change % in one call
// per portfolio. Prices are stored server-side and refreshed by the backend
// scheduler, so the browser never talks to price providers directly.
import { getPortfolioHeatmap } from './analytics-api'

export type PriceMap = Record<string, { price: number; change24h: number }>

export interface PriceMapResult {
  prices: PriceMap
  /** True when at least one portfolio heatmap loaded successfully. */
  isLive: boolean
}

/**
 * Build a price map for the given portfolios, keyed by backend asset UUID
 * and by uppercase symbol (holdings match by UUID, catalog views by symbol).
 * Per-portfolio failures degrade to a partial map instead of throwing.
 */
export async function fetchPortfolioPriceMap(portfolioIds: string[]): Promise<PriceMapResult> {
  const heatmaps = await Promise.all(
    portfolioIds.map((id) =>
      getPortfolioHeatmap(id, { window: 'HEATMAP_WINDOW_24H' }).catch((error) => {
        console.warn(`Price map: heatmap failed for portfolio ${id}:`, error)
        return null
      })
    )
  )

  const prices: PriceMap = {}
  for (const heatmap of heatmaps) {
    for (const node of heatmap?.nodes ?? []) {
      if (!node.assetId || node.price === undefined) continue
      const entry = { price: node.price, change24h: node.colorValue ?? 0 }
      prices[node.assetId] = entry
      const symbolKey = node.label?.toUpperCase()
      if (symbolKey && !(symbolKey in prices)) {
        prices[symbolKey] = entry
      }
    }
  }

  return { prices, isLive: heatmaps.some((h) => h !== null) }
}
