'use client'

import { WidgetCard, changeColor } from '@/components/macro'
import { useAssetsByIds } from '@/hooks/use-assets'
import { useBalanceHeatmap, usePortfolioHeatmap, type HeatmapResult } from '@/hooks/use-heatmap'
import { usePriceHistory, type PricePoint } from '@/hooks/use-price-history'
import type { HeatmapNode } from '@/lib/api/backend-types'
import { DEMO_MODE } from '@/lib/config/data-source'
import { formatCurrency, formatPercentage } from '@/lib/mocks'
import type { WidgetProps } from '../widget-registry'

/**
 * Fewer points than this and the row draws no line. A handful of points joined
 * by straight segments looks like a measured trend while describing almost
 * nothing; a daily-priced asset has seven or fewer in a week.
 */
export const MIN_SPARKLINE_POINTS = 8

const SPARKLINE_DAYS = 7

const ROWS_BY_SIZE = { s: 5, m: 8, l: 12 } as const

/**
 * The largest positions the user holds, ranked.
 *
 * Reads the same GetHeatmap answer as the heatmap widget, flat and over the
 * 7d window: value, order, last price, change and the unpriced count all come
 * from the backend valuation, so this list cannot disagree with the map or the
 * total by doing its own sums. The backend already returns leaves sorted by
 * value; the list keeps that order and only cuts it.
 */
export function TopHoldingsWidget({ instance, title }: WidgetProps) {
  const perPortfolio = instance.params.scope === 'portfolio'

  if (perPortfolio && !instance.params.portfolioId) {
    return <WidgetCard title={title} empty emptyLabel="Pick a portfolio in this widget's settings" />
  }

  return (
    <TopHoldingsCard
      // Different hooks per scope: remount rather than change the hook order.
      key={perPortfolio ? 'portfolio' : 'balance'}
      title={title}
      useData={perPortfolio ? usePortfolioHeatmap : useBalanceHeatmap}
      limit={ROWS_BY_SIZE[instance.size]}
    />
  )
}

export interface TopHoldingsCardProps {
  title: string
  useData: (opts: { window: 'HEATMAP_WINDOW_7D' }) => HeatmapResult
  limit: number
}

export function TopHoldingsCard({ title, useData, limit }: TopHoldingsCardProps) {
  const { data, isLoading, error } = useData({ window: 'HEATMAP_WINDOW_7D' })
  const rows = (data?.nodes ?? []).filter(n => n.assetId).slice(0, limit)
  const unpriced = data?.coverage?.unpricedCount ?? 0

  // Names are a catalogue lookup, not part of the valuation. The demo has no
  // catalogue behind it, so its rows carry the symbol only.
  const assets = useAssetsByIds(DEMO_MODE || rows.length === 0 ? undefined : rows.map(r => r.assetId!))
  const names = new Map((assets.data ?? []).map(a => [a.id, a.name]))

  if (error) {
    return <WidgetCard title={title} empty emptyLabel="Could not load holdings" />
  }

  const pricesAsOf = data?.coverage?.pricesAsOf

  return (
    <WidgetCard
      title={title}
      note={unpriced > 0 ? `${unpriced} unpriced, not ranked` : undefined}
      loading={isLoading}
      empty={rows.length === 0 && unpriced === 0}
      emptyLabel="No holdings yet"
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No priced holdings to rank</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="w-6 text-left font-normal">#</th>
              <th className="text-left font-normal">Asset</th>
              <th className="font-normal">7d</th>
              <th className="text-right font-normal">Price</th>
              <th className="text-right font-normal">7d %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((node, i) => (
              <TopHoldingRow key={node.id} rank={i + 1} node={node} name={names.get(node.assetId!)} />
            ))}
          </tbody>
        </table>
      )}
      {pricesAsOf && (
        // The backend dates prices per valuation, not per row; this is the
        // oldest fresh quote behind the whole list.
        <p className="mt-2 text-xs text-muted-foreground">
          Oldest quote {new Date(pricesAsOf).toLocaleString()}
        </p>
      )}
    </WidgetCard>
  )
}

function TopHoldingRow({ rank, node, name }: { rank: number; node: HeatmapNode; name?: string }) {
  // No stored history in the demo; asking would only produce an error.
  const history = usePriceHistory(DEMO_MODE ? undefined : node.assetId, SPARKLINE_DAYS)
  const change = node.colorValue ?? 0

  return (
    <tr className="border-t border-border">
      <td className="py-1 text-muted-foreground tabular-nums">{rank}</td>
      <td className="py-1">
        <span className="font-medium">{node.label ?? node.assetId}</span>
        {name && <span className="ml-1 text-xs text-muted-foreground">{name}</span>}
      </td>
      <td className="py-1">
        <Sparkline points={history.data ?? []} />
      </td>
      <td className="py-1 text-right tabular-nums">
        {node.price !== undefined ? formatCurrency(node.price, 2) : '—'}
      </td>
      <td className={`py-1 text-right tabular-nums ${changeColor(change)}`}>{formatPercentage(change)}</td>
    </tr>
  )
}

const WIDTH = 80
const HEIGHT = 20

/** Price line over the window; nothing at all below MIN_SPARKLINE_POINTS. */
export function Sparkline({ points: unordered }: { points: PricePoint[] }) {
  if (unordered.length < MIN_SPARKLINE_POINTS) {
    return <svg width={WIDTH} height={HEIGHT} aria-label="Not enough price history" />
  }

  const points = [...unordered].sort((a, b) => a.time - b.time)
  const prices = points.map(p => p.price)
  const min = Math.min(...prices)
  const span = Math.max(...prices) - min || 1
  const t0 = points[0].time
  const tSpan = points[points.length - 1].time - t0 || 1
  const path = points
    .map(p => `${(((p.time - t0) / tSpan) * WIDTH).toFixed(1)},${(HEIGHT - ((p.price - min) / span) * HEIGHT).toFixed(1)}`)
    .join(' ')
  const rising = prices[prices.length - 1] >= prices[0]

  return (
    <svg width={WIDTH} height={HEIGHT} aria-label="7 day price">
      <polyline
        points={path}
        fill="none"
        strokeWidth={1.5}
        className={rising ? 'stroke-green-500' : 'stroke-red-500'}
      />
    </svg>
  )
}
