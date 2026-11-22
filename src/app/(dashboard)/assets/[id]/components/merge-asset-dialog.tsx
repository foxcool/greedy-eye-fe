'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AssetPicker, assetIdentity, assetLabel } from '@/components/asset/asset-picker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useMergeAssets, usePlanMerge } from '@/hooks/use-assets'
import type { MergePlan } from '@/lib/api/assets-api'
import type { Asset } from '@/lib/api/backend-types'

/**
 * Folds this asset (the duplicate) into another one. Irreversible, so the
 * commit button exists only next to the plan the backend computed for exactly
 * this pair, and a refusal is shown in the backend's own words: it names what
 * has to be resolved first.
 */
export function MergeAssetDialog({
  source,
  open,
  onOpenChange,
}: {
  source: Asset
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [target, setTarget] = useState<Asset>()
  const plan = usePlanMerge(source, target)
  const merge = useMergeAssets()

  const close = (next: boolean) => {
    if (!next) {
      setTarget(undefined)
      merge.reset()
    }
    onOpenChange(next)
  }

  const commit = () => {
    if (!target) return
    merge.mutate(
      { source, target },
      { onSuccess: () => router.push(`/assets/${target.id}`) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge {assetLabel(source)} into…</DialogTitle>
          <DialogDescription>
            Everything that points at this asset ({assetIdentity(source)}) moves to the one you pick,
            and this asset is deleted for every user. It cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {target ? (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span>
              Into <strong>{assetLabel(target)}</strong>
              <span className="block text-xs text-muted-foreground">{assetIdentity(target)}</span>
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setTarget(undefined)}>
              Change
            </Button>
          </div>
        ) : (
          <AssetPicker
            aria-label="Search the asset to merge into"
            exclude={new Set([source.id])}
            showIdentity
            onSelect={setTarget}
          />
        )}

        {target && plan.isLoading && <p className="text-sm text-muted-foreground">Planning…</p>}
        {target && plan.error && (
          <p role="alert" className="text-sm text-destructive">
            Cannot merge: {plan.error.message}
          </p>
        )}
        {target && plan.data && <MergePlanList plan={plan.data} />}
        {merge.error && (
          <p role="alert" className="text-sm text-destructive">
            Merge failed: {merge.error.message}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!plan.data || merge.isPending}
            onClick={commit}
          >
            {merge.isPending ? 'Merging…' : 'Merge and delete this asset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// [field, said of one, said of several]
const PLAN_ROWS: [keyof Omit<MergePlan, 'dryRun'>, string, string][] = [
  ['holdingsMoved', 'holding moves', 'holdings move'],
  ['ledgerLegsMoved', 'ledger entry moves', 'ledger entries move'],
  ['pricesMoved', 'price moves', 'prices move'],
  ['pricesDropped', 'price is dropped (the target already has it)', 'prices are dropped (the target already has them)'],
  ['externalRefsMoved', 'contract or provider binding moves', 'contract and provider bindings move'],
  ['riskFlagsMoved', 'risk flag moves', 'risk flags move'],
  ['rulesRewritten', 'automation rule is repointed', 'automation rules are repointed'],
]

export function MergePlanList({ plan }: { plan: MergePlan }) {
  const rows = PLAN_ROWS.filter(([key]) => plan[key] > 0)
  if (rows.length === 0) {
    return <p className="text-sm">Nothing points at this asset; merging only deletes it.</p>
  }
  return (
    <ul aria-label="Merge plan" className="space-y-0.5 text-sm">
      {rows.map(([key, one, many]) => (
        <li key={key}>
          <span className="tabular-nums font-medium">{plan[key]}</span> {plan[key] === 1 ? one : many}
        </li>
      ))}
    </ul>
  )
}
