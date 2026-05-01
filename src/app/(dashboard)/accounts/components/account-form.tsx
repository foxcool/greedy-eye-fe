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
import { usePortfolios } from '@/hooks/use-portfolios'

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
  portfolioId: z.string().optional(),
  address: z.string().optional(),
  chain: z.string().optional(),
}).superRefine((values, ctx) => {
  if (values.type === 'ACCOUNT_TYPE_WALLET' && !values.address) {
    ctx.addIssue({ code: 'custom', path: ['address'], message: 'Address is required for wallet accounts' })
  }
})

type FormValues = z.infer<typeof schema>

interface AccountFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { name: string; type: AccountType; description?: string; data?: Record<string, string>; portfolioId?: string }) => void
  isLoading?: boolean
  initial?: Account
}

export function AccountForm({ open, onOpenChange, onSubmit, isLoading, initial }: AccountFormProps) {
  const { data: portfolios = [] } = usePortfolios()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      type: (initial?.type as FormValues['type'] | undefined) ?? 'ACCOUNT_TYPE_WALLET',
      description: initial?.description ?? '',
      portfolioId: initial?.portfolioId ?? '',
      address: initial?.data?.address ?? '',
      chain: initial?.data?.chain ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: initial?.name ?? '',
        type: (initial?.type as FormValues['type'] | undefined) ?? 'ACCOUNT_TYPE_WALLET',
        description: initial?.description ?? '',
        portfolioId: initial?.portfolioId ?? '',
        address: initial?.data?.address ?? '',
        chain: initial?.data?.chain ?? '',
      })
    }
  }, [open, initial, reset])

  const selectedType = watch('type')
  const selectedPortfolioId = watch('portfolioId')

  function handleSubmitValues(values: FormValues) {
    const data: Record<string, string> = {}
    if (values.type === 'ACCOUNT_TYPE_WALLET') {
      if (values.address) data.address = values.address
      if (values.chain) data.chain = values.chain
    }
    onSubmit({
      name: values.name,
      type: values.type,
      description: values.description,
      portfolioId: values.portfolioId || undefined,
      data: Object.keys(data).length > 0 ? data : undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Account' : 'New Account'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleSubmitValues)} className="space-y-4">
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
          {selectedType === 'ACCOUNT_TYPE_WALLET' && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Wallet credentials</p>
              <div className="space-y-1">
                <Label htmlFor="acc-address">Address</Label>
                <Input id="acc-address" {...register('address')} placeholder="0x… or bc1…" />
                {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="acc-chain">Chains</Label>
                <Input id="acc-chain" {...register('chain')} placeholder="auto-detect (leave blank)" />
                <p className="text-xs text-muted-foreground">
                  Leave blank to auto-detect active chains. Or specify manually: <code className="font-mono">eth,base,arbitrum</code>
                </p>
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label>Portfolio</Label>
            <Select
              value={selectedPortfolioId ?? ''}
              onValueChange={(v) => setValue('portfolioId', v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No portfolio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground">No portfolio</span>
                </SelectItem>
                {portfolios.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Holdings synced from this account will be assigned to this portfolio by default.
            </p>
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
