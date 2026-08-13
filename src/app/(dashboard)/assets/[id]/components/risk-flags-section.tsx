'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/auth-context'
import { useAddAssetRiskFlag, useDeleteAssetRiskFlag } from '@/hooks/use-assets'
import type { Asset, RiskActionHint, RiskFlagKind } from '@/lib/api/backend-types'
import { EmptyPanel, Section } from './section'
import {
  RiskFlagForm,
  RISK_ACTION_HINT_LABELS,
  RISK_FLAG_KIND_LABELS,
  type RiskFlagFormValues,
} from './risk-flag-form'

/**
 * Risk-model axis 2: something true about a REAL asset's situation.
 *
 * INVARIANT: a risk flag must never reach holdings.excluded. The verdict above
 * subtracts from the total because a fake asset is not money; the exclude toggle
 * on a position subtracts because its owner decided so; a risk flag does
 * neither — a bond frozen in Euroclear is still yours. The backend states the
 * same rule on AddAssetRiskFlag and pins it with an integration test.
 *
 * That invariant is kept structurally, not by discipline: this file does not
 * import useUpdateHolding or useHoldingsQuery and never receives a holding. It
 * is not wired to a position at all.
 */
export function RiskFlagsSection({ asset }: { asset: Asset }) {
  const { isAdmin } = useAuth()
  const add = useAddAssetRiskFlag()
  const remove = useDeleteAssetRiskFlag()
  const [formOpen, setFormOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const flags = asset.riskFlags ?? []
  // Read the clock once, in a lazy initialiser: calling Date.now() in render
  // makes the render impure, and "overdue" only has to be decided when the
  // section mounts — a flag does not expire while someone is looking at it.
  const [now] = useState(() => Date.now())

  const submit = (values: RiskFlagFormValues) => {
    add.mutate(
      {
        assetId: asset.id,
        kind: values.kind as RiskFlagKind,
        note: values.note?.trim() || undefined,
        actionHint: values.actionHint as RiskActionHint,
        // The input gives local time with no zone, which is what the person
        // meant. Convert to UTC exactly once, here.
        reviewAt: new Date(values.reviewAt).toISOString(),
      },
      { onSuccess: () => setFormOpen(false) }
    )
  }

  return (
    <Section
      title="Risk flags"
      description="A risk flag records something true about a real asset. It never changes your total — that is the verdict above, or the exclude toggle on a position."
      action={
        isAdmin ? (
          <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
            Add flag
          </Button>
        ) : undefined
      }
    >
      {flags.length === 0 ? (
        <EmptyPanel>No risk flags on this asset.</EmptyPanel>
      ) : (
        <div className="space-y-2">
          {flags.map((f) => {
            const overdue = Date.parse(f.reviewAt) < now
            return (
              <div key={f.id} className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {RISK_FLAG_KIND_LABELS[f.kind] ?? f.kind}
                      </span>
                      {f.actionHint && f.actionHint !== 'none' && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {RISK_ACTION_HINT_LABELS[f.actionHint] ?? f.actionHint}
                        </span>
                      )}
                      {/* Overdue is marked, never hidden. Hiding an expired flag
                          is the graveyard review_at exists to prevent. */}
                      {overdue && (
                        <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs text-yellow-700 ring-1 ring-inset ring-yellow-500/30 dark:text-yellow-400">
                          overdue review
                        </span>
                      )}
                    </div>
                    {f.note && <p className="text-sm text-muted-foreground">{f.note}</p>}
                    <p className="text-xs text-muted-foreground">
                      Review by {new Date(f.reviewAt).toLocaleDateString()}
                      {f.setBy && ` · ${f.setBy}`}
                    </p>
                  </div>

                  {isAdmin &&
                    (confirmId === f.id ? (
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={remove.isPending}
                          onClick={() =>
                            remove.mutate(
                              { assetId: asset.id, id: f.id },
                              { onSuccess: () => setConfirmId(null) }
                            )
                          }
                        >
                          Confirm
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setConfirmId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setConfirmId(f.id)}>
                        Remove
                      </Button>
                    ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isAdmin && (
        <RiskFlagForm
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={submit}
          isLoading={add.isPending}
        />
      )}
    </Section>
  )
}
