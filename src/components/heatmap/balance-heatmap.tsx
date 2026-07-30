'use client'

import { HeatmapCard } from './heatmap-card'
import { useBalanceHeatmap } from '@/hooks/use-heatmap'

// All holdings across every portfolio (portfolios list page).
export function BalanceHeatmap({ header }: { header?: React.ReactNode }) {
  return (
    <HeatmapCard
      title="All holdings"
      header={header}
      useData={useBalanceHeatmap}
      groupOptions={[
        { value: 'HEATMAP_GROUP_BY_PORTFOLIO', label: 'By portfolio' },
        { value: 'HEATMAP_GROUP_BY_ACCOUNT', label: 'By account' },
      ]}
    />
  )
}
