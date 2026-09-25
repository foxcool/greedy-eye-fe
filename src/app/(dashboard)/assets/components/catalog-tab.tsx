'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePrices } from '@/hooks/use-prices'
import type { Asset } from '@/lib/api/backend-types'
import { ASSET_TYPE_LABELS, assetTypeLabel, isFlagged } from '@/lib/assets/catalogue'
import { contractRef } from '@/lib/assets/links'
import { formatCurrency } from '@/lib/mocks'
import { AssetCell, ExternalAssetLink } from './asset-cell'
import { ContractLink } from './contract-link'

const PAGE_SIZE = 50

export type VerdictFilter = 'any' | 'flagged' | 'legit' | 'suspect' | 'impersonation' | 'scam' | 'unknown'

const VERDICT_FILTERS: { value: VerdictFilter; label: string }[] = [
  { value: 'any', label: 'Any verdict' },
  { value: 'flagged', label: 'Flagged (all three)' },
  { value: 'legit', label: 'Legit' },
  { value: 'suspect', label: 'Suspect' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'scam', label: 'Scam' },
  { value: 'unknown', label: 'Not scored' },
]

export function isVerdictFilter(v: string | null): v is VerdictFilter {
  return VERDICT_FILTERS.some((f) => f.value === v)
}

function matchesVerdict(a: Asset, f: VerdictFilter): boolean {
  if (f === 'any') return true
  if (f === 'flagged') return isFlagged(a)
  return (a.identityVerdict ?? 'unknown') === f
}

/**
 * The whole catalogue — every asset any user or sync ever created, shared by all.
 * It is a lookup, not a list to read: the reader arrives with a name or a
 * contract in mind, so the search box leads and rows are paged.
 */
export function CatalogTab({
  assets,
  heldIds,
  verdict,
  onVerdictChange,
}: {
  assets: Asset[]
  heldIds: ReadonlySet<string>
  verdict: VerdictFilter
  onVerdictChange: (v: VerdictFilter) => void
}) {
  const { data: priceResult } = usePrices()
  const [search, setSearch] = useState('')
  const [type, setType] = useState<string>('any')
  const [page, setPage] = useState(0)

  const q = search.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      assets
        .filter((a) => type === 'any' || a.type === type)
        .filter((a) => matchesVerdict(a, verdict))
        .filter(
          (a) =>
            !q ||
            a.id.toLowerCase() === q ||
            a.name.toLowerCase().includes(q) ||
            (a.symbol ?? '').toLowerCase().includes(q) ||
            // A pasted contract address finds its token, which is how a
            // lookalike is usually chased down.
            (contractRef(a)?.address.toLowerCase() ?? '').includes(q)
        )
        // Held first, then by symbol: in a catalogue of airdrop noise, the rows
        // that are yours are the ones worth landing on.
        .sort(
          (a, b) =>
            Number(heldIds.has(b.id)) - Number(heldIds.has(a.id)) ||
            (a.symbol ?? a.name).localeCompare(b.symbol ?? b.name)
        ),
    [assets, type, verdict, q, heldIds]
  )

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)
  const reset = () => setPage(0)

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Input
          placeholder="Search name, symbol or contract address…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            reset()
          }}
          className="md:max-w-sm"
        />
        <div className="flex gap-2">
          <Select
            value={type}
            onValueChange={(v) => {
              setType(v)
              reset()
            }}
          >
            <SelectTrigger className="w-[9rem]" aria-label="Asset type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any type</SelectItem>
              {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={verdict}
            onValueChange={(v) => {
              if (isVerdictFilter(v)) onVerdictChange(v)
              reset()
            }}
          >
            <SelectTrigger className="w-[11rem]" aria-label="Verdict">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VERDICT_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No assets match.</p>
      ) : (
        <>
          <div className="rounded-lg border border-border">
            <Table className="min-w-[40rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((a) => {
                  // By asset id, never by symbol: a lookalike shares the ticker
                  // of the asset it imitates. Only held assets have a price here.
                  const price = priceResult?.prices[a.id]?.price
                  const held = heldIds.has(a.id)
                  return (
                    <TableRow key={a.id} className="relative cursor-pointer">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AssetCell
                            assetId={a.id}
                            asset={a}
                            symbol={a.symbol ?? a.name}
                            name={a.name}
                          />
                          {held && (
                            <span
                              className="text-[10px] uppercase tracking-wide font-semibold text-primary"
                              title="You hold this asset"
                            >
                              held
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {assetTypeLabel(a.type)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {price != null ? formatCurrency(price, price < 1 ? 4 : 2) : '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-sm text-muted-foreground">
                        {/* Only the address sits above the row link, not the cell. */}
                        <span className="relative z-10">
                          <ContractLink contract={contractRef(a)} />
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <ExternalAssetLink asset={a} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="tabular-nums">
              {current * PAGE_SIZE + 1}–{current * PAGE_SIZE + visible.length} of{' '}
              {filtered.length.toLocaleString('en-US')}
            </span>
            {pages > 1 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={current >= pages - 1}
                  onClick={() => setPage(current + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
