/**
 * Portfolio / balance heatmap data hooks.
 *
 * Backend mode: AnalyticsService.GetHeatmap (tile size = holding value,
 * color = price change % over the window). PORTFOLIO scopes to one portfolio,
 * BALANCE spans all the caller's holdings across portfolios.
 * Demo mode: nodes are derived from the mock portfolio summary with a
 * deterministic fake change per symbol — fake numbers stay demo-only. The
 * demo has no real accounts/portfolios, so both hooks render the same flat
 * aggregate and grouping is a no-op (the card hides its group toggles).
 */

import { useQuery } from '@tanstack/react-query'
import { getPortfolioHeatmap, getBalanceHeatmap } from '@/lib/api/analytics-api'
import type { GetHeatmapResponse, HeatmapGroupBy, HeatmapWindow } from '@/lib/api/backend-types'
import { USE_BACKEND, DEMO_MODE } from '@/lib/config/data-source'
import { usePortfolioScope } from '@/lib/portfolio-scope'
import { usePortfolio } from './use-portfolio'

export interface HeatmapOptions {
  groupBy?: HeatmapGroupBy
  window?: HeatmapWindow
}

// Deterministic pseudo change % in (-6, +6) so demo tiles are stable across reloads.
function demoChange(symbol: string, window: string): number {
  let hash = 0
  for (const ch of symbol + window) {
    hash = (hash * 31 + ch.charCodeAt(0)) | 0
  }
  return ((hash % 1200) / 100) - 6
}

export interface HeatmapResult {
  data?: GetHeatmapResponse
  isLoading: boolean
  error: Error | null
}

// Builds a flat demo heatmap from the (already cached) mock portfolio summary.
function useDemoHeatmap(window: HeatmapWindow): HeatmapResult {
  const summary = usePortfolio()
  const holdings = summary.data?.holdings ?? []
  const data: GetHeatmapResponse = {
    quoteAssetId: 'USD',
    nodes: holdings
      .filter(h => h.value > 0)
      .map(h => ({
        id: h.assetId,
        label: h.symbol,
        size: h.value,
        colorValue: demoChange(h.symbol, window),
        assetId: h.assetId,
      })),
  }
  return { data, isLoading: summary.isLoading, error: summary.error }
}

export function usePortfolioHeatmap(options: HeatmapOptions = {}): HeatmapResult {
  const { portfolioId } = usePortfolioScope()
  const { groupBy, window = 'HEATMAP_WINDOW_24H' } = options

  const backendQuery = useQuery<GetHeatmapResponse>({
    queryKey: ['heatmap', 'portfolio', portfolioId, groupBy, window],
    queryFn: () => getPortfolioHeatmap(portfolioId!, { groupBy, window }),
    enabled: USE_BACKEND && !!portfolioId,
    staleTime: 60 * 1000,
  })

  const demo = useDemoHeatmap(window)
  if (!DEMO_MODE) {
    return { data: backendQuery.data, isLoading: backendQuery.isLoading, error: backendQuery.error }
  }
  return demo
}

// All holdings across every portfolio (portfolios list page).
export function useBalanceHeatmap(options: HeatmapOptions = {}): HeatmapResult {
  const { groupBy, window = 'HEATMAP_WINDOW_24H' } = options

  const backendQuery = useQuery<GetHeatmapResponse>({
    queryKey: ['heatmap', 'balance', groupBy, window],
    queryFn: () => getBalanceHeatmap({ groupBy, window }),
    enabled: USE_BACKEND,
    staleTime: 60 * 1000,
  })

  // Unscoped usePortfolio() already aggregates across portfolios in demo mode.
  const demo = useDemoHeatmap(window)
  if (!DEMO_MODE) {
    return { data: backendQuery.data, isLoading: backendQuery.isLoading, error: backendQuery.error }
  }
  return demo
}
