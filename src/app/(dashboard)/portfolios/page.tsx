'use client'

import {
  PortfolioValueHeader,
  HoldingsTable,
  AllocationBars,
} from '@/components/portfolio'
import { BalanceHeatmap } from '@/components/heatmap/balance-heatmap'
import { PortfolioList } from './components/portfolio-list'

export default function PortfoliosPage() {
  return (
    <div className="space-y-8">
      {/* Two full-width blocks: what it is worth, then how it is composed. */}
      <section className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Portfolios overview</h1>
        {/* The total and the map it describes share one card instead of leaving a
            mostly empty half-row next to the allocation bars. */}
        <BalanceHeatmap header={<PortfolioValueHeader />} />
        <AllocationBars maxItems={10} showTarget={true} />
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
