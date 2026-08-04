'use client'

import {
  CryptoOverviewWidget,
  InterestRatesWidget,
  MarketsWidget,
  NewsWidget,
  WidgetCard,
} from '@/components/macro'
import type { WidgetId, WidgetInstance } from '@/lib/config/dashboard-widgets'
import { HeatmapWidget } from './widgets/heatmap-widget'
import { PortfolioValueWidget } from './widgets/portfolio-value-widget'

export interface WidgetProps {
  instance: WidgetInstance
  /** Resolved display title — e.g. the portfolio's name rather than its id. */
  title: string
}

/**
 * A widget type this build has no data for. It renders its own empty state
 * rather than being skipped: a widget the user placed and then cannot find is
 * worse than one that explains itself.
 */
function unavailable(label: string) {
  const Unavailable = ({ title }: WidgetProps) => (
    <WidgetCard title={title} empty emptyLabel={label} />
  )
  Unavailable.displayName = 'UnavailableWidget'
  return Unavailable
}

const NO_SOURCE = 'No data source connected yet'

/**
 * Type → component. Adding a widget is a definition in
 * lib/config/dashboard-widgets.ts plus a line here; the dashboard itself does
 * not change.
 *
 * The macro widgets are mock-backed and marked demoOnly in the definitions, so
 * outside the demo they resolve to an empty state instead of their component —
 * the alternative is a fabricated interest rate sitting beside a real total,
 * with nothing on screen saying which is which.
 */
export const WIDGET_COMPONENTS: Record<WidgetId, (props: WidgetProps) => React.ReactNode> = {
  'portfolio-value': PortfolioValueWidget,
  heatmap: HeatmapWidget,
  'interest-rates': InterestRatesWidget,
  markets: MarketsWidget,
  'crypto-overview': CryptoOverviewWidget,
  news: NewsWidget,
}

export const UNAVAILABLE_WIDGET = unavailable(NO_SOURCE)
