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
import type { Account, AccountCapability, AccountType } from '@/lib/api/backend-types'
import { usePortfolios } from '@/hooks/use-portfolios'
import { useAuth } from '@/lib/auth/auth-context'

const ACCOUNT_TYPES: { value: AccountType; label: string; hint: string }[] = [
  { value: 'ACCOUNT_TYPE_WALLET', label: 'Wallet', hint: 'On-chain wallet (MetaMask, Ledger, etc.)' },
  { value: 'ACCOUNT_TYPE_EXCHANGE', label: 'Exchange', hint: 'Centralised exchange (Binance, Kraken, etc.)' },
  { value: 'ACCOUNT_TYPE_BROKER', label: 'Broker', hint: 'Stock broker (Interactive Brokers, etc.)' },
  { value: 'ACCOUNT_TYPE_BANK', label: 'Bank', hint: 'Bank account' },
  { value: 'ACCOUNT_TYPE_SERVICE', label: 'Service', hint: 'Data-provider API key (Moralis, CoinGecko, etc.)' },
]

// Mirrors the backend capability matrix (entity.ValidateCapabilities) —
// the backend rejects anything outside it, this just keeps the UI honest.
const ALLOWED_CAPABILITIES: Record<string, AccountCapability[]> = {
  ACCOUNT_TYPE_WALLET: ['portfolio_sync'],
  ACCOUNT_TYPE_EXCHANGE: ['portfolio_sync', 'trading', 'market_data'],
  ACCOUNT_TYPE_BROKER: ['portfolio_sync', 'trading', 'market_data'],
  ACCOUNT_TYPE_BANK: ['portfolio_sync'],
  ACCOUNT_TYPE_SERVICE: ['market_data', 'onchain_lookup'],
}

// Capabilities an admin may share system-wide (user-agnostic results only).
const SYSTEM_SCOPEABLE: AccountCapability[] = ['market_data', 'onchain_lookup']

const CAPABILITY_LABELS: Record<AccountCapability, string> = {
  portfolio_sync: 'Portfolio sync',
  trading: 'Trading',
  market_data: 'Market data',
  onchain_lookup: 'On-chain lookup',
}

// Account types whose credentials are a provider API key pair.
const KEYED_TYPES: AccountType[] = ['ACCOUNT_TYPE_EXCHANGE', 'ACCOUNT_TYPE_BROKER', 'ACCOUNT_TYPE_SERVICE']

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum([
    'ACCOUNT_TYPE_WALLET',
    'ACCOUNT_TYPE_EXCHANGE',
    'ACCOUNT_TYPE_BROKER',
    'ACCOUNT_TYPE_BANK',
    'ACCOUNT_TYPE_SERVICE',
  ] as const),
  description: z.string().max(300).optional(),
  portfolioId: z.string().optional(),
  address: z.string().optional(),
  chain: z.string().optional(),
  provider: z.string().max(50).optional(),
  apiKey: z.string().max(500).optional(),
  apiSecret: z.string().max(500).optional(),
  capabilities: z.array(z.enum(['portfolio_sync', 'trading', 'market_data', 'onchain_lookup'] as const)),
  // Constrained to SYSTEM_SCOPEABLE by the UI; typed wide to match Account.
  systemScopes: z.array(z.enum(['portfolio_sync', 'trading', 'market_data', 'onchain_lookup'] as const)),
}).superRefine((values, ctx) => {
  if (values.type === 'ACCOUNT_TYPE_WALLET' && !values.address) {
    ctx.addIssue({ code: 'custom', path: ['address'], message: 'Address is required for wallet accounts' })
  }
  if (KEYED_TYPES.includes(values.type) && values.apiKey && !values.provider) {
    ctx.addIssue({ code: 'custom', path: ['provider'], message: 'Provider is required when an API key is set' })
  }
})

type FormValues = z.infer<typeof schema>

export interface AccountFormResult {
  name: string
  type: AccountType
  description?: string
  data?: Record<string, string>
  portfolioId?: string
  capabilities: AccountCapability[]
  // Only meaningful for admins; ignored (and rejected by the backend) otherwise.
  systemScopes: AccountCapability[]
}

interface AccountFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: AccountFormResult) => void
  isLoading?: boolean
  initial?: Account
}

