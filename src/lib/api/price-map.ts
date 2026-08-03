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
 * Build a price map for the given portfolios, keyed by asset id — the backend
 * UUID in backend mode, the CoinGecko slug in demo mode. Per-portfolio failures
 * degrade to a partial map instead of throwing.
 *
 * Never key this map by symbol. It used to carry a second entry per node under
 * the uppercase symbol, and a lookup that missed by id fell through to it. A
 * miss by id means the backend did not price that asset, so the fallback fired
 * exactly when it had nothing honest to say and answered with some other
 * asset's price. Found 2026-08-02 on dev: an impostor token calling itself USDT
 * off a non-Tether contract held 1,894,544.9 units, borrowed Tether's $0.99917
 * and put ~$1.89M on a dashboard whose real total was $7,568.70.
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
      prices[node.assetId] = { price: node.price, change24h: node.colorValue ?? 0 }
    }
  }

  return { prices, isLive: heatmaps.some((h) => h !== null) }
}
