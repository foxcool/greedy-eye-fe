'use client'

import { useMemo, useState } from 'react'
import { useAssetSearch } from '@/hooks/use-assets'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useHeldAssets } from '@/hooks/use-held-assets'
import { usePrices } from '@/hooks/use-prices'
import { Input } from '@/components/ui/input'
import type { Asset } from '@/lib/api/backend-types'
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

/**
 * Look up a live price entry by asset id. Never by symbol: two assets can carry
 * the same ticker — that is what an impostor token is — and a symbol lookup
 * hands one of them the other's quote.
 */
function priceFor(
  prices: Record<string, { price: number; change24h: number }> | undefined,
  assetId?: string
) {
  if (!prices || !assetId) return undefined
  return prices[assetId]
}

// One server page of search results; past it the reader narrows the search.
const SEARCH_LIMIT = 200

export function PricesView() {
  // What the reader holds by default, and the catalogue only through a search.
  // This page used to render every catalogue row — 7175 on prod — and could
  // hold the main thread long enough for the browser to stop answering
  // (personal-1asm).
  const held = useHeldAssets()
  const [search, setSearch] = useState('')
  const query = useDebouncedValue(search, 300)
  const searching = query.trim().length >= 2
  const results = useAssetSearch(searching ? query : '', undefined, SEARCH_LIMIT)
  const heldAssets = useMemo(
    () => (held.data ?? []).map((r) => r.asset).filter((a): a is Asset => Boolean(a)),
    [held.data]
  )
  const assets = searching ? (results.data?.assets ?? []) : heldAssets
  const assetsLoading = searching ? results.isLoading : held.isLoading
  const { data: priceResult, isLoading: pricesLoading } = usePrices()
  const prices = priceResult?.prices

  // The selection is kept as the asset itself, not looked up in the visible
  // list: switching between your assets and search results must not cost the
  // chart its label while it still plots the same asset.
  const [selected, setSelected] = useState<Asset | undefined>()
  const selectedId = selected?.id
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
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-medium text-foreground">{searching ? 'Search results' : 'Your assets'}</h2>
          <Input
            placeholder="Search the catalogue by name, symbol or contract…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:max-w-sm"
          />
        </div>
        {searching && results.data?.truncated && (
          <p className="mb-2 text-xs text-muted-foreground">
            More assets match than one search returns — narrow it.
          </p>
        )}
        {assetsLoading ? (
          <p className="text-muted-foreground">Loading assets…</p>
        ) : assets.length === 0 ? (
          <p className="text-muted-foreground">{searching ? 'No assets match.' : 'You hold no assets yet.'}</p>
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
                const entry = priceFor(prices, asset.id)
                const isSelected = asset.id === selectedId
                return (
                  <TableRow
                    key={asset.id}
                    onClick={() => setSelected(asset)}
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
