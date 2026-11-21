'use client'

import { WidgetCard, changeColor } from '@/components/macro'
import { useAssetsByIds } from '@/hooks/use-assets'
import { useBalanceHeatmap, usePortfolioHeatmap, type HeatmapResult } from '@/hooks/use-heatmap'
import { usePriceHistory, type PricePoint } from '@/hooks/use-price-history'
import type { HeatmapNode, HeatmapWindow } from '@/lib/api/backend-types'
import { DEMO_MODE } from '@/lib/config/data-source'
import { formatCurrency, formatPercentage } from '@/lib/mocks'
import type { WidgetProps } from '../widget-registry'

/** Below this many points a polyline implies a trend the data cannot show. */
export const MIN_SPARKLINE_POINTS = 8

// The change column and the sparkline cover the same window; change them together.
const WINDOW_DAYS = 7
const HEATMAP_WINDOW = 'HEATMAP_WINDOW_7D' satisfies HeatmapWindow
const WINDOW_LABEL = `${WINDOW_DAYS}d`

const ROWS_BY_SIZE = { s: 5, m: 8, l: 12 } as const

/** Largest positions first. Value and order come from the backend, so this cannot disagree with the heatmap. */
export function TopHoldingsWidget({ instance, title }: WidgetProps) {
  const perPortfolio = instance.params.scope === 'portfolio'

  if (perPortfolio && !instance.params.portfolioId) {
    return <WidgetCard title={title} empty emptyLabel="Pick a portfolio in this widget's settings" />
  }

  return (
    <TopHoldingsCard
      // Keyed per scope, as in HeatmapWidget.
      key={perPortfolio ? 'portfolio' : 'balance'}
      title={title}
      useData={perPortfolio ? usePortfolioHeatmap : useBalanceHeatmap}
      limit={ROWS_BY_SIZE[instance.size]}
    />
  )
}

export interface TopHoldingsCardProps {
  title: string
  useData: (opts: { window: typeof HEATMAP_WINDOW }) => HeatmapResult
  limit: number
}

export function TopHoldingsCard({ title, useData, limit }: TopHoldingsCardProps) {
  const { data, isLoading, error } = useData({ window: HEATMAP_WINDOW })
  const rows = (data?.nodes ?? [])
    .filter((n): n is RankedNode => !!n.assetId)
    // Backend already sorts by value; cut, do not re-sort.
    .slice(0, limit)
  const unpriced = data?.coverage?.unpricedCount ?? 0
  // No rows and nothing unpriced: the card is empty. No rows but some unpriced:
  // the note counts them and the body says nothing could be ranked.
  const noRows = rows.length === 0

  // Demo has no asset catalogue; rows show the symbol only.
  const skipNames = DEMO_MODE || noRows
  const assets = useAssetsByIds(skipNames ? undefined : rows.map(r => r.assetId))
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
      empty={noRows && unpriced === 0}
      emptyLabel="No holdings yet"
    >
      {noRows ? (
        <p className="text-sm text-muted-foreground">No priced holdings to rank</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="w-6 text-left font-normal">#</th>
              <th className="text-left font-normal">Asset</th>
              <th className="font-normal">{WINDOW_LABEL}</th>
              <th className="text-right font-normal">Price</th>
              <th className="text-right font-normal">{WINDOW_LABEL} %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((node, i) => (
              <TopHoldingRow key={node.id} rank={i + 1} node={node} name={names.get(node.assetId)} />
            ))}
          </tbody>
        </table>
      )}
      {pricesAsOf && (
        <p className="mt-2 text-xs text-muted-foreground">
          Oldest quote {new Date(pricesAsOf).toLocaleString()}
        </p>
      )}
    </WidgetCard>
  )
}

type RankedNode = HeatmapNode & { assetId: string }

function TopHoldingRow({ rank, node, name }: { rank: number; node: RankedNode; name?: string }) {
  // Demo has no stored price history.
  const history = usePriceHistory(DEMO_MODE ? undefined : node.assetId, WINDOW_DAYS)
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

export function Sparkline({ points: unordered }: { points: PricePoint[] }) {
  if (unordered.length < MIN_SPARKLINE_POINTS) {
    return <svg width={WIDTH} height={HEIGHT} aria-label="Not enough price history" />
  }

  const points = [...unordered].sort((a, b) => a.time - b.time)
  const prices = points.map(p => p.price)
  const min = Math.min(...prices)
  const t0 = points[0].time
  // Flat series: a zero span would divide by zero, so draw a horizontal line.
  const priceSpan = Math.max(...prices) - min || 1
  const timeSpan = points[points.length - 1].time - t0 || 1
  const toX = (time: number) => ((time - t0) / timeSpan) * WIDTH
  const toY = (price: number) => HEIGHT - ((price - min) / priceSpan) * HEIGHT
  const path = points.map(p => `${toX(p.time).toFixed(1)},${toY(p.price).toFixed(1)}`).join(' ')
  const rising = prices[prices.length - 1] >= prices[0]

  return (
    <svg width={WIDTH} height={HEIGHT} aria-label={`${WINDOW_DAYS} day price`}>
      <polyline
        points={path}
        fill="none"
        strokeWidth={1.5}
        className={rising ? 'stroke-green-500' : 'stroke-red-500'}
      />
    </svg>
  )
}
