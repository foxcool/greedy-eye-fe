'use client'

import Link from 'next/link'
import { useMacro } from '@/hooks/use-macro'
import { enabledWidgets, type WidgetId } from '@/lib/config/dashboard-widgets'
import { DEMO_MODE } from '@/lib/config/data-source'
import { InterestRatesWidget } from './interest-rates-widget'
import { MarketsWidget } from './markets-widget'
import { CryptoOverviewWidget } from './crypto-overview-widget'
import { NewsWidget } from './news-widget'

const WIDGETS: Record<WidgetId, React.ComponentType> = {
  'interest-rates': InterestRatesWidget,
  markets: MarketsWidget,
  'crypto-overview': CryptoOverviewWidget,
  news: NewsWidget,
}

export function MacroDashboard() {
  const { data } = useMacro()
  const widgets = enabledWidgets()

  // Macro widgets are backed by mock data only. Rendering them next to real
  // backend data would pass fake rates/news off as live — show an honest
  // empty state instead until real macro sources exist.
  if (!DEMO_MODE) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No macro data sources connected yet. Portfolio data lives on the{' '}
            <Link href="/portfolios" className="underline">Portfolios</Link> page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        {data?.asOf && (
          <span className="text-xs text-muted-foreground">
            As of {new Date(data.asOf).toLocaleString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {widgets.map((id) => {
          const Widget = WIDGETS[id]
          return <Widget key={id} />
        })}
      </div>
    </div>
  )
}
