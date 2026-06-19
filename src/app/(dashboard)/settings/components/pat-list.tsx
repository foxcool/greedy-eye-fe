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
import { usePATs, useCreatePAT, useRevokePAT } from '@/hooks/use-pats'
import { PatCreateDialog } from './pat-create-dialog'
import { PatCreatedPanel } from './pat-created-panel'

function formatUnix(seconds: number, neverLabel = 'Never'): string {
  if (!seconds) return neverLabel
  return new Date(seconds * 1000).toLocaleDateString()
}

export function PatList() {
  const { data: pats = [], isLoading, error } = usePATs()
  const create = useCreatePAT()
  const revoke = useRevokePAT()

  const [createOpen, setCreateOpen] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-foreground">Access tokens</h2>
          <p className="text-sm text-muted-foreground">
            Personal access tokens let external apps (e.g. the MCP server) reach your data.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>New token</Button>
      </div>

      {newToken && (
        <PatCreatedPanel token={newToken} onDismiss={() => setNewToken(null)} />
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading tokens…</p>
      ) : error ? (
        <p className="text-destructive">Failed to load tokens.</p>
      ) : pats.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No tokens yet. Create one to connect an external app.
          </p>
          <Button onClick={() => setCreateOpen(true)}>Create token</Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pats.map((pat) => (
              <TableRow key={pat.id}>
                <TableCell className="font-medium">{pat.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatUnix(pat.createdAt)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatUnix(pat.expiresAt)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatUnix(pat.lastUsedAt, '—')}
                </TableCell>
                <TableCell className="text-right">
                  {confirmRevoke === pat.id ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={revoke.isPending}
                        onClick={() =>
                          revoke.mutate(pat.id, { onSettled: () => setConfirmRevoke(null) })
                        }
                      >
                        {revoke.isPending ? 'Revoking…' : 'Confirm'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setConfirmRevoke(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmRevoke(pat.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PatCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isLoading={create.isPending}
        onSubmit={(values) =>
          create.mutate(values, {
            onSuccess: (created) => {
              setNewToken(created.token)
              setCreateOpen(false)
            },
          })
        }
      />
    </section>
  )
}
