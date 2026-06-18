'use client'

import { useMacro } from '@/hooks/use-macro'
import { changeColor, WidgetCard } from './widget-card'

export function InterestRatesWidget() {
  const { data, isLoading } = useMacro()
  const rates = data?.rates ?? []

  return (
    <WidgetCard title="Interest rates" loading={isLoading} empty={!isLoading && rates.length === 0}>
      <ul className="divide-y divide-border">
        {rates.map((r) => (
          <li key={r.bank} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">{r.bank}</p>
              <p className="text-xs text-muted-foreground">
                Next {new Date(r.nextMeeting).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {r.rate.toFixed(2)}%
              </p>
              <p className={`text-xs tabular-nums ${changeColor(r.deltaBps)}`}>
                {r.deltaBps > 0 ? '+' : ''}
                {r.deltaBps} bps
              </p>
            </div>
          </li>
        ))}
      </ul>
    </WidgetCard>
  )
}
