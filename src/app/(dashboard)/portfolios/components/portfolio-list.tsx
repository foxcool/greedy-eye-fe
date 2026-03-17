'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PortfolioForm } from './portfolio-form'
import {
  usePortfolios,
  useCreatePortfolio,
  useUpdatePortfolio,
  useDeletePortfolio,
} from '@/hooks/use-portfolios'
import type { Portfolio } from '@/lib/api/backend-types'
import { createPortfolio, createAccount, createHolding } from '@/lib/api/portfolio-api'
import { createAsset } from '@/lib/api/assets-api'
import { rawHoldings } from '@/lib/mocks/portfolio-data'
import { decimalToHolding } from '@/lib/api/backend-types'

async function importLocalData(onDone: () => void, setImporting: (v: boolean) => void) {
  setImporting(true)
  try {
    const portfolio = await createPortfolio('My Portfolio', 'Imported from local data')

    // Collect unique account names
    const accountNameToId = new Map<string, string>()
    for (const rh of rawHoldings) {
      for (const source of rh.sources) {
        if (!accountNameToId.has(source.name)) {
          const type =
            source.type === 'exchange'
              ? 'ACCOUNT_TYPE_EXCHANGE'
              : source.type === 'defi'
              ? 'ACCOUNT_TYPE_WALLET'
              : 'ACCOUNT_TYPE_WALLET'
          const acc = await createAccount({ name: source.name, type })
          accountNameToId.set(source.name, acc.id)
        }
      }
    }

    // Create assets and holdings
    for (const rh of rawHoldings) {
      try {
        await createAsset({
          id: rh.assetId,
          name: rh.name,
          symbol: rh.symbol,
          type: 'ASSET_TYPE_CRYPTOCURRENCY',
        })
      } catch {
        // Asset may already exist — ignore
      }

      for (const source of rh.sources) {
        if (source.amount <= 0) continue
        const accountId = accountNameToId.get(source.name)
        if (!accountId) continue
        await createHolding({
          amount: decimalToHolding(source.amount, 8),
          decimals: 8,
          assetId: rh.assetId,
          accountId,
          portfolioId: portfolio.id,
        })
      }
    }

    onDone()
  } finally {
    setImporting(false)
  }
}

export function PortfolioList() {
  const { data: portfolios = [], isLoading, error } = usePortfolios()
  const create = useCreatePortfolio()
  const update = useUpdatePortfolio()
  const remove = useDeletePortfolio()
  const qc = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Portfolio | null>(null)
  const [importing, setImporting] = useState(false)

  if (isLoading) return <p className="text-muted-foreground">Loading portfolios…</p>
  if (error) return <p className="text-destructive">Failed to load portfolios.</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Portfolios</h2>
        <Button onClick={() => setCreateOpen(true)}>New Portfolio</Button>
      </div>

      {portfolios.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">No portfolios yet.</p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => setCreateOpen(true)}>Create portfolio</Button>
            <Button
              variant="outline"
              disabled={importing}
              onClick={() =>
                importLocalData(
                  () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
                  setImporting
                )
              }
            >
              {importing ? 'Importing…' : 'Import from local data'}
            </Button>
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {portfolios.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <Link href={`/portfolios/${p.id}`} className="hover:underline text-foreground">
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.description ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(p.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/portfolios/${p.id}`}>Holdings</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditTarget(p)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => remove.mutate(p.id)}
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

      <PortfolioForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        isLoading={create.isPending}
        onSubmit={(values) =>
          create.mutate(values, { onSuccess: () => setCreateOpen(false) })
        }
      />

      <PortfolioForm
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
