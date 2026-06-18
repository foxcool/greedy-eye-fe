'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PortfolioForm } from '../../components/portfolio-form'
import { useUpdatePortfolio, useDeletePortfolio } from '@/hooks/use-portfolios'
import type { Portfolio } from '@/lib/api/backend-types'

export function PortfolioSettings({ portfolio }: { portfolio: Portfolio }) {
  const router = useRouter()
  const update = useUpdatePortfolio()
  const remove = useDeletePortfolio()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="max-w-xl space-y-8">
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">Details</h3>
          <p className="text-sm text-muted-foreground">Name and description.</p>
        </div>
        <dl className="rounded-lg border border-border divide-y divide-border">
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-muted-foreground">Name</dt>
            <dd className="text-sm font-medium text-foreground">{portfolio.name}</dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-muted-foreground">Description</dt>
            <dd className="text-sm text-foreground">{portfolio.description || '—'}</dd>
          </div>
        </dl>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          Edit details
        </Button>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-destructive">Danger zone</h3>
          <p className="text-sm text-muted-foreground">
            Deleting a portfolio is permanent.
          </p>
        </div>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(portfolio.id, {
                  onSuccess: () => router.replace('/portfolios'),
                })
              }
            >
              {remove.isPending ? 'Deleting…' : 'Confirm delete'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
            Delete portfolio
          </Button>
        )}
      </section>

      <PortfolioForm
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={portfolio}
        isLoading={update.isPending}
        onSubmit={(values) =>
          update.mutate(
            { id: portfolio.id, ...values },
            { onSuccess: () => setEditOpen(false) }
          )
        }
      />
    </div>
  )
}
