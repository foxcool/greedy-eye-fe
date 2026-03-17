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
import type { Account, Asset, Holding } from '@/lib/api/backend-types'
import { holdingToDecimal, decimalToHolding } from '@/lib/api/backend-types'

const schema = z.object({
  assetId: z.string().min(1, 'Asset is required'),
  accountId: z.string().min(1, 'Account is required'),
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Must be a non-negative number'),
})

type FormValues = z.infer<typeof schema>

interface HoldingFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { assetId: string; accountId: string; amountRaw: string; decimals: number }) => void
  isLoading?: boolean
  initial?: Holding
  assets: Asset[]
  accounts: Account[]
  decimals?: number
}

const DEFAULT_DECIMALS = 8

export function HoldingForm({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  initial,
  assets,
  accounts,
  decimals = DEFAULT_DECIMALS,
}: HoldingFormProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      assetId: initial?.assetId ?? '',
      accountId: initial?.accountId ?? '',
      amount: initial ? String(holdingToDecimal(initial.amount, initial.decimals)) : '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        assetId: initial?.assetId ?? '',
        accountId: initial?.accountId ?? '',
        amount: initial ? String(holdingToDecimal(initial.amount, initial.decimals)) : '',
      })
    }
  }, [open, initial, reset])

  function submit(values: FormValues) {
    const assetDecimals = initial?.decimals ?? decimals
    onSubmit({
      assetId: values.assetId,
      accountId: values.accountId,
      amountRaw: decimalToHolding(parseFloat(values.amount), assetDecimals),
      decimals: assetDecimals,
    })
  }

  const assetId = watch('assetId')
  const accountId = watch('accountId')

  const selectedAsset = assets.find((a) => a.id === assetId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Holding' : 'Add Holding'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Asset</Label>
            <Select
              value={assetId}
              onValueChange={(v) => setValue('assetId', v)}
              disabled={!!initial}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select asset…" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.symbol ? `${a.symbol} — ` : ''}{a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assetId && <p className="text-sm text-destructive">{errors.assetId.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Account</Label>
            <Select
              value={accountId}
              onValueChange={(v) => setValue('accountId', v)}
              disabled={!!initial}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account…" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.accountId && <p className="text-sm text-destructive">{errors.accountId.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="holding-amount">
              Amount{selectedAsset?.symbol ? ` (${selectedAsset.symbol})` : ''}
            </Label>
            <Input
              id="holding-amount"
              {...register('amount')}
              placeholder="0.0"
              type="number"
              step="any"
              min="0"
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
