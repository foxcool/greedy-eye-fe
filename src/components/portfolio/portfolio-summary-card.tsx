'use client'

import { usePortfolio } from '@/hooks/use-portfolio'
import { formatCurrency, formatPercentage } from '@/lib/mocks'
import { Database, Wifi, WifiOff } from 'lucide-react'

export function PortfolioSummaryCard() {
  const { data: portfolio, isLoading, error, isFetching } = usePortfolio()

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="animate-pulse">
          <div className="h-4 w-24 bg-muted rounded mb-2" />
          <div className="h-8 w-40 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error || !portfolio) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
        <p className="text-destructive">Failed to load portfolio</p>
      </div>
    )
  }

  // Calculate 24h change (weighted average)
  const weightedChange = portfolio.holdings.reduce((sum, h) => {
    return sum + (h.change24h || 0) * (h.percentage / 100)
  }, 0)

  const changeValue = portfolio.totalValue * (weightedChange / 100)
  const isPositive = weightedChange >= 0

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm text-muted-foreground mb-1">Total Portfolio Value</div>
          <div className="text-3xl font-bold text-foreground">
            {formatCurrency(portfolio.totalValue)}
          </div>
          <div className={`text-sm mt-2 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {formatPercentage(weightedChange)} ({formatCurrency(changeValue)}) 24h
          </div>
        </div>
        
        {/* Live/Mock indicator */}
        <div className="flex items-center gap-1.5">
          {isFetching && (
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" aria-hidden="true" />
          )}
          {portfolio.dataSource === 'backend' ? (
            <div className="flex items-center gap-1 text-xs text-blue-500" title="Value calculated by backend">
              <Database size={14} aria-hidden="true" />
              <span>Backend</span>
            </div>
          ) : portfolio.isLivePrices ? (
            <div className="flex items-center gap-1 text-xs text-green-500" title="Live prices from CoinGecko">
              <Wifi size={14} aria-hidden="true" />
              <span>Live</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground" title="Using cached/mock prices">
              <WifiOff size={14} aria-hidden="true" />
              <span>Offline</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground mt-3 tabular-nums">
        {portfolio.holdings.length} assets • Updated{' '}
        {new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(portfolio.lastUpdated)}
      </div>
    </div>
  )
}
