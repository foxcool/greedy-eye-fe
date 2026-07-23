'use client'

import {
  PortfolioSummaryCard,
  HoldingsTable,
  AllocationBars,
} from '@/components/portfolio'
import { BalanceHeatmap } from '@/components/heatmap/balance-heatmap'
import { PortfolioList } from './components/portfolio-list'

export default function PortfoliosPage() {
  return (
    <div className="space-y-8">
      {/* Aggregate overview across all portfolios */}
      <section className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Portfolios overview</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PortfolioSummaryCard />
          <AllocationBars maxItems={10} showTarget={true} />
        </div>
        {/* Performance map of every holding, across all portfolios */}
        <BalanceHeatmap />
      </section>

      {/* Portfolio list sits above the flat holdings table */}
      <PortfolioList />

      <div>
        <h2 className="text-lg font-medium text-foreground mb-4">Holdings</h2>
        <HoldingsTable />
      </div>
    </div>
  )
}
