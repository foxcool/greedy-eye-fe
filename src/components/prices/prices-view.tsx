'use client'

import { useState } from 'react'
import { useAssets } from '@/hooks/use-assets'
import { usePrices } from '@/hooks/use-prices'
import { formatCurrency, formatPercentage } from '@/lib/mocks'
import { changeColor } from '@/components/macro'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PriceHistoryChart } from './price-history-chart'

/** Look up a live price entry by asset symbol (prices are keyed by uppercase symbol). */
function priceFor(
  prices: Record<string, { price: number; change24h: number }> | undefined,
  symbol?: string
) {
  if (!prices || !symbol) return undefined
  return prices[symbol.toUpperCase()]
}

export function PricesView() {
  const { data: assets = [], isLoading: assetsLoading } = useAssets()
  const { data: priceResult, isLoading: pricesLoading } = usePrices()
  const prices = priceResult?.prices

  const [selectedId, setSelectedId] = useState<string | undefined>()
  const selected = assets.find((a) => a.id === selectedId)
  const selectedLabel = selected?.symbol?.toUpperCase() ?? selected?.name

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-foreground">Prices</h1>
        {priceResult && (
          <span className="text-xs text-muted-foreground">
            {priceResult.isLive ? 'Backend · stored prices' : 'Demo · mock prices'}
          </span>
        )}
      </div>

      <PriceHistoryChart assetId={selectedId} assetLabel={selectedLabel} />

      <div>
        <h2 className="text-lg font-medium text-foreground mb-4">Assets</h2>
        {assetsLoading ? (
          <p className="text-muted-foreground">Loading assets…</p>
        ) : assets.length === 0 ? (
          <p className="text-muted-foreground">No assets yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">24h</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => {
                const entry = priceFor(prices, asset.symbol)
                const isSelected = asset.id === selectedId
                return (
                  <TableRow
                    key={asset.id}
                    onClick={() => setSelectedId(asset.id)}
                    className={`cursor-pointer ${isSelected ? 'bg-secondary' : ''}`}
                  >
                    <TableCell className="font-medium">
                      {asset.symbol?.toUpperCase() ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{asset.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pricesLoading
                        ? '…'
                        : entry
                          ? formatCurrency(entry.price, entry.price < 10 ? 4 : 2)
                          : '—'}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${entry ? changeColor(entry.change24h) : ''}`}>
                      {entry ? formatPercentage(entry.change24h) : '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
