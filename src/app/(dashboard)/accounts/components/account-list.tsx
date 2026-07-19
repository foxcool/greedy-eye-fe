'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AccountForm, type AccountFormResult } from './account-form'
import { useAccounts, useCreateAccount, useUpdateAccount, useUpdateSystemScopes, useDeleteAccount } from '@/hooks/use-accounts'
import { usePortfolios } from '@/hooks/use-portfolios'
import { useAuth } from '@/lib/auth/auth-context'
import { syncAccount } from '@/lib/api/portfolio-api'
import type { Account } from '@/lib/api/backend-types'

const TYPE_LABELS: Record<string, string> = {
  ACCOUNT_TYPE_WALLET: 'Wallet',
  ACCOUNT_TYPE_EXCHANGE: 'Exchange',
  ACCOUNT_TYPE_BROKER: 'Broker',
  ACCOUNT_TYPE_BANK: 'Bank',
  ACCOUNT_TYPE_SERVICE: 'Service',
  ACCOUNT_TYPE_MANUAL: 'Manual',
}

const CAPABILITY_BADGES: Record<string, string> = {
  portfolio_sync: 'sync',
  trading: 'trading',
  market_data: 'market data',
  onchain_lookup: 'on-chain',
  manual_positions: 'manual',
}

function scopesEqual(a: string[] = [], b: string[] = []): boolean {
  return a.length === b.length && a.every((x) => b.includes(x))
}

export function AccountList() {
  const { data: accounts = [], isLoading, error } = useAccounts()
  const { data: portfolios = [] } = usePortfolios()
  const { isAdmin } = useAuth()
  const create = useCreateAccount()
  const update = useUpdateAccount()
  const updateScopes = useUpdateSystemScopes()
  const remove = useDeleteAccount()

  // Deleting is two-stage on purpose. The first attempt leaves positions
  // alone; only if the backend refuses because they exist do we name how many
  // and ask again with cascade. Transaction history is never deletable this
  // way, so that refusal is passed through as-is.
  function handleDelete(account: Account) {
    if (!window.confirm(`Delete account "${account.name}"? This cannot be undone.`)) return

    remove.mutate(
      { id: account.id },
      {
        onError: (error) => {
          const message = error instanceof Error ? error.message : ''
          const positions = message.match(/holds (\d+) position/)
          if (!positions) return // not about positions — the global toast reports it

          if (window.confirm(`"${account.name}" holds ${positions[1]} position(s). Delete them too?`)) {
            remove.mutate({ id: account.id, cascade: true })
          }
        },
      }
    )
  }

  function submitEdit(target: Account, values: AccountFormResult) {
    const { systemScopes, ...fields } = values
    update.mutate(
      { id: target.id, ...fields },
      {
        onSuccess: () => {
          // System scopes travel in their own admin-only RPC with an explicit
          // update mask; only fire it when the toggles actually changed.
          if (isAdmin && !scopesEqual(systemScopes, target.systemScopes)) {
            updateScopes.mutate({ id: target.id, systemScopes })
          }
          setEditTarget(null)
        },
      }
    )
  }

  const portfolioById = Object.fromEntries(portfolios.map((p) => [p.id, p.name]))

  const queryClient = useQueryClient()
  const sync = useMutation({
    mutationFn: (id: string) => syncAccount(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holdings'] }),
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Account | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  if (isLoading) return <p className="text-muted-foreground">Loading accounts…</p>
  if (error) return <p className="text-destructive">Failed to load accounts.</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Accounts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Wallets, exchanges, and brokers where you hold assets
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Add Account</Button>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">No accounts yet.</p>
          <Button onClick={() => setCreateOpen(true)}>Add your first account</Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capabilities</TableHead>
              <TableHead>Portfolio</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-secondary text-secondary-foreground">
                    {TYPE_LABELS[a.type] ?? a.type}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(a.capabilities ?? []).map((cap) => {
                      const shared = a.systemScopes?.includes(cap)
                      return (
                        <span
                          key={cap}
                          title={shared ? 'Shared system-wide by an admin' : undefined}
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                            shared
                              ? 'bg-primary/15 text-primary'
                              : 'bg-secondary text-secondary-foreground'
                          }`}
                        >
                          {CAPABILITY_BADGES[cap] ?? cap}
                          {shared && ' ⁂'}
                        </span>
                      )
                    })}
                    {(a.capabilities ?? []).length === 0 && <span className="text-muted-foreground">—</span>}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {a.portfolioId ? portfolioById[a.portfolioId] ?? '—' : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">{a.description ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {(a.type === 'ACCOUNT_TYPE_WALLET' || a.type === 'ACCOUNT_TYPE_EXCHANGE') && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={sync.isPending && syncingId === a.id}
                        onClick={() => {
                          setSyncingId(a.id)
                          sync.mutate(a.id, { onSettled: () => setSyncingId(null) })
                        }}
                      >
                        {sync.isPending && syncingId === a.id ? 'Syncing…' : 'Sync'}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setEditTarget(a)}>
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(a)}
                      disabled={remove.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AccountForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        isLoading={create.isPending}
        onSubmit={(values) =>
          create.mutate(values, { onSuccess: () => setCreateOpen(false) })
        }
      />

      <AccountForm
        open={editTarget !== null}
        onOpenChange={(open) => { if (!open) setEditTarget(null) }}
        initial={editTarget ?? undefined}
        isLoading={update.isPending || updateScopes.isPending}
        onSubmit={(values) => submitEdit(editTarget!, values)}
      />
    </div>
  )
}
