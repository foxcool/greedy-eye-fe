'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useHoldings } from '@/hooks/use-portfolio'
import { formatCurrency, formatPercentage, formatQuantity } from '@/lib/mocks'
import type { PortfolioHolding } from '@/lib/types/portfolio-view'

interface HoldingsTableProps {
  maxRows?: number
  showSources?: boolean
}

export function HoldingsTable({ maxRows, showSources = true }: HoldingsTableProps) {
  const { data: holdings, totalValue, isLoading, error } = useHoldings('value', 'desc')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (assetId: string) => {
    const next = new Set(expandedRows)
    if (next.has(assetId)) {
      next.delete(assetId)
    } else {
      next.add(assetId)
    }
    setExpandedRows(next)
  }

  if (isLoading) {
    return <TableSkeleton rows={5} />
  }

  if (error || !holdings) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">Failed to load holdings</p>
      </div>
    )
  }

  const displayHoldings = maxRows ? holdings.slice(0, maxRows) : holdings

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr className="text-left text-sm text-muted-foreground">
            <th className="px-4 py-3 font-medium w-8"></th>
            <th className="px-4 py-3 font-medium">Asset</th>
            <th className="px-4 py-3 font-medium text-right">Quantity</th>
            <th className="px-4 py-3 font-medium text-right">Price</th>
            <th className="px-4 py-3 font-medium text-right">Value</th>
            <th className="px-4 py-3 font-medium text-right">%</th>
            <th className="px-4 py-3 font-medium text-right">24h</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {displayHoldings.map((holding) => (
            <HoldingRow
              key={holding.assetId}
              holding={holding}
              isExpanded={expandedRows.has(holding.assetId)}
              onToggle={() => toggleRow(holding.assetId)}
              showSources={showSources}
            />
          ))}
        </tbody>
        {totalValue != null && (
          <tfoot className="bg-muted/50 border-t border-border">
            <tr className="text-sm font-medium">
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-foreground">Total</td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-right text-foreground">
                {formatCurrency(totalValue)}
              </td>
              <td className="px-4 py-3 text-right text-muted-foreground">100%</td>
              <td className="px-4 py-3"></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

interface HoldingRowProps {
  holding: PortfolioHolding
  isExpanded: boolean
  onToggle: () => void
  showSources: boolean
}

function HoldingRow({ holding, isExpanded, onToggle, showSources }: HoldingRowProps) {
  const hasSources = showSources && holding.sources.length > 1
  const changeColor = (holding.change24h || 0) >= 0 ? 'text-green-500' : 'text-red-500'

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (hasSources && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onToggle()
    }
  }

  return (
    <>
      <tr
        className={`text-sm ${hasSources ? 'cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none' : ''}`}
        onClick={hasSources ? onToggle : undefined}
        onKeyDown={handleKeyDown}
        tabIndex={hasSources ? 0 : undefined}
        role={hasSources ? 'button' : undefined}
        aria-expanded={hasSources ? isExpanded : undefined}
        aria-label={hasSources ? `${holding.symbol} ${holding.name}, ${isExpanded ? 'collapse' : 'expand'} sources` : undefined}
      >
        <td className="px-4 py-3 text-muted-foreground">
          {hasSources && (
            isExpanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{holding.symbol}</span>
            <span className="text-muted-foreground">{holding.name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-right text-secondary-foreground font-mono">
          {formatQuantity(holding.quantity)}
        </td>
        <td className="px-4 py-3 text-right text-muted-foreground font-mono">
          {formatCurrency(holding.price, holding.price < 1 ? 4 : 2)}
        </td>
        <td className="px-4 py-3 text-right text-foreground font-mono">
          {formatCurrency(holding.value)}
        </td>
        <td className="px-4 py-3 text-right text-muted-foreground">
          {holding.percentage.toFixed(1)}%
        </td>
        <td className={`px-4 py-3 text-right font-mono ${changeColor}`}>
          {formatPercentage(holding.change24h || 0)}
        </td>
      </tr>
      
      {/* Expanded sources */}
      {isExpanded && holding.sources.map((source, idx) => (
        <tr key={`${holding.assetId}-${idx}`} className="text-xs bg-muted/30">
          <td className="px-4 py-2"></td>
          <td className="px-4 py-2 pl-10 text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <SourceTypeBadge type={source.type} />
              {source.name}
              {source.chain && (
                <span className="opacity-60">({source.chain})</span>
              )}
            </span>
          </td>
          <td className="px-4 py-2 text-right text-muted-foreground font-mono">
            {formatQuantity(source.amount)}
          </td>
          <td className="px-4 py-2" colSpan={4}></td>
        </tr>
      ))}
    </>
  )
}

function SourceTypeBadge({ type }: { type: 'wallet' | 'exchange' | 'defi' }) {
  const styles = {
    wallet: 'bg-blue-500/20 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400',
    exchange: 'bg-orange-500/20 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
    defi: 'bg-purple-500/20 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
  }

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-medium ${styles[type]}`}>
      {type}
    </span>
  )
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="animate-pulse">
        <div className="h-10 bg-muted/50" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 border-t border-border flex items-center px-4 gap-4">
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="flex-1" />
            <div className="h-4 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