function initialValues(initial?: Account): FormValues {
  return {
    name: initial?.name ?? '',
    type: (initial?.type as FormValues['type'] | undefined) ?? 'ACCOUNT_TYPE_WALLET',
    description: initial?.description ?? '',
    portfolioId: initial?.portfolioId ?? '',
    address: initial?.data?.address ?? '',
    chain: initial?.data?.chain ?? '',
    provider: initial?.data?.provider ?? '',
    // Masked values ("••••1a2b") round-trip as is: the backend keeps the
    // stored secret when it sees the mask back.
    apiKey: initial?.data?.api_key ?? '',
    apiSecret: initial?.data?.api_secret ?? '',
    capabilities: initial?.capabilities ?? [],
    systemScopes: initial?.systemScopes ?? [],
  }
}

export function AccountForm({ open, onOpenChange, onSubmit, isLoading, initial }: AccountFormProps) {
  const { data: portfolios = [] } = usePortfolios()
  const { isAdmin } = useAuth()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues(initial),
  })

  useEffect(() => {
    if (open) reset(initialValues(initial))
  }, [open, initial, reset])

  const selectedType = watch('type')
  const selectedPortfolioId = watch('portfolioId')
  const capabilities = watch('capabilities')
  const systemScopes = watch('systemScopes')

  const allowedCaps = ALLOWED_CAPABILITIES[selectedType] ?? []
  const isKeyed = KEYED_TYPES.includes(selectedType)

  function setType(type: FormValues['type']) {
    setValue('type', type)
    // Prune selections the new type doesn't allow.
    const allowed = ALLOWED_CAPABILITIES[type] ?? []
    const caps = capabilities.filter((c) => allowed.includes(c))
    setValue('capabilities', caps)
    setValue('systemScopes', systemScopes.filter((s) => caps.includes(s)))
  }

  function toggleCapability(cap: AccountCapability, checked: boolean) {
    const next = checked ? [...capabilities, cap] : capabilities.filter((c) => c !== cap)
    setValue('capabilities', next)
    if (!checked) {
      setValue('systemScopes', systemScopes.filter((s) => s !== cap))
    }
  }

  function toggleScope(cap: AccountCapability, checked: boolean) {
    setValue('systemScopes', checked ? [...systemScopes, cap] : systemScopes.filter((s) => s !== cap))
  }

  function handleSubmitValues(values: FormValues) {
    const data: Record<string, string> = {}
    if (values.type === 'ACCOUNT_TYPE_WALLET') {
      if (values.address) data.address = values.address
      if (values.chain) data.chain = values.chain
    }
    if (KEYED_TYPES.includes(values.type)) {
      if (values.provider) data.provider = values.provider.trim().toLowerCase()
      if (values.apiKey) data.api_key = values.apiKey
      if (values.apiSecret) data.api_secret = values.apiSecret
    }
    onSubmit({
      name: values.name,
      type: values.type,
      description: values.description,
      portfolioId: values.portfolioId || undefined,
      data: Object.keys(data).length > 0 ? data : undefined,
      capabilities: values.capabilities,
      systemScopes: isAdmin ? values.systemScopes : [],
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
              onValueChange={(v) => setType(v as FormValues['type'])}
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
          {isKeyed && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Provider credentials</p>
              <div className="space-y-1">
                <Label htmlFor="acc-provider">Provider</Label>
                <Input id="acc-provider" {...register('provider')} placeholder="binance, moralis, coingecko, …" />
                {errors.provider && <p className="text-sm text-destructive">{errors.provider.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="acc-api-key">API key</Label>
                <Input id="acc-api-key" {...register('apiKey')} autoComplete="off" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="acc-api-secret">API secret</Label>
                <Input id="acc-api-secret" {...register('apiSecret')} autoComplete="off" placeholder="Optional" />
              </div>
              <p className="text-xs text-muted-foreground">
                Secrets are write-only: saved values show as <code className="font-mono">••••</code> + last 4.
                Leave the masked value untouched to keep the stored secret, or paste a new one to rotate it.
              </p>
            </div>
          )}
          {allowedCaps.length > 0 && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Capabilities</p>
              {allowedCaps.map((cap) => (
                <div key={cap} className="space-y-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={capabilities.includes(cap)}
                      onChange={(e) => toggleCapability(cap, e.target.checked)}
                    />
                    {CAPABILITY_LABELS[cap]}
                  </label>
                  {isAdmin && SYSTEM_SCOPEABLE.includes(cap) && capabilities.includes(cap) && (
                    <label className="ml-6 flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={systemScopes.includes(cap)}
                        onChange={(e) => toggleScope(cap, e.target.checked)}
                      />
                      Share system-wide (all users)
                    </label>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                What these credentials are allowed to do. Data-only capabilities can be shared system-wide by an admin.
              </p>
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
