'use client'

import { usePortfolio } from '@/hooks/use-portfolio'
import { formatCurrency, formatPercentage } from '@/lib/mocks'
import { Database, WifiOff } from 'lucide-react'

// Chrome-less value block: total, 24h change and provenance meta, laid out to sit
// as the header band of another card (see HeatmapCard's `header` prop) rather than
// occupying a card of its own — a few lines of text do not deserve half a row.
export function PortfolioValueHeader() {
  const { data: portfolio, isLoading, error, isFetching } = usePortfolio()

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-2" />
        <div className="h-9 w-48 bg-muted rounded" />
      </div>
    )
  }

  if (error || !portfolio) {
    return <p className="text-destructive">Failed to load portfolio</p>
  }

  // 24h change weighted by each holding's share of the portfolio.
  const weightedChange = portfolio.holdings.reduce((sum, h) => {
    return sum + (h.change24h || 0) * (h.percentage / 100)
  }, 0)

  const changeValue = portfolio.totalValue * (weightedChange / 100)
  const isPositive = weightedChange >= 0

  return (
    <div className="min-w-0">
      <div className="text-sm text-muted-foreground mb-1">Total portfolio value</div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-bold text-foreground tabular-nums">
          {formatCurrency(portfolio.totalValue)}
        </span>
        <span className={`text-sm tabular-nums ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {formatPercentage(weightedChange)} ({formatCurrency(changeValue)}) 24h
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mt-2 tabular-nums">
        <span>{portfolio.holdings.length} assets</span>
        <span aria-hidden="true">•</span>
        <span>
          Updated{' '}
          {new Intl.DateTimeFormat(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }).format(portfolio.lastUpdated)}
        </span>
        <span aria-hidden="true">•</span>
        {isFetching && (
          <span
            className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
            aria-hidden="true"
          />
        )}
        {portfolio.dataSource === 'backend' ? (
          <span
            className="flex items-center gap-1 text-blue-500"
            title="Holdings and prices from backend"
          >
            <Database size={12} aria-hidden="true" />
            Backend
          </span>
        ) : (
          <span className="flex items-center gap-1" title="Demo data (mock prices)">
            <WifiOff size={12} aria-hidden="true" />
            Demo
          </span>
        )}
      </div>
    </div>
  )
}
