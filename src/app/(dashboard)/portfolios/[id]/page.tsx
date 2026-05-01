'use client'

import { use } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { HoldingsManager } from './components/holdings-manager'
import { getPortfolio, calculatePortfolioValue } from '@/lib/api/portfolio-api'
import { holdingToDecimal } from '@/lib/api/backend-types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PortfolioDetailPage({ params }: PageProps) {
  const { id } = use(params)

  const { data: portfolio, isLoading, error } = useQuery({
    queryKey: ['portfolios', id],
    queryFn: () => getPortfolio(id),
  })

  const { data: portfolioValue } = useQuery({
    queryKey: ['portfolios', id, 'value'],
    queryFn: () => calculatePortfolioValue(id, 'usd'),
    enabled: !!portfolio,
    staleTime: 60_000,
  })

  const totalValue = portfolioValue?.totalValueAmount
    ? holdingToDecimal(portfolioValue.totalValueAmount, portfolioValue.decimals)
    : null

  if (isLoading) {
    return <p className="text-muted-foreground">Loading…</p>
  }

  if (error || !portfolio) {
    return (
      <div className="space-y-3">
        <p className="text-destructive">Portfolio not found.</p>
        <Button variant="outline" asChild>
          <Link href="/portfolios">← Back to Portfolios</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/portfolios">←</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{portfolio.name}</h1>
            {portfolio.description && (
              <p className="text-sm text-muted-foreground">{portfolio.description}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-0.5">Total value</p>
          <p className="text-2xl font-bold tabular-nums">
            {totalValue === null
              ? '—'
              : totalValue === 0
                ? '$0'
                : `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          {totalValue === 0 && (
            <p className="text-xs text-muted-foreground">No price data</p>
          )}
        </div>
      </div>

      <HoldingsManager portfolioId={id} />
    </div>
  )
}
