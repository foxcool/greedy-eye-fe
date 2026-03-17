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
import type { Account, AccountType } from '@/lib/api/backend-types'

const ACCOUNT_TYPES: { value: AccountType; label: string; hint: string }[] = [
  { value: 'ACCOUNT_TYPE_WALLET', label: 'Wallet', hint: 'On-chain wallet (MetaMask, Ledger, etc.)' },
  { value: 'ACCOUNT_TYPE_EXCHANGE', label: 'Exchange', hint: 'Centralised exchange (Binance, Kraken, etc.)' },
  { value: 'ACCOUNT_TYPE_BROKER', label: 'Broker', hint: 'Stock broker (Interactive Brokers, etc.)' },
  { value: 'ACCOUNT_TYPE_BANK', label: 'Bank', hint: 'Bank account' },
]

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum([
    'ACCOUNT_TYPE_WALLET',
    'ACCOUNT_TYPE_EXCHANGE',
    'ACCOUNT_TYPE_BROKER',
    'ACCOUNT_TYPE_BANK',
  ] as const),
  description: z.string().max(300).optional(),
})

type FormValues = z.infer<typeof schema>

interface AccountFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { name: string; type: AccountType; description?: string }) => void
  isLoading?: boolean
  initial?: Account
}

export function AccountForm({ open, onOpenChange, onSubmit, isLoading, initial }: AccountFormProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      type: (initial?.type as FormValues['type'] | undefined) ?? 'ACCOUNT_TYPE_WALLET',
      description: initial?.description ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: initial?.name ?? '',
        type: (initial?.type as FormValues['type'] | undefined) ?? 'ACCOUNT_TYPE_WALLET',
        description: initial?.description ?? '',
      })
    }
  }, [open, initial, reset])

  const selectedType = watch('type')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Account' : 'New Account'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="acc-name">Name</Label>
            <Input id="acc-name" {...register('name')} placeholder="eth main, binance, …" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select
              value={selectedType}
              onValueChange={(v) => setValue('type', v as FormValues['type'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span>{t.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{t.hint}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="acc-desc">Description</Label>
            <Input id="acc-desc" {...register('description')} placeholder="Optional" />
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
