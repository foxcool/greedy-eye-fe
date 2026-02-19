/**
 * Portfolio data hooks
 * 
 * Fetches live prices from CoinGecko, falls back to mocks if unavailable.
 * Will switch to backend API when ready.
 */

import { useQuery } from '@tanstack/react-query'
import { 
  calculatePortfolio, 
  getAllocationChartData,
  fetchPricesWithFallback,
  mockPrices,
} from '@/lib/mocks'
import type { PortfolioSummary, AllocationSlice } from '@/lib/types/portfolio-view'

// Data source configuration
const USE_LIVE_PRICES = process.env.NEXT_PUBLIC_USE_LIVE_PRICES !== 'false'
const USE_BACKEND_API = process.env.NEXT_PUBLIC_USE_BACKEND === 'true'

interface PortfolioQueryResult extends PortfolioSummary {
  isLivePrices: boolean
}

/**
 * Fetch portfolio summary
 * 
 * Data flow:
 * 1. USE_BACKEND_API=true → fetch from backend (TODO)
 * 2. USE_LIVE_PRICES=true → fetch prices from CoinGecko, calculate locally
 * 3. fallback → use mock prices
 */
export function usePortfolio() {
  return useQuery<PortfolioQueryResult>({
    queryKey: ['portfolio', 'summary', { live: USE_LIVE_PRICES }],
    queryFn: async () => {
      if (USE_BACKEND_API) {
        // TODO: Replace with actual API call when backend is ready
        // const response = await apiClient.get<PortfolioSummary>('/api/v1/portfolio/summary')
        // return { ...response, isLivePrices: true }
        throw new Error('Backend API not implemented')
      }

      // Fetch live prices from CoinGecko (or fallback to mocks)
      const { prices, isLive } = USE_LIVE_PRICES
        ? await fetchPricesWithFallback(mockPrices)
        : { prices: mockPrices, isLive: false }

      // Calculate portfolio with fetched prices
      const portfolio = calculatePortfolio(undefined, prices)
      
      return {
        ...portfolio,
        isLivePrices: isLive,
      }
    },
    staleTime: 60 * 1000, // 1 minute — matches CoinGecko cache
    refetchInterval: USE_LIVE_PRICES ? 60 * 1000 : false, // auto-refresh with live prices
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
