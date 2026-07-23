'use client'

import { HeatmapCard } from '@/components/heatmap/heatmap-card'
import { usePortfolioHeatmap } from '@/hooks/use-heatmap'

// Single-portfolio performance map (portfolio detail page).
export function PortfolioHeatmap() {
  return (
    <HeatmapCard
      title="Performance map"
      useData={usePortfolioHeatmap}
      groupOptions={[{ value: 'HEATMAP_GROUP_BY_ACCOUNT', label: 'By account' }]}
    />
  )
}
