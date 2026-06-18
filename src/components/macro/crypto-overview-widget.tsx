'use client'

import { useMacro } from '@/hooks/use-macro'
import { formatPercentage } from '@/lib/mocks'
import { changeColor, WidgetCard } from './widget-card'

export function CryptoOverviewWidget() {
  const { data, isLoading } = useMacro()
  const crypto = data?.crypto

  return (
    <WidgetCard title="Crypto overview" loading={isLoading} empty={!isLoading && !crypto}>
      {crypto && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Fear &amp; Greed</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">
                {crypto.fearGreed.value}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  {crypto.fearGreed.label}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">BTC dominance</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">
                {crypto.btcDominance.toFixed(1)}%
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Top movers (24h)</p>
            <ul className="flex flex-wrap gap-2">
              {crypto.topMovers.map((mover) => (
                <li
                  key={mover.symbol}
                  className="rounded-md bg-muted px-2 py-1 text-xs"
                >
                  <span className="font-medium text-foreground">{mover.symbol}</span>{' '}
                  <span className={`tabular-nums ${changeColor(mover.changePct)}`}>
                    {formatPercentage(mover.changePct)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </WidgetCard>
  )
}
