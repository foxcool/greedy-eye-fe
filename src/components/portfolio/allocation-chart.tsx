'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useAllocationChart } from '@/hooks/use-portfolio'
import { formatCurrency } from '@/lib/mocks'

interface AllocationChartProps {
  maxSlices?: number
  showLegend?: boolean
}

export function AllocationChart({ maxSlices = 10, showLegend = true }: AllocationChartProps) {
  const { data: chartData, isLoading, error } = useAllocationChart(maxSlices)

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 h-80">
        <div className="animate-pulse flex items-center justify-center h-full">
          <div className="w-48 h-48 rounded-full bg-muted" />
        </div>
      </div>
    )
  }

  if (error || !chartData) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
        <p className="text-destructive">Failed to load allocation data</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Allocation</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="symbol"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              stroke="transparent"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { symbol: string; value: number; percentage: number } }> }) {
  if (!active || !payload?.[0]) return null

  const data = payload[0].payload

  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
      <div className="font-medium text-popover-foreground">{data.symbol}</div>
      <div className="text-sm text-muted-foreground">
        {formatCurrency(data.value)} ({data.percentage.toFixed(1)}%)
      </div>
    </div>
  )
}
