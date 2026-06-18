'use client'

import { useMacro } from '@/hooks/use-macro'
import { formatPercentage } from '@/lib/mocks'
import { changeColor, WidgetCard } from './widget-card'

function formatIndexValue(value: number): string {
  if (value >= 1e9) return `$${(value / 1e12).toFixed(2)}T`
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function MarketsWidget() {
  const { data, isLoading } = useMacro()
  const markets = data?.markets ?? []

  return (
    <WidgetCard title="Markets" loading={isLoading} empty={!isLoading && markets.length === 0}>
      <ul className="divide-y divide-border">
        {markets.map((m) => (
          <li key={m.symbol} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">{m.name}</p>
              <p className="text-xs text-muted-foreground">{m.region}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {formatIndexValue(m.value)}
              </p>
              <p className={`text-xs tabular-nums ${changeColor(m.changePct)}`}>
                {formatPercentage(m.changePct)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </WidgetCard>
  )
}
