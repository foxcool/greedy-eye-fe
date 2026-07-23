'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AssetForm } from './asset-form'
import { QuarantineSection } from './quarantine-section'
import { VerdictBadge } from './verdict-badge'
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from '@/hooks/use-assets'
import { usePrices, coingeckoIdBySymbol } from '@/hooks/use-prices'
import { formatCurrency } from '@/lib/mocks'
import type { Asset } from '@/lib/api/backend-types'

const ASSET_TYPE_LABELS: Record<string, string> = {
  ASSET_TYPE_CRYPTOCURRENCY: 'Crypto',
  ASSET_TYPE_STOCK: 'Stock',
  ASSET_TYPE_BOND: 'Bond',
  ASSET_TYPE_COMMODITY: 'Commodity',
  ASSET_TYPE_FOREX: 'Forex',
  ASSET_TYPE_FUND: 'Fund',
}

function contractAddress(asset: Asset): string | undefined {
  return asset.tags
    ?.find((t) => t.startsWith('contract:'))
    ?.slice('contract:'.length)
}

/** External info page: CoinGecko for known tokens, Etherscan for contracts. */
function externalUrl(asset: Asset): string | undefined {
  const coingeckoId = asset.symbol && coingeckoIdBySymbol[asset.symbol.toUpperCase()]
  if (coingeckoId) return `https://www.coingecko.com/en/coins/${coingeckoId}`
  const contract = contractAddress(asset)
  if (contract) return `https://etherscan.io/token/${contract}`
  return undefined
}

export function AssetList() {
  const { data: assets = [], isLoading, error } = useAssets()
  const { data: priceResult } = usePrices()
  const create = useCreateAsset()
  const update = useUpdateAsset()
  const remove = useDeleteAsset()

  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Asset | null>(null)

  const filtered = assets.filter((a) => {
    const q = search.toLowerCase()
    return (
      a.id.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.symbol ?? '').toLowerCase().includes(q)
    )
  })

  if (isLoading) return <p className="text-muted-foreground">Loading assets…</p>
  if (error) return <p className="text-destructive">Failed to load assets.</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Assets</h2>
        <Button onClick={() => setCreateOpen(true)}>Add Asset</Button>
      </div>

      <QuarantineSection assets={assets} />

      <Input
        placeholder="Search by name, symbol, or ID…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">
            {search ? 'No assets match your search.' : 'No assets yet.'}
          </p>
          {!search && (
            <Button onClick={() => setCreateOpen(true)}>Add your first asset</Button>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Contract</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => {
              const url = externalUrl(a)
              const price = a.symbol
                ? priceResult?.prices[a.symbol.toUpperCase()]?.price
                : undefined
              const contract = contractAddress(a)
              return (
              <TableRow key={a.id} title={a.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-dotted underline-offset-2 hover:text-primary"
                      >
                        {a.symbol ?? '—'}
                      </a>
                    ) : (
                      a.symbol ?? '—'
                    )}
                    <VerdictBadge verdict={a.identityVerdict} source={a.verdictSource} />
                  </div>
                </TableCell>
                <TableCell>{a.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {ASSET_TYPE_LABELS[a.type] ?? a.type}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {price != null ? formatCurrency(price) : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm font-mono">
                  {contract ? (
                    <a
                      href={`https://etherscan.io/token/${contract}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary"
                    >
                      {contract.slice(0, 6)}…{contract.slice(-4)}
                    </a>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditTarget(a)}>
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => remove.mutate(a.id)}
                      disabled={remove.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <AssetForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        isLoading={create.isPending}
        onSubmit={(values) =>
          create.mutate(values, { onSuccess: () => setCreateOpen(false) })
        }
      />

      <AssetForm
        open={editTarget !== null}
        onOpenChange={(open) => { if (!open) setEditTarget(null) }}
        initial={editTarget ?? undefined}
        isLoading={update.isPending}
        onSubmit={(values) =>
          update.mutate(
            { ...values, id: editTarget!.id },
            { onSuccess: () => setEditTarget(null) }
          )
        }
      />
    </div>
  )
}
