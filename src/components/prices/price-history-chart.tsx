'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { usePriceHistory } from '@/hooks/use-price-history'
import { formatCurrency } from '@/lib/mocks'

interface PriceHistoryChartProps {
  assetId?: string
  assetLabel?: string
  days?: number
}

export function PriceHistoryChart({ assetId, assetLabel, days = 30 }: PriceHistoryChartProps) {
  const { data, isLoading, error } = usePriceHistory(assetId, days)

  if (!assetId) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 h-80 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Select an asset to see its price history.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 h-80">
        <div className="animate-pulse h-full w-full rounded bg-muted" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
        <p className="text-destructive">Failed to load price history.</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 h-80 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No stored price history for this asset yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        {assetLabel ?? assetId} · last {days}d
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              scale="time"
              tickFormatter={(t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={(v) => formatCurrency(v, v < 10 ? 2 : 0)}
              tick={{ fontSize: 11 }}
              width={64}
              className="text-muted-foreground"
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: { time: number; price: number } }>
}) {
  if (!active || !payload?.[0]) return null
  const point = payload[0].payload
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
      <div className="text-sm font-medium text-popover-foreground">
        {formatCurrency(point.price, point.price < 10 ? 4 : 2)}
      </div>
      <div className="text-xs text-muted-foreground">
        {new Date(point.time).toLocaleString()}
      </div>
    </div>
  )
}
