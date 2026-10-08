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
import { useAccounts, useAccountHealth, useCreateAccount, useUpdateAccount, useUpdateSystemScopes, useDeleteAccount, useSetAccountDisabled } from '@/hooks/use-accounts'
import { HealthCell, HealthNotice } from './account-health'
import { usePortfolios } from '@/hooks/use-portfolios'
import { useAuth } from '@/lib/auth/auth-context'
import { syncAccount } from '@/lib/api/portfolio-api'
import type { Account } from '@/lib/api/backend-types'
import { scopeSteps } from '@/lib/accounts/scope-steps'

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

// The types SyncAccount accepts. Manual is absent because those positions come
// from a human, and everything else has no syncer at all.
//
// Broker was missing here while the backend already synced it, so the only way
// to refresh a brokerage account was a direct RPC call — the capability was
// declared, the button was not there, and nothing said why (personal-c1nz).
const SYNCABLE_TYPES = ['ACCOUNT_TYPE_WALLET', 'ACCOUNT_TYPE_EXCHANGE', 'ACCOUNT_TYPE_BROKER']

export function AccountList() {
  const { data: accounts = [], isLoading, error } = useAccounts()
  const { data: portfolios = [] } = usePortfolios()
  const health = useAccountHealth()
  const { isAdmin } = useAuth()
  const create = useCreateAccount()
  const update = useUpdateAccount()
  const updateScopes = useUpdateSystemScopes()
  const remove = useDeleteAccount()
  const standDown = useSetAccountDisabled()

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

  // System scopes travel in their own admin-only RPC with an explicit update
  // mask, ordered around the account update by scopeSteps: a shared capability
  // being unticked used to fail, because the scope still named it.
  async function submitEdit(target: Account, values: AccountFormResult) {
    const { systemScopes, ...fields } = values
    const steps = isAdmin ? scopeSteps(target.systemScopes ?? [], systemScopes) : {}
    try {
      if (steps.before) await updateScopes.mutateAsync({ id: target.id, systemScopes: steps.before })
      await update.mutateAsync({ id: target.id, ...fields })
      if (steps.after) await updateScopes.mutateAsync({ id: target.id, systemScopes: steps.after })
      setEditTarget(null)
    } catch {
      // The global mutation toast reports it; the form stays open to retry.
    }
  }

  const portfolioById = Object.fromEntries(portfolios.map((p) => [p.id, p.name]))
  // A failed refetch keeps the last data; rows must not say OK while the
  // notice says health is unknown.
  const healthById = health.isError
    ? {}
    : Object.fromEntries((health.data?.accounts ?? []).map((h) => [h.accountId, h]))

  const queryClient = useQueryClient()
  const sync = useMutation({
    mutationFn: (id: string) => syncAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      // A sync can end a chain's run of failures or a sweep deferral.
      queryClient.invalidateQueries({ queryKey: ['accounts', 'health'] })
    },
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

      <HealthNotice data={health.data} failed={health.isError} />

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
              <TableHead>Health</TableHead>
              <TableHead>Capabilities</TableHead>
              <TableHead>Portfolio</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((a) => (
              <TableRow
                key={a.id}
                data-disabled={a.disabled ? 'true' : undefined}
                className={a.disabled ? 'opacity-60' : undefined}
              >
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-secondary text-secondary-foreground">
                    {TYPE_LABELS[a.type] ?? a.type}
                  </span>
                </TableCell>
                <TableCell>
                  <HealthCell health={healthById[a.id]} />
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
                    {SYNCABLE_TYPES.includes(a.type ?? '') && !a.disabled && (
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
                    {/* Manual accounts have nothing external to stand down; the
                        backend refuses the flag for them. */}
                    {a.type !== 'ACCOUNT_TYPE_MANUAL' && (
                      <Button
                        variant="outline"
                        size="sm"
                        title={a.disabled
                          ? 'Use this account again: syncs and price lookups resume'
                          : 'Stop using this account without deleting its key or positions'}
                        disabled={standDown.isPending && standDown.variables?.id === a.id}
                        onClick={() => standDown.mutate({ id: a.id, disabled: !a.disabled })}
                      >
                        {a.disabled ? 'Enable' : 'Disable'}
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
