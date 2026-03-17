'use client'

import { use } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { HoldingsManager } from './components/holdings-manager'
import { getPortfolio } from '@/lib/api/portfolio-api'
import type { Portfolio } from '@/lib/api/backend-types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PortfolioDetailPage({ params }: PageProps) {
  const { id } = use(params)

  const { data: portfolio, isLoading, error } = useQuery({
    queryKey: ['portfolios', id],
    queryFn: () => getPortfolio(id),
  })

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

      <HoldingsManager portfolioId={id} />
    </div>
  )
}
