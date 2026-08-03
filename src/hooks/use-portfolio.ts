/**
 * Portfolio data hooks
 *
 * Data flow:
 * 1. USE_BACKEND_API=true → holdings and prices from backend (prices are
 *    refreshed server-side by the backend scheduler; the browser never
 *    calls price providers directly)
 * 2. demo mode → mock holdings + deterministic mock prices, no network
 */

import { useQuery } from '@tanstack/react-query'
import {
  calculatePortfolio,
  getAllocationChartData,
  mockPrices,
} from '@/lib/mocks'
import type { PortfolioSummary, AllocationSlice, ValuationCoverage } from '@/lib/types/portfolio-view'
import { listPortfolios, listHoldings, listAccounts, calculatePortfolioValue } from '@/lib/api/portfolio-api'
import { listAssets } from '@/lib/api/assets-api'
import { fetchPortfolioPriceMap } from '@/lib/api/price-map'
import { buildRawHoldings } from '@/lib/api/adapters'
import { holdingToDecimal, type PortfolioValueResponse } from '@/lib/api/backend-types'
import { usePortfolioScope } from '@/lib/portfolio-scope'
import { listRules, readTargets, TARGET_ALLOCATION_RULE_TYPE } from '@/lib/api/automation-api'
import { USE_BACKEND as USE_BACKEND_API } from '@/lib/config/data-source'

interface PortfolioQueryResult extends PortfolioSummary {
  isLivePrices: boolean
}

/**
 * Merge the per-portfolio coverage reports into one. Counts add up; the capped
 * unpriced lists concatenate, and truncation is sticky — if any portfolio
 * truncated its list, the merged list is short too.
 */
function mergeCoverage(values: (PortfolioValueResponse | null)[]): ValuationCoverage | undefined {
  const reports = values.filter((v): v is PortfolioValueResponse => !!v?.coverage)
  if (reports.length === 0) return undefined

  return reports.reduce<ValuationCoverage>((acc, v) => {
    const c = v.coverage!
    return {
      pricedCount: (acc.pricedCount ?? 0) + (c.pricedCount ?? 0),
      unpricedCount: (acc.unpricedCount ?? 0) + (c.unpricedCount ?? 0),
      unpriced: [...(acc.unpriced ?? []), ...(c.unpriced ?? [])],
      unpricedTruncated: acc.unpricedTruncated || (c.unpricedTruncated ?? false),
    }
  }, {})
}

export function usePortfolio() {
  // When set, scope all derived data to a single portfolio; otherwise aggregate.
  const { portfolioId } = usePortfolioScope()

  return useQuery<PortfolioQueryResult>({
    queryKey: ['portfolio', 'summary', { backend: USE_BACKEND_API, portfolioId }],
    queryFn: async () => {
      if (USE_BACKEND_API) {
        // Fetch holdings data from backend
        const portfolios = await listPortfolios()

        if (portfolios.length === 0) {
          // No portfolios yet — return empty portfolio
          return { ...calculatePortfolio([], {}), isLivePrices: false, dataSource: 'backend' as const }
        }

        // When scoped, value just the one portfolio; otherwise sum across all.
        const valuedPortfolios = portfolioId
          ? portfolios.filter(p => p.id === portfolioId)
          : portfolios

        // Fetch all data in parallel. listHoldings is scoped by portfolioId when set.
        // Target allocations are per-portfolio, so only fetch the rule when scoped.
        const [holdings, accounts, assets, beValues, priceResult, rules] = await Promise.all([
          listHoldings(portfolioId ? { portfolioId } : {}),
          listAccounts(),
          listAssets(),
          Promise.all(valuedPortfolios.map(p => calculatePortfolioValue(p.id, 'usd').catch(() => null))),
          fetchPortfolioPriceMap(valuedPortfolios.map(p => p.id)),
          portfolioId ? listRules({ portfolioId }).catch(() => []) : Promise.resolve([]),
        ])

        const rawHoldings = buildRawHoldings(holdings, accounts, assets)
        // Targets come from the portfolio's target_allocation rule (keyed by backend
        // asset UUID, matching holdings). Empty when unscoped or no rule set → no
        // allocations are produced and the target UI hides itself.
        const targets = readTargets(rules.find((r) => r.ruleType === TARGET_ALLOCATION_RULE_TYPE))
        // Rows carry a price only where the backend stored one; the rest are
        // marked unpriced and shown as present-but-unvalued.
        const portfolio = calculatePortfolio(rawHoldings, priceResult.prices, targets)

        // Sum backend-calculated portfolio values (uses stored prices, COALESCE for portfolio_id).
        const beTotal = beValues.reduce((sum, v) => {
          if (!v?.totalValueAmount) return sum
          return sum + holdingToDecimal(v.totalValueAmount, v.decimals)
        }, 0)
        // The backend total wins. It is the one that applies the exclusion flag
        // and the market-depth gate and reports what it left out, so it is the
        // number the coverage line below actually describes. The client sum is
        // a fallback for when the RPC failed outright — it is computed from the
        // heatmap's prices, which cover held assets only, and treating it as
        // authoritative is what let a client-side pricing bug overwrite a
        // correct server total with a 250x overstatement (2026-08-02).
        const totalValue = beValues.some((v) => v?.totalValueAmount)
          ? beTotal
          : portfolio.totalValue

        return {
          ...portfolio,
          totalValue,
          coverage: mergeCoverage(beValues),
          isLivePrices: priceResult.isLive,
          dataSource: 'backend' as const,
        }
      }

      // Demo mode: mock holdings + deterministic mock prices, no network.
      return {
        ...calculatePortfolio(undefined, mockPrices),
        isLivePrices: false,
        dataSource: 'mock' as const,
      }
    },
    // Backend refreshes stored prices on its own schedule (~15 min); polling
    // faster than that is waste. Focus/reconnect refetches keep the page fresh.
    staleTime: 5 * 60 * 1000,
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

  // Per-asset target percentages (empty when the portfolio has no target rule).
  const targetByAssetId: Record<string, number> = {}
  portfolio?.allocations.forEach((a) => {
    targetByAssetId[a.assetId] = a.targetPercentage
  })

  return {
    data: holdings,
    totalValue: portfolio?.totalValue,
    isLivePrices: portfolio?.isLivePrices,
    targetByAssetId,
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
