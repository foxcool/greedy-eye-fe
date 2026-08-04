'use client'

import { WidgetCard } from '@/components/macro'
import { HeatmapCard } from '@/components/heatmap/heatmap-card'
import { useBalanceHeatmap, usePortfolioHeatmap } from '@/hooks/use-heatmap'
import type { WidgetProps } from '../widget-registry'

/**
 * Holdings treemap, scoped either to one portfolio or to everything.
 *
 * The window and grouping toggles stay inside HeatmapCard rather than becoming
 * instance parameters. They change how the same set is drawn and are flipped
 * several times a minute while reading; persisting them would make a glance
 * cost a save, and the card would then have two sources of truth for its own
 * toolbar. What a widget instance owns is WHICH holdings it draws.
 *
 * The portfolio scope reaches usePortfolioHeatmap through context, injected by
 * the frame — the same channel the portfolio pages use.
 */
export function HeatmapWidget({ instance, title }: WidgetProps) {
  const perPortfolio = instance.params.scope === 'portfolio'

  if (perPortfolio && !instance.params.portfolioId) {
    // Scoped to a portfolio that was never chosen. The backend would be asked
    // for nothing and the tile would sit empty with no reason given.
    return <WidgetCard title={title} empty emptyLabel="Pick a portfolio in this widget's settings" />
  }

  return (
    <HeatmapCard
      // The two hooks call different hooks internally, so swapping them under
      // one mounted component would shift the hook order. Keying on the scope
      // remounts instead, which is what changing the data source really is.
      key={perPortfolio ? 'portfolio' : 'balance'}
      title={title}
      useData={perPortfolio ? usePortfolioHeatmap : useBalanceHeatmap}
      groupOptions={
        perPortfolio
          ? [{ value: 'HEATMAP_GROUP_BY_ACCOUNT', label: 'By account' }]
          : [
              { value: 'HEATMAP_GROUP_BY_PORTFOLIO', label: 'By portfolio' },
              { value: 'HEATMAP_GROUP_BY_ACCOUNT', label: 'By account' },
            ]
      }
      height={instance.size === 's' ? 220 : instance.size === 'm' ? 300 : 384}
    />
  )
}
