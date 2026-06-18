import { useQuery } from '@tanstack/react-query'
import { listPriceHistory } from '@/lib/api/assets-api'
import { holdingToDecimal } from '@/lib/api/backend-types'

export interface PricePoint {
  time: number // epoch ms, for chart x-axis
  timestamp: string
  price: number
}

/**
 * Price history for one asset over the trailing `days`, mapped to decimal points
 * ready for a line chart. Disabled until an assetId is selected.
 */
export function usePriceHistory(assetId: string | undefined, days = 30, baseAssetId = 'usd') {
  return useQuery<PricePoint[]>({
    queryKey: ['price-history', assetId, baseAssetId, days],
    enabled: !!assetId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      const prices = await listPriceHistory(assetId!, baseAssetId, { from })
      return prices.map((p) => ({
        time: new Date(p.timestamp).getTime(),
        timestamp: p.timestamp,
        price: holdingToDecimal(p.last, p.decimals),
      }))
    },
  })
}
