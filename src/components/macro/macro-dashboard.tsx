'use client'

import { useMacro } from '@/hooks/use-macro'
import { enabledWidgets, type WidgetId } from '@/lib/config/dashboard-widgets'
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
