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
import { AccountForm } from './account-form'
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from '@/hooks/use-accounts'
import type { Account } from '@/lib/api/backend-types'

const TYPE_LABELS: Record<string, string> = {
  ACCOUNT_TYPE_WALLET: 'Wallet',
  ACCOUNT_TYPE_EXCHANGE: 'Exchange',
  ACCOUNT_TYPE_BROKER: 'Broker',
  ACCOUNT_TYPE_BANK: 'Bank',
}

export function AccountList() {
  const { data: accounts = [], isLoading, error } = useAccounts()
  const create = useCreateAccount()
  const update = useUpdateAccount()
  const remove = useDeleteAccount()

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Account | null>(null)

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
                <TableCell className="text-muted-foreground">{a.description ?? '—'}</TableCell>
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
        isLoading={update.isPending}
        onSubmit={(values) =>
          update.mutate(
            { id: editTarget!.id, ...values },
            { onSuccess: () => setEditTarget(null) }
          )
        }
      />
    </div>
  )
}
