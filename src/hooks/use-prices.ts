'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchPricesWithFallback, mockPrices, rawHoldings } from '@/lib/mocks'

/**
 * Live prices keyed by CoinGecko id and uppercase symbol.
 * Shares the same CoinGecko fetch the dashboard uses.
 */
export function usePrices() {
  return useQuery({
    queryKey: ['prices', 'coingecko'],
    queryFn: () => fetchPricesWithFallback(mockPrices),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })
}

/** Symbol (uppercase) → CoinGecko id, from the known token list. */
export const coingeckoIdBySymbol: Record<string, string> = Object.fromEntries(
  rawHoldings.map((h) => [h.symbol.toUpperCase(), h.assetId])
)
