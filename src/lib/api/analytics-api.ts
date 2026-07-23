// Connect-RPC endpoints for AnalyticsService.
// All methods use POST to /eye.v1.AnalyticsService/<Method>.
import { apiClient } from './client'
import type { GetHeatmapResponse, HeatmapGroupBy, HeatmapWindow } from './backend-types'

const RPC = (method: string) => `/eye.v1.AnalyticsService/${method}`

export interface HeatmapRequestOptions {
  groupBy?: HeatmapGroupBy
  window?: HeatmapWindow
  quoteAssetId?: string
}

function heatmapBody(opts: HeatmapRequestOptions) {
  return {
    ...(opts.groupBy ? { groupBy: opts.groupBy } : {}),
    ...(opts.window ? { window: opts.window } : {}),
    ...(opts.quoteAssetId ? { quoteAssetId: opts.quoteAssetId } : {}),
  }
}

// One portfolio (scope_id = portfolio id).
export async function getPortfolioHeatmap(
  portfolioId: string,
  opts: HeatmapRequestOptions = {}
): Promise<GetHeatmapResponse> {
  return apiClient.post<GetHeatmapResponse>(RPC('GetHeatmap'), {
    scope: 'HEATMAP_SCOPE_PORTFOLIO',
    scopeId: portfolioId,
    ...heatmapBody(opts),
  })
}

// All caller's holdings across portfolios (no scope_id).
export async function getBalanceHeatmap(
  opts: HeatmapRequestOptions = {}
): Promise<GetHeatmapResponse> {
  return apiClient.post<GetHeatmapResponse>(RPC('GetHeatmap'), {
    scope: 'HEATMAP_SCOPE_BALANCE',
    ...heatmapBody(opts),
  })
}
