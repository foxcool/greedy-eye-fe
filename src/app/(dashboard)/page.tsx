'use client'

import { 
  PortfolioSummaryCard, 
  HoldingsTable, 
  AllocationBars,
} from '@/components/portfolio'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Portfolio</h1>
      
      {/* Summary + Allocation bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PortfolioSummaryCard />
        <AllocationBars maxItems={10} showTarget={true} />
      </div>

      {/* Holdings table */}
      <div>
        <h2 className="text-lg font-medium text-foreground mb-4">Holdings</h2>
        <HoldingsTable />
      </div>
    </div>
  )
}
