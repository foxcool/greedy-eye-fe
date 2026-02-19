'use client'

import { useHoldings } from '@/hooks/use-portfolio'
import { formatCurrency } from '@/lib/mocks'
import { targetPercentages } from '@/lib/mocks/portfolio-data'

interface AllocationBarsProps {
  maxItems?: number
  showTarget?: boolean
  groupSmall?: boolean
  smallThreshold?: number
}

export function AllocationBars({ 
  maxItems = 15, 
  showTarget = true,
  groupSmall = true,
  smallThreshold = 1.5 
}: AllocationBarsProps) {
  const { data: holdings, totalValue, isLoading, error } = useHoldings('value', 'desc')

  if (isLoading) {
    return <BarsSkeleton count={8} />
  }

  if (error || !holdings || !totalValue) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">Failed to load allocation data</p>
      </div>
    )
  }

  // Group small holdings if enabled
  let displayItems = holdings
  let otherValue = 0
  let otherCount = 0

  if (groupSmall) {
    displayItems = holdings.filter(h => h.percentage >= smallThreshold)
    const smallHoldings = holdings.filter(h => h.percentage < smallThreshold)
    otherValue = smallHoldings.reduce((sum, h) => sum + h.value, 0)
    otherCount = smallHoldings.length
  }

  // Limit items
  if (displayItems.length > maxItems) {
    const excess = displayItems.slice(maxItems)
    otherValue += excess.reduce((sum, h) => sum + h.value, 0)
    otherCount += excess.length
    displayItems = displayItems.slice(0, maxItems)
  }

  const maxPercentage = Math.max(
    ...displayItems.map(h => h.percentage),
    ...displayItems.map(h => targetPercentages[h.assetId] || 0),
    otherValue / totalValue * 100
  )

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Allocation</h3>
        {showTarget && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 bg-blue-500 rounded-sm" />
              Current
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-muted-foreground" />
              Target
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {displayItems.map((holding) => (
          <AllocationBar
            key={holding.assetId}
            symbol={holding.symbol}
            value={holding.value}
            percentage={holding.percentage}
            targetPercentage={showTarget ? targetPercentages[holding.assetId] : undefined}
            maxPercentage={maxPercentage}
            change24h={holding.change24h}
          />
        ))}

        {otherValue > 0 && (
          <AllocationBar
            symbol={`Other (${otherCount})`}
            value={otherValue}
            percentage={(otherValue / totalValue) * 100}
            maxPercentage={maxPercentage}
            isOther
          />
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm">
        <span className="text-muted-foreground">Total</span>
        <span className="text-foreground font-medium tabular-nums">{formatCurrency(totalValue)}</span>
      </div>
    </div>
  )
}

interface AllocationBarProps {
  symbol: string
  value: number
  percentage: number
  targetPercentage?: number
  maxPercentage: number
  change24h?: number
  isOther?: boolean
}

function AllocationBar({ 
  symbol, 
  value, 
  percentage, 
  targetPercentage, 
  maxPercentage,
  change24h,
  isOther = false
}: AllocationBarProps) {
  const barWidth = (percentage / maxPercentage) * 100
  const targetWidth = targetPercentage ? (targetPercentage / maxPercentage) * 100 : 0
  
  // Deviation from target
  const diff = targetPercentage ? percentage - targetPercentage : 0
  const isOverweight = diff > 0.5
  const isUnderweight = diff < -0.5

  // Bar color based on deviation
  let barColor = 'bg-blue-500'
  if (isOther) {
    barColor = 'bg-muted-foreground/50'
  } else if (isOverweight) {
    barColor = 'bg-orange-500'
  } else if (isUnderweight) {
    barColor = 'bg-blue-400'
  }

  return (
    <div className="group">
      <div className="flex justify-between items-baseline mb-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isOther ? 'text-muted-foreground' : 'text-foreground'}`}>
            {symbol}
          </span>
          {change24h !== undefined && !isOther && (
            <span className={`text-xs ${change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change24h >= 0 ? '+' : ''}{change24h.toFixed(1)}%
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {percentage.toFixed(1)}%
            {targetPercentage !== undefined && (
              <span className="opacity-60"> / {targetPercentage}%</span>
            )}
          </span>
          <span className="text-sm text-secondary-foreground font-mono tabular-nums w-20 text-right">
            {formatCurrency(value, 0)}
          </span>
        </div>
      </div>
      
      <div className="relative h-4 bg-muted rounded overflow-hidden">
        {/* Current value bar */}
        <div 
          className={`absolute top-0 bottom-0 left-0 ${barColor} rounded transition-all duration-300`}
          style={{ width: `${barWidth}%` }}
        />
        
        {/* Target marker */}
        {targetPercentage !== undefined && targetPercentage > 0 && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-foreground/40 z-10"
            style={{ left: `${targetWidth}%` }}
          />
        )}
      </div>
    </div>
  )
}

function BarsSkeleton({ count }: { count: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-24 bg-muted rounded" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <div className="h-4 w-16 bg-muted rounded" />
              <div className="h-4 w-20 bg-muted rounded" />
            </div>
            <div className="h-4 bg-muted rounded" style={{ width: `${80 - i * 8}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}
