'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { HoldingForm } from './holding-form'
import { useHoldingsQuery, useCreateHolding, useUpdateHolding } from '@/hooks/use-holdings'
import { useAccounts } from '@/hooks/use-accounts'
import { useAssets } from '@/hooks/use-assets'
import { holdingToDecimal } from '@/lib/api/backend-types'
import type { Holding } from '@/lib/api/backend-types'

interface HoldingsManagerProps {
  portfolioId: string
}

export function HoldingsManager({ portfolioId }: HoldingsManagerProps) {
  const { data: holdings = [], isLoading: holdingsLoading } = useHoldingsQuery({ portfolioId })
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts()
  const { data: assets = [], isLoading: assetsLoading } = useAssets()
  const create = useCreateHolding()
  const update = useUpdateHolding()

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Holding | null>(null)

  const isLoading = holdingsLoading || accountsLoading || assetsLoading

  const accountMap = new Map(accounts.map((a) => [a.id, a]))
  const assetMap = new Map(assets.map((a) => [a.id, a]))

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading holdings…</p>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Holdings</h3>
        <Button size="sm" onClick={() => setAddOpen(true)}>Add Holding</Button>
      </div>

      {holdings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground text-sm mb-3">No holdings yet.</p>
          <Button size="sm" onClick={() => setAddOpen(true)}>Add first holding</Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((h) => {
              const asset = assetMap.get(h.assetId)
              const account = accountMap.get(h.accountId)
              const amount = holdingToDecimal(h.amount, h.decimals)
              return (
                <TableRow key={h.id}>
                  <TableCell>
                    <span className="font-medium">{asset?.symbol ?? h.assetId}</span>
                    {asset?.name && (
                      <span className="ml-1 text-xs text-muted-foreground">{asset.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {account?.name ?? h.accountId}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {amount.toLocaleString('en-US', { maximumFractionDigits: 8 })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditTarget(h)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <HoldingForm
        open={addOpen}
        onOpenChange={setAddOpen}
        isLoading={create.isPending}
        assets={assets}
        accounts={accounts}
        onSubmit={({ assetId, accountId, amountRaw, decimals }) =>
          create.mutate(
            { amount: amountRaw, decimals, assetId, accountId, portfolioId },
            { onSuccess: () => setAddOpen(false) }
          )
        }
      />

      <HoldingForm
        open={editTarget !== null}
        onOpenChange={(open) => { if (!open) setEditTarget(null) }}
        initial={editTarget ?? undefined}
        isLoading={update.isPending}
        assets={assets}
        accounts={accounts}
        onSubmit={({ amountRaw, decimals }) =>
          update.mutate(
            { id: editTarget!.id, amount: amountRaw, decimals },
            { onSuccess: () => setEditTarget(null) }
          )
        }
      />
    </div>
  )
}
