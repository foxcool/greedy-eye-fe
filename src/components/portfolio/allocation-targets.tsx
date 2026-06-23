'use client'

import { useAllocationTargets } from '@/hooks/use-portfolio'
import { formatCurrency } from '@/lib/mocks'
import type { TargetAllocation } from '@/lib/types/portfolio-view'

interface AllocationTargetsProps {
  showOnlyDeviations?: boolean
  minDeviation?: number
}

export function AllocationTargets({ 
  showOnlyDeviations = false, 
  minDeviation = 0 
}: AllocationTargetsProps) {
  const { data: allocations, totalValue, isLoading, error } = useAllocationTargets()

  if (isLoading) {
    return <AllocationSkeleton />
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">Failed to load allocation targets</p>
      </div>
    )
  }

  // No targets configured for this portfolio — hide the block entirely.
  if (!allocations || allocations.length === 0) {
    return null
  }

  const filtered = showOnlyDeviations
    ? allocations.filter((a) => Math.abs(a.diff) >= minDeviation)
    : allocations

  // Separate overweight and underweight
  const overweight = filtered.filter((a) => a.diff > 0)
  const underweight = filtered.filter((a) => a.diff < 0)
  const onTarget = filtered.filter((a) => a.diff === 0)

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Target vs Current Allocation</h3>
      
      {overweight.length > 0 && (
        <AllocationSection 
          title="Overweight" 
          allocations={overweight} 
          colorClass="text-orange-500"
        />
      )}
      
      {underweight.length > 0 && (
        <AllocationSection 
          title="Underweight" 
          allocations={underweight} 
          colorClass="text-blue-500"
        />
      )}

      {!showOnlyDeviations && onTarget.length > 0 && (
        <AllocationSection 
          title="On Target" 
          allocations={onTarget} 
          colorClass="text-green-500"
        />
      )}

      {totalValue && (
        <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
          Based on portfolio value of {formatCurrency(totalValue)}
        </div>
      )}
    </div>
  )
}

interface AllocationSectionProps {
  title: string
  allocations: TargetAllocation[]
  colorClass: string
}

function AllocationSection({ title, allocations, colorClass }: AllocationSectionProps) {
  return (
    <div className="mb-4">
      <h4 className={`text-xs font-medium ${colorClass} mb-2`}>{title}</h4>
      <div className="space-y-2">
        {allocations.map((allocation) => (
          <AllocationRow key={allocation.assetId} allocation={allocation} />
        ))}
      </div>
    </div>
  )
}

function AllocationRow({ allocation }: { allocation: TargetAllocation }) {
  const { symbol, targetPercentage, currentPercentage, diff, diffValue } = allocation
  
  const diffColor = diff > 0 ? 'text-orange-500' : diff < 0 ? 'text-blue-500' : 'text-green-500'
  const bgWidth = Math.min(Math.max(currentPercentage, 0), 100)
  const targetWidth = Math.min(Math.max(targetPercentage, 0), 100)

  return (
    <div className="text-sm">
      <div className="flex justify-between items-center mb-1">
        <span className="text-foreground">{symbol}</span>
        <span className={`font-mono ${diffColor}`}>
          {diff > 0 ? '+' : ''}{diff}% ({diff > 0 ? '+' : ''}{formatCurrency(diffValue)})
        </span>
      </div>
      <div className="relative h-2 bg-muted rounded overflow-hidden">
        {/* Target marker */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground z-10"
          style={{ left: `${targetWidth}%` }}
        />
        {/* Current value bar */}
        <div 
          className={`absolute top-0 bottom-0 left-0 rounded ${
            diff > 0 ? 'bg-orange-500/50' : diff < 0 ? 'bg-blue-500/50' : 'bg-green-500/50'
          }`}
          style={{ width: `${bgWidth}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
        <span>Current: {currentPercentage}%</span>
        <span>Target: {targetPercentage}%</span>
      </div>
    </div>
  )
}

function AllocationSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-48 bg-muted rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-2 w-full bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
