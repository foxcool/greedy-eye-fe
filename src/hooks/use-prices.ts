'use client'

import { useQuery } from '@tanstack/react-query'
import { mockPrices, rawHoldings } from '@/lib/mocks'
import { listPortfolios } from '@/lib/api/portfolio-api'
import { fetchPortfolioPriceMap, type PriceMapResult } from '@/lib/api/price-map'
import { USE_BACKEND } from '@/lib/config/data-source'

/**
 * Latest prices keyed by backend asset UUID and uppercase symbol.
 * Backend mode: derived from portfolio heatmaps (stored prices refreshed by
 * the backend scheduler) — only held assets have entries.
 * Demo mode: deterministic mock prices, no network.
 */
export function usePrices() {
  return useQuery<PriceMapResult>({
    queryKey: ['prices', USE_BACKEND ? 'backend' : 'mock'],
    queryFn: async () => {
      if (!USE_BACKEND) {
        return { prices: mockPrices, isLive: false }
      }
      const portfolios = await listPortfolios()
      return fetchPortfolioPriceMap(portfolios.map((p) => p.id))
    },
    // Matches the backend price refresh cadence (~15 min).
    staleTime: 5 * 60 * 1000,
  })
}

/** Symbol (uppercase) → CoinGecko id, for external info links only. */
export const coingeckoIdBySymbol: Record<string, string> = Object.fromEntries(
  rawHoldings.map((h) => [h.symbol.toUpperCase(), h.assetId])
)
