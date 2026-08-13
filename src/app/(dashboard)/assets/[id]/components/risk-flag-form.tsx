'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RiskActionHint, RiskFlagKind } from '@/lib/api/backend-types'

export const RISK_FLAG_KIND_LABELS: Record<RiskFlagKind, string> = {
  exploit: 'Exploit',
  depeg: 'Depeg',
  frozen_transfers: 'Frozen transfers',
  deprecation: 'Deprecation',
  delisting: 'Delisting',
  sanctions_freeze: 'Sanctions freeze',
}

export const RISK_ACTION_HINT_LABELS: Record<RiskActionHint, string> = {
  none: 'No action',
  hold: 'Hold',
  exit_soon: 'Exit soon',
}

const schema = z.object({
  kind: z.enum([
    'exploit',
    'depeg',
    'frozen_transfers',
    'deprecation',
    'delisting',
    'sanctions_freeze',
  ]),
  note: z.string().max(500).optional(),
  actionHint: z.enum(['none', 'hold', 'exit_soon']),
  reviewAt: z
    .string()
    .min(1, 'A review date is required')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Not a valid date')
    // The backend only requires the field to be present. Requiring it to be in
    // the future is this form's decision: a flag born already expired is the
    // exact noise review_at was introduced to prevent.
    .refine((v) => Date.parse(v) > Date.now(), 'The review date must be in the future'),
})

export type RiskFlagFormValues = z.infer<typeof schema>

/**
 * Format a Date for <input type="datetime-local">, which expects LOCAL time with
 * no zone. Hand-rolled on purpose: toISOString().slice(0,16) is UTC and would
 * show a reader in Moscow a time three hours off what they meant.
 */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultReviewAt(): string {
  const d = new Date()
  d.setDate(d.getDate() + 90)
  return toLocalInput(d)
}

export function RiskFlagForm({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: RiskFlagFormValues) => void
  isLoading?: boolean
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RiskFlagFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { kind: 'exploit', actionHint: 'none', note: '', reviewAt: defaultReviewAt() },
  })

  useEffect(() => {
    if (open) {
      reset({ kind: 'exploit', actionHint: 'none', note: '', reviewAt: defaultReviewAt() })
    }
  }, [open, reset])

  const kind = watch('kind')
  const actionHint = watch('actionHint')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add risk flag</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="kind">Kind</Label>
            <Select value={kind} onValueChange={(v) => setValue('kind', v as RiskFlagKind)}>
              <SelectTrigger id="kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RISK_FLAG_KIND_LABELS) as RiskFlagKind[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {RISK_FLAG_KIND_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="note">Note</Label>
            <Input id="note" placeholder="What happened, and where it was reported" {...register('note')} />
            {errors.note && <p className="text-sm text-destructive">{errors.note.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="actionHint">Action</Label>
            <Select
              value={actionHint}
              onValueChange={(v) => setValue('actionHint', v as RiskActionHint)}
            >
              <SelectTrigger id="actionHint">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RISK_ACTION_HINT_LABELS) as RiskActionHint[]).map((a) => (
                  <SelectItem key={a} value={a}>
                    {RISK_ACTION_HINT_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="reviewAt">Review by</Label>
            <Input
              id="reviewAt"
              type="datetime-local"
              min={toLocalInput(new Date())}
              {...register('reviewAt')}
            />
            <p className="text-xs text-muted-foreground">
              When to look at this again. Required — a flag that never expires stops being read.
            </p>
            {errors.reviewAt && (
              <p className="text-sm text-destructive">{errors.reviewAt.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving…' : 'Add flag'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
