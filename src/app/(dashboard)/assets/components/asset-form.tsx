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
import type { Asset } from '@/lib/api/backend-types'

const FORM_ASSET_TYPES = [
  'ASSET_TYPE_CRYPTOCURRENCY',
  'ASSET_TYPE_STOCK',
  'ASSET_TYPE_BOND',
  'ASSET_TYPE_COMMODITY',
  'ASSET_TYPE_FOREX',
  'ASSET_TYPE_FUND',
] as const

type FormAssetType = typeof FORM_ASSET_TYPES[number]

const ASSET_TYPE_LABELS: Record<FormAssetType, string> = {
  ASSET_TYPE_CRYPTOCURRENCY: 'Crypto',
  ASSET_TYPE_STOCK: 'Stock',
  ASSET_TYPE_BOND: 'Bond',
  ASSET_TYPE_COMMODITY: 'Commodity',
  ASSET_TYPE_FOREX: 'Forex',
  ASSET_TYPE_FUND: 'Fund',
}

const schema = z.object({
  id: z.string().min(1, 'ID is required').max(100).regex(/^[a-z0-9-]+$/, 'Lowercase, digits, hyphens only'),
  name: z.string().min(1, 'Name is required').max(100),
  symbol: z.string().max(20).optional(),
  type: z.enum(FORM_ASSET_TYPES),
  tags: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface AssetFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { id: string; name: string; type: FormAssetType; symbol?: string; tags: string[] }) => void
  isLoading?: boolean
  initial?: Asset
}

export function AssetForm({ open, onOpenChange, onSubmit, isLoading, initial }: AssetFormProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: initial?.id ?? '',
      name: initial?.name ?? '',
      symbol: initial?.symbol ?? '',
      type: FORM_ASSET_TYPES.includes(initial?.type as FormAssetType)
        ? (initial!.type as FormAssetType)
        : 'ASSET_TYPE_CRYPTOCURRENCY',
      tags: initial?.tags?.join(', ') ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        id: initial?.id ?? '',
        name: initial?.name ?? '',
        symbol: initial?.symbol ?? '',
        type: FORM_ASSET_TYPES.includes(initial?.type as FormAssetType)
          ? (initial!.type as FormAssetType)
          : 'ASSET_TYPE_CRYPTOCURRENCY',
        tags: initial?.tags?.join(', ') ?? '',
      })
    }
  }, [open, initial, reset])

  function submit(values: FormValues) {
    const tags = values.tags
      ? values.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : []
    onSubmit({ id: values.id, name: values.name, type: values.type, symbol: values.symbol, tags })
  }

  const selectedType = watch('type')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Asset' : 'New Asset'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="asset-id">ID (CoinGecko slug)</Label>
            <Input
              id="asset-id"
              {...register('id')}
              placeholder="bitcoin"
              disabled={!!initial}
            />
            {errors.id && <p className="text-sm text-destructive">{errors.id.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="asset-name">Name</Label>
            <Input id="asset-name" {...register('name')} placeholder="Bitcoin" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="asset-symbol">Symbol</Label>
            <Input id="asset-symbol" {...register('symbol')} placeholder="BTC" />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select
              value={selectedType}
              onValueChange={(v) => setValue('type', v as FormAssetType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORM_ASSET_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{ASSET_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="asset-tags">Tags (comma-separated)</Label>
            <Input id="asset-tags" {...register('tags')} placeholder="defi, layer1" />
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
