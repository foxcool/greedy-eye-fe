// Connect-RPC endpoints for AnalyticsService.
// All methods use POST to /eye.v1.AnalyticsService/<Method>.
import { apiClient } from './client'
import type { GetHeatmapResponse, HeatmapGroupBy, HeatmapWindow } from './backend-types'

const RPC = (method: string) => `/eye.v1.AnalyticsService/${method}`

export interface PortfolioHeatmapOptions {
  groupBy?: HeatmapGroupBy
  window?: HeatmapWindow
  quoteAssetId?: string
}

export async function getPortfolioHeatmap(
  portfolioId: string,
  opts: PortfolioHeatmapOptions = {}
): Promise<GetHeatmapResponse> {
  return apiClient.post<GetHeatmapResponse>(RPC('GetHeatmap'), {
    scope: 'HEATMAP_SCOPE_PORTFOLIO',
    scopeId: portfolioId,
    ...(opts.groupBy ? { groupBy: opts.groupBy } : {}),
    ...(opts.window ? { window: opts.window } : {}),
    ...(opts.quoteAssetId ? { quoteAssetId: opts.quoteAssetId } : {}),
  })
}
