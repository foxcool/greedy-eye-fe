/**
 * CoinGecko API client for fetching live prices
 * Uses the same endpoint as the R script
 */

import { rawHoldings } from './portfolio-data'

const COINGECKO_API = 'https://api.coingecko.com/api/v3'

export interface CoinGeckoPrice {
  id: string
  symbol: string
  name: string
  current_price: number
  market_cap: number
  market_cap_rank: number
  price_change_24h: number
  price_change_percentage_24h: number
  high_24h: number
  low_24h: number
  last_updated: string
}

/**
 * Fetch current prices from CoinGecko
 * Same URL pattern as R script
 */
export async function fetchPrices(): Promise<Record<string, { price: number; change24h: number }>> {
  // Get all asset IDs from holdings
  const assetIds = rawHoldings.map(h => h.assetId)
  const idsParam = assetIds.join(',')
  
  const url = `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${idsParam}`
  
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000) // 8s timeout

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: controller.signal,
  })
  clearTimeout(timeout)

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
  }

  const data: CoinGeckoPrice[] = await response.json()

  // Transform to our format.
  // Key by CoinGecko id (mock holdings) and by uppercase symbol as fallback —
  // backend holdings carry UUID asset ids, so they match prices via symbol.
  const prices: Record<string, { price: number; change24h: number }> = {}

  for (const coin of data) {
    const entry = {
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h ?? 0,
    }
    prices[coin.id] = entry
    const symbolKey = coin.symbol.toUpperCase()
    if (!(symbolKey in prices)) {
      prices[symbolKey] = entry
    }
  }

  return prices
}

/**
 * Fetch prices with automatic retry and fallback to mock data
 */
export async function fetchPricesWithFallback(
  mockPrices: Record<string, { price: number; change24h: number }>
): Promise<{ prices: Record<string, { price: number; change24h: number }>; isLive: boolean }> {
  try {
    const prices = await fetchPrices()
    return { prices, isLive: true }
  } catch (error) {
    console.warn('Failed to fetch live prices, using mock data:', error)
    return { prices: mockPrices, isLive: false }
  }
}
