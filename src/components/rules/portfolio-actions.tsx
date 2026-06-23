'use client'

import { useState } from 'react'
import { PortfolioScopeProvider } from '@/lib/portfolio-scope'
import { useAllocationTargets } from '@/hooks/use-portfolio'
import { formatCurrency } from '@/lib/mocks'

interface PlannedTrade {
  assetId: string
  symbol: string
  action: 'BUY' | 'SELL'
  amount: number // USD, positive
}

// Rebalancing to-do list for one portfolio: buy underweight, sell overweight,
// derived from current-vs-target deviations. Manual execution until the backend
// gains automatic rule execution.
function ActionsInner({ name, minAmount = 1 }: { name: string; minAmount?: number }) {
  const { data: allocations, isLoading } = useAllocationTargets()
  const [done, setDone] = useState<Record<string, boolean>>({})

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>

  const trades: PlannedTrade[] = (allocations ?? [])
    .map((a): PlannedTrade => ({
      assetId: a.assetId,
      symbol: a.symbol,
      // diff = current - target. Underweight (diff<0) → buy; overweight → sell.
      action: a.diff < 0 ? 'BUY' : 'SELL',
      amount: Math.abs(a.diffValue),
    }))
    .filter((t) => t.amount >= minAmount)
    .sort((a, b) => b.amount - a.amount)

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">{name}</h3>
      {trades.length === 0 ? (
        <p className="text-sm text-muted-foreground">On target — nothing to do.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {trades.map((t) => (
            <li key={t.assetId} className="flex items-center gap-3 px-4 py-2">
              <input
                type="checkbox"
                checked={!!done[t.assetId]}
                onChange={(e) => setDone({ ...done, [t.assetId]: e.target.checked })}
              />
              <span
                className={`w-12 text-xs font-semibold ${
                  t.action === 'BUY' ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {t.action}
              </span>
              <span className={`flex-1 text-sm ${done[t.assetId] ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {t.symbol}
              </span>
              <span className="text-sm tabular-nums text-foreground">
                {formatCurrency(t.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function PortfolioActions({ portfolioId, name }: { portfolioId: string; name: string }) {
  return (
    <PortfolioScopeProvider portfolioId={portfolioId}>
      <ActionsInner name={name} />
    </PortfolioScopeProvider>
  )
}
