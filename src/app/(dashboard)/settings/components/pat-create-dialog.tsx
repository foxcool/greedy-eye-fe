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

const EXPIRY_OPTIONS = [
  { label: 'Never', days: 0 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
] as const

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  expiryDays: z.string(), // select value in days; "0" = never
})

type FormValues = z.infer<typeof schema>

// 0 days → never expires (unix 0); otherwise an absolute unix-seconds deadline.
// Module-level so the impure Date read stays out of the component render path.
function daysToExpiresAt(days: number): number {
  return days === 0 ? 0 : Math.floor(Date.now() / 1000) + days * 24 * 60 * 60
}

interface PatCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { name: string; expiresAt: number }) => void
  isLoading?: boolean
}

export function PatCreateDialog({ open, onOpenChange, onSubmit, isLoading }: PatCreateDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', expiryDays: '0' },
  })

  useEffect(() => {
    if (open) reset({ name: '', expiryDays: '0' })
  }, [open, reset])

  function submit(values: FormValues) {
    onSubmit({ name: values.name, expiresAt: daysToExpiresAt(Number(values.expiryDays)) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New access token</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="pat-name">Name</Label>
            <Input id="pat-name" {...register('name')} placeholder="MCP on my laptop" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="pat-expiry">Expiry</Label>
            <select
              id="pat-expiry"
              {...register('expiryDays')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {EXPIRY_OPTIONS.map((o) => (
                <option key={o.days} value={o.days}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
