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
import { useHoldingsQuery, useCreateHolding, useUpdateHolding, useDeleteHolding } from '@/hooks/use-holdings'
import { useAccounts } from '@/hooks/use-accounts'
import { useAssets } from '@/hooks/use-assets'
import { holdingToDecimal } from '@/lib/api/backend-types'
import type { Account, Holding } from '@/lib/api/backend-types'

interface HoldingsManagerProps {
  portfolioId: string
}

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  ACCOUNT_TYPE_WALLET: 'Wallet',
  ACCOUNT_TYPE_EXCHANGE: 'Exchange',
  ACCOUNT_TYPE_BROKER: 'Broker',
  ACCOUNT_TYPE_BANK: 'Bank',
  ACCOUNT_TYPE_MANUAL: 'Manual',
}

function AccountGroup({
  account,
  holdings,
  assetMap,
  onExclude,
  onEdit,
  onDelete,
  isPending,
}: {
  account: Account
  holdings: Holding[]
  assetMap: Map<string, { symbol?: string; name: string }>
  onExclude: (h: Holding) => void
  onEdit: (h: Holding) => void
  onDelete: (h: Holding) => void
  isPending: boolean
}) {
  const included = holdings.filter((h) => !h.excluded)
  const excluded = holdings.filter((h) => h.excluded)
  const typeLabel = ACCOUNT_TYPE_LABEL[account.type] ?? account.type

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Account header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{account.name}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {typeLabel}
          </span>
          {account.data?.address && (
            <span className="text-xs text-muted-foreground font-mono truncate max-w-[14ch]" title={account.data.address}>
              {account.data.address.slice(0, 6)}…{account.data.address.slice(-4)}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {included.length} asset{included.length !== 1 ? 's' : ''}
          {excluded.length > 0 && `, ${excluded.length} excluded`}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((h) => {
            const asset = assetMap.get(h.assetId)
            const amount = holdingToDecimal(h.amount, h.decimals)
            return (
              <TableRow key={h.id} className={h.excluded ? 'opacity-40' : undefined}>
                <TableCell>
                  <span className="font-medium">{asset?.symbol ?? h.assetId}</span>
                  {asset?.name && (
                    <span className="ml-1 text-xs text-muted-foreground">{asset.name}</span>
                  )}
                  {h.excluded && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-destructive font-semibold">excluded</span>
                  )}
                  {h.source === 'PROVENANCE_SOURCE_MANUAL' && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">manual</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {amount.toLocaleString('en-US', { maximumFractionDigits: 8 })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onExclude(h)}
                      disabled={isPending}
                    >
                      {h.excluded ? 'Include' : 'Exclude'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onEdit(h)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(h)}
                      disabled={isPending}
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
    </div>
  )
}

export function HoldingsManager({ portfolioId }: HoldingsManagerProps) {
  const { data: holdings = [], isLoading: holdingsLoading } = useHoldingsQuery({ portfolioId })
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts()
  const { data: assets = [], isLoading: assetsLoading } = useAssets()
  const create = useCreateHolding()
  const update = useUpdateHolding()
  const remove = useDeleteHolding()

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Holding | null>(null)

  const isLoading = holdingsLoading || accountsLoading || assetsLoading

  const assetMap = new Map(assets.map((a) => [a.id, { symbol: a.symbol, name: a.name }]))

  // Group holdings by accountId, preserving account order from accounts list
  const groups = accounts
    .map((acc) => ({
      account: acc,
      holdings: holdings.filter((h) => h.accountId === acc.id),
    }))
    .filter((g) => g.holdings.length > 0)

  // Holdings with unknown accounts (shouldn't happen, but safe fallback)
  const knownAccountIds = new Set(accounts.map((a) => a.id))
  const orphaned = holdings.filter((h) => !knownAccountIds.has(h.accountId))

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
        <div className="space-y-4">
          {groups.map(({ account, holdings: groupHoldings }) => (
            <AccountGroup
              key={account.id}
              account={account}
              holdings={groupHoldings}
              assetMap={assetMap}
              isPending={update.isPending || remove.isPending}
              onExclude={(h) => update.mutate({ id: h.id, excluded: !h.excluded })}
              onEdit={(h) => setEditTarget(h)}
              onDelete={(h) => {
                const asset = assetMap.get(h.assetId)
                if (window.confirm(`Delete ${asset?.symbol ?? 'this'} holding? This cannot be undone.`)) {
                  remove.mutate(h.id)
                }
              }}
            />
          ))}
          {orphaned.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/40 border-b border-border text-sm text-muted-foreground">
                Unknown account
              </div>
              <Table>
                <TableBody>
                  {orphaned.map((h) => {
                    const asset = assetMap.get(h.assetId)
                    return (
                      <TableRow key={h.id}>
                        <TableCell>{asset?.symbol ?? h.assetId}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {holdingToDecimal(h.amount, h.decimals).toLocaleString('en-US', { maximumFractionDigits: 8 })}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
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
