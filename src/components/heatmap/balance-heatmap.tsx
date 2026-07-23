'use client'

import { HeatmapCard } from './heatmap-card'
import { useBalanceHeatmap } from '@/hooks/use-heatmap'

// All holdings across every portfolio (portfolios list page).
export function BalanceHeatmap() {
  return (
    <HeatmapCard
      title="All holdings"
      useData={useBalanceHeatmap}
      groupOptions={[
        { value: 'HEATMAP_GROUP_BY_PORTFOLIO', label: 'By portfolio' },
        { value: 'HEATMAP_GROUP_BY_ACCOUNT', label: 'By account' },
      ]}
    />
  )
}
