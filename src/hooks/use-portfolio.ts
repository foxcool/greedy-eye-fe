/**
 * Portfolio data hooks
 *
 * Data flow:
 * 1. USE_BACKEND_API=true → fetch holdings from backend, prices from CoinGecko
 * 2. USE_LIVE_PRICES=true → fetch prices from CoinGecko, calculate locally with mock holdings
 * 3. fallback → use mock prices + mock holdings
 */

import { useQuery } from '@tanstack/react-query'
import {
  calculatePortfolio,
  getAllocationChartData,
  fetchPricesWithFallback,
  mockPrices,
} from '@/lib/mocks'
import type { PortfolioSummary, AllocationSlice } from '@/lib/types/portfolio-view'
import { listPortfolios, listHoldings, listAccounts, calculatePortfolioValue } from '@/lib/api/portfolio-api'
import { listAssets } from '@/lib/api/assets-api'
import { buildRawHoldings } from '@/lib/api/adapters'
import { holdingToDecimal } from '@/lib/api/backend-types'

// Data source configuration
const USE_LIVE_PRICES = process.env.NEXT_PUBLIC_USE_LIVE_PRICES !== 'false'
const USE_BACKEND_API = process.env.NEXT_PUBLIC_USE_BACKEND === 'true'

interface PortfolioQueryResult extends PortfolioSummary {
  isLivePrices: boolean
}

export function usePortfolio() {
  return useQuery<PortfolioQueryResult>({
    queryKey: ['portfolio', 'summary', { live: USE_LIVE_PRICES, backend: USE_BACKEND_API }],
    queryFn: async () => {
      if (USE_BACKEND_API) {
        // Fetch holdings data from backend
        const portfolios = await listPortfolios()

        if (portfolios.length === 0) {
          // No portfolios yet — return empty portfolio
          return { ...calculatePortfolio([], {}), isLivePrices: false, dataSource: 'backend' as const }
        }

        // Fetch all data in parallel — holdings across ALL portfolios for dashboard overview
        const [holdings, accounts, assets, beValues, priceResult] = await Promise.all([
          listHoldings({}), // no portfolioId filter — aggregate all
          listAccounts(),
          listAssets(),
          Promise.all(portfolios.map(p => calculatePortfolioValue(p.id, 'usd').catch(() => null))),
          USE_LIVE_PRICES ? fetchPricesWithFallback(mockPrices) : Promise.resolve({ prices: mockPrices, isLive: false }),
        ])

        const rawHoldings = buildRawHoldings(holdings, accounts, assets)
        // Use includeZeroValue so backend holdings without price data still appear in the list.
        // Price matching only works for assets that happen to share a CoinGecko ID.
        const portfolio = calculatePortfolio(rawHoldings, priceResult.prices, undefined, { includeZeroValue: true })

        // Sum backend-calculated portfolio values (uses stored prices, COALESCE for portfolio_id).
        const beTotal = beValues.reduce((sum, v) => {
          if (!v?.totalValueAmount) return sum
          return sum + holdingToDecimal(v.totalValueAmount, v.decimals)
        }, 0)
        // Prefer backend total; fall back to client-calculated (CoinGecko match) if backend returns 0.
        const totalValue = beTotal > 0 ? beTotal : portfolio.totalValue

        return {
          ...portfolio,
          totalValue,
          isLivePrices: priceResult.isLive,
          dataSource: 'backend' as const,
        }
      }

      // Mock holdings + CoinGecko prices
      const { prices, isLive } = USE_LIVE_PRICES
        ? await fetchPricesWithFallback(mockPrices)
        : { prices: mockPrices, isLive: false }

      return {
        ...calculatePortfolio(undefined, prices),
        isLivePrices: isLive,
        dataSource: (isLive ? 'coingecko' : 'mock') as 'coingecko' | 'mock',
      }
    },
    staleTime: 60 * 1000,
    refetchInterval: USE_LIVE_PRICES ? 60 * 1000 : false,
    retry: 2,
  })
}

/**
 * Get allocation data formatted for charts
 */
export function useAllocationChart(maxSlices = 10) {
  const { data: portfolio, ...rest } = usePortfolio()

  const chartData: AllocationSlice[] | undefined = portfolio
    ? getAllocationChartData(portfolio, maxSlices)
    : undefined

  return {
    data: chartData,
    portfolio,
    ...rest,
  }
}

/**
 * Get holdings sorted by specific criteria
 */
export function useHoldings(
  sortBy: 'value' | 'percentage' | 'change' = 'value',
  direction: 'asc' | 'desc' = 'desc'
) {
  const { data: portfolio, ...rest } = usePortfolio()

  const holdings = portfolio?.holdings.slice().sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'value':
        comparison = a.value - b.value
        break
      case 'percentage':
        comparison = a.percentage - b.percentage
        break
      case 'change':
        comparison = (a.change24h || 0) - (b.change24h || 0)
        break
    }
    return direction === 'desc' ? -comparison : comparison
  })

  return {
    data: holdings,
    totalValue: portfolio?.totalValue,
    isLivePrices: portfolio?.isLivePrices,
    ...rest,
  }
}

/**
 * Get allocation deviations from targets
 */
export function useAllocationTargets() {
  const { data: portfolio, ...rest } = usePortfolio()

  return {
    data: portfolio?.allocations,
    totalValue: portfolio?.totalValue,
    isLivePrices: portfolio?.isLivePrices,
    ...rest,
  }
}
