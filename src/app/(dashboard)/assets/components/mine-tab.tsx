'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { HeldAsset } from '@/hooks/use-held-assets'
import { formatCurrency, formatPercentage, formatQuantity } from '@/lib/mocks'
import { cn } from '@/lib/utils'
import { AssetCell, ExternalAssetLink, FilterPills } from './asset-cell'

type Filter = 'counted' | 'unpriced' | 'excluded' | 'all'

function matches(row: HeldAsset, q: string): boolean {
  if (!q) return true
  return (
    row.symbol.toLowerCase().includes(q) ||
    row.name.toLowerCase().includes(q) ||
    row.accounts.some((a) => a.name.toLowerCase().includes(q))
  )
}

// Valued first by value, then unpriced, then what is kept out of the total. The
// order is the question "where is my money" answered top-down; an unpriced row
// has no place in a value ranking, and pretending $0 would put it last among
// the dust where it cannot be found.
function rank(row: HeldAsset): number {
  if (row.state === 'excluded') return 2
  if (row.unpriced || row.value === undefined) return 1
  return 0
}

function byRank(a: HeldAsset, b: HeldAsset): number {
  return rank(a) - rank(b) || (b.value ?? 0) - (a.value ?? 0) || a.symbol.localeCompare(b.symbol)
}

function Where({ row }: { row: HeldAsset }) {
  const [first, ...rest] = row.accounts
  if (!first) return <span className="text-muted-foreground">—</span>
  return (
    <span title={row.accounts.map((a) => a.name).join(', ')}>
      {first.name}
      {rest.length > 0 && <span className="text-muted-foreground"> +{rest.length}</span>}
    </span>
  )
}

function StateTag({ row }: { row: HeldAsset }) {
  if (row.state === 'counted' && !row.unpriced) return null
  const [label, cls, title] =
    row.state === 'excluded'
      ? ['excluded', 'text-destructive', 'Not in the total: every position of this asset is excluded.']
      : row.state === 'partial'
        ? [
            'partly excluded',
            'text-destructive',
            `${row.excludedPositions} of ${row.positions} positions are excluded; the value covers the rest.`,
          ]
        : [
            'unpriced',
            'text-amber-600 dark:text-amber-400',
            'Counted but not valued: no price the backend was willing to use. It is not in the total.',
          ]
  return (
    <span title={title} className={cn('text-[10px] uppercase tracking-wide font-semibold', cls)}>
      {label}
    </span>
  )
}

export function MineTab({ rows, isValuing }: { rows: HeldAsset[]; isValuing: boolean }) {
  const [filter, setFilter] = useState<Filter>('counted')
  const [search, setSearch] = useState('')

  const counts = useMemo(
    () => ({
      counted: rows.filter((r) => r.state !== 'excluded').length,
      unpriced: rows.filter((r) => r.state !== 'excluded' && r.unpriced).length,
      excluded: rows.filter((r) => r.state !== 'counted').length,
      all: rows.length,
    }),
    [rows]
  )

  const q = search.trim().toLowerCase()
  const visible = rows
    .filter((r) => {
      switch (filter) {
        case 'counted':
          return r.state !== 'excluded'
        case 'unpriced':
          return r.state !== 'excluded' && r.unpriced
        case 'excluded':
          return r.state !== 'counted'
        default:
          return true
      }
    })
    .filter((r) => matches(r, q))
    .sort(byRank)

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-muted-foreground">
          You hold nothing yet. Connect an account in Settings or add a holding to a portfolio.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Search symbol, name or account…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:max-w-xs"
        />
        <FilterPills
          label="Which holdings"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'counted', label: 'In total', count: counts.counted },
            { value: 'unpriced', label: 'Unpriced', count: counts.unpriced },
            { value: 'excluded', label: 'Excluded', count: counts.excluded },
            { value: 'all', label: 'All', count: counts.all },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nothing matches.</p>
      ) : (
        <div className="rounded-lg border border-border">
          <Table className="min-w-[40rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Share</TableHead>
                <TableHead className="text-right">24h</TableHead>
                <TableHead>Held in</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => {
                const valued = row.value !== undefined
                return (
                  <TableRow
                    key={row.assetId}
                    className={cn(
                      'relative cursor-pointer',
                      row.state === 'excluded' && 'opacity-50'
                    )}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AssetCell
                          assetId={row.assetId}
                          asset={row.asset}
                          symbol={row.symbol}
                          name={row.name}
                        />
                        <StateTag row={row} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums text-secondary-foreground">
                      {row.state === 'excluded' ? '—' : formatQuantity(row.quantity)}
                    </TableCell>
                    {/* Dashes, not zeros, where there is no value: zero is a claim
                        about the market, a dash says "held, not valued". */}
                    <TableCell className="text-right font-mono tabular-nums">
                      {valued ? formatCurrency(row.value!, row.value! < 1 ? 2 : 0) : isValuing ? '…' : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {valued ? `${row.percentage!.toFixed(1)}%` : '—'}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono tabular-nums',
                        !valued
                          ? 'text-muted-foreground'
                          : (row.change24h ?? 0) >= 0
                            ? 'text-[var(--ge-up)]'
                            : 'text-[var(--ge-down)]'
                      )}
                    >
                      {valued ? formatPercentage(row.change24h ?? 0) : '—'}
                    </TableCell>
                    <TableCell className="text-sm max-w-[18ch] truncate">
                      <Where row={row} />
                    </TableCell>
                    <TableCell className="text-right">
                      <ExternalAssetLink asset={row.asset} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
