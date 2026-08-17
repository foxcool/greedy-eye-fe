'use client'

import { useEffect, useMemo } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Account, AccountCapability, AccountType, Provider, ProviderTier } from '@/lib/api/backend-types'
import { usePortfolios } from '@/hooks/use-portfolios'
import { useProviders } from '@/hooks/use-providers'
import { mergeAccountData } from '@/lib/accounts/account-data'
import { useAuth } from '@/lib/auth/auth-context'

const ACCOUNT_TYPES: { value: AccountType; label: string; hint: string }[] = [
  { value: 'ACCOUNT_TYPE_WALLET', label: 'Wallet', hint: 'On-chain wallet (MetaMask, Ledger, etc.)' },
  { value: 'ACCOUNT_TYPE_EXCHANGE', label: 'Exchange', hint: 'Centralised exchange (Binance, Kraken, etc.)' },
  { value: 'ACCOUNT_TYPE_BROKER', label: 'Broker', hint: 'Stock broker (Interactive Brokers, etc.)' },
  { value: 'ACCOUNT_TYPE_BANK', label: 'Bank', hint: 'Bank account' },
  { value: 'ACCOUNT_TYPE_SERVICE', label: 'Service', hint: 'Data-provider API key (Moralis, CoinGecko, etc.)' },
  { value: 'ACCOUNT_TYPE_MANUAL', label: 'Manual', hint: 'Positions entered by hand or imported — no connector' },
]

// Mirrors the backend capability matrix (entity.ValidateCapabilities) —
// the backend rejects anything outside it, this just keeps the UI honest.
const ALLOWED_CAPABILITIES: Record<string, AccountCapability[]> = {
  ACCOUNT_TYPE_WALLET: ['portfolio_sync'],
  ACCOUNT_TYPE_EXCHANGE: ['portfolio_sync', 'trading', 'market_data'],
  ACCOUNT_TYPE_BROKER: ['portfolio_sync', 'trading', 'market_data'],
  ACCOUNT_TYPE_BANK: ['portfolio_sync'],
  ACCOUNT_TYPE_SERVICE: ['market_data', 'onchain_lookup'],
  ACCOUNT_TYPE_MANUAL: ['manual_positions'],
}

// Capabilities an admin may share system-wide (user-agnostic results only).
const SYSTEM_SCOPEABLE: AccountCapability[] = ['market_data', 'onchain_lookup']

const CAPABILITY_LABELS: Record<AccountCapability, string> = {
  portfolio_sync: 'Portfolio sync',
  trading: 'Trading',
  market_data: 'Market data',
  onchain_lookup: 'On-chain lookup',
  manual_positions: 'Manual positions',
}

// Account types whose credentials are a provider API key pair.
const KEYED_TYPES: AccountType[] = ['ACCOUNT_TYPE_EXCHANGE', 'ACCOUNT_TYPE_BROKER', 'ACCOUNT_TYPE_SERVICE']

// Sentinel for "no provider chosen": a Select cannot hold an empty string.
const NO_PROVIDER = '__none__'
// Sentinel for a slug the catalogue does not list — an older backend, or an
// account created before this provider existed. It stays editable by hand so
// the catalogue can never make an existing account uneditable.
const CUSTOM_PROVIDER = '__custom__'
// Sentinel for the provider's free keyed plan, whose real value is "".
const DEFAULT_TIER = '__default__'

// data keys this form owns. Everything else in accounts.data is carried through
// untouched on save — see mergeAccountData.
const BUDGET_KEYS = ['tier', 'quota', 'period', 'rps', 'burst'] as const

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum([
    'ACCOUNT_TYPE_WALLET',
    'ACCOUNT_TYPE_EXCHANGE',
    'ACCOUNT_TYPE_BROKER',
    'ACCOUNT_TYPE_BANK',
    'ACCOUNT_TYPE_SERVICE',
    'ACCOUNT_TYPE_MANUAL',
  ] as const),
  description: z.string().max(300).optional(),
  portfolioId: z.string().optional(),
  address: z.string().optional(),
  chain: z.string().optional(),
  provider: z.string().max(50).optional(),
  apiKey: z.string().max(500).optional(),
  apiSecret: z.string().max(500).optional(),
  tier: z.string().max(50).optional(),
  quota: z.string().max(20).optional(),
  period: z.string().max(10).optional(),
  rps: z.string().max(20).optional(),
  burst: z.string().max(20).optional(),
  // Extra data keys the chosen provider declares (e.g. root_ca), keyed by name.
  extras: z.record(z.string(), z.string()).optional(),
  capabilities: z.array(z.enum(['portfolio_sync', 'trading', 'market_data', 'onchain_lookup', 'manual_positions'] as const)),
  // Constrained to SYSTEM_SCOPEABLE by the UI; typed wide to match Account.
  systemScopes: z.array(z.enum(['portfolio_sync', 'trading', 'market_data', 'onchain_lookup', 'manual_positions'] as const)),
}).superRefine((values, ctx) => {
  if (values.type === 'ACCOUNT_TYPE_WALLET' && !values.address) {
    ctx.addIssue({ code: 'custom', path: ['address'], message: 'Address is required for wallet accounts' })
  }
  if (KEYED_TYPES.includes(values.type) && values.apiKey && !values.provider) {
    ctx.addIssue({ code: 'custom', path: ['provider'], message: 'Provider is required when an API key is set' })
  }
  // A quota with no period never resets: the backend drops it with a warning
  // in a log nobody reads, and the provider goes quiet once the allowance is
  // spent. Caught here, where the person who typed it is still looking.
  if (values.quota && !values.period) {
    ctx.addIssue({ code: 'custom', path: ['period'], message: 'A quota needs a period, or it never resets' })
  }
  for (const key of ['quota', 'burst'] as const) {
    const raw = values[key]
    if (raw && !/^\d+$/.test(raw.trim())) {
      ctx.addIssue({ code: 'custom', path: [key], message: 'Whole number, or leave blank' })
    }
  }
  if (values.rps && !/^\d+(\.\d+)?$/.test(values.rps.trim())) {
    ctx.addIssue({ code: 'custom', path: ['rps'], message: 'Number, or leave blank' })
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
  const data = initial?.data ?? {}
  return {
    name: initial?.name ?? '',
    type: (initial?.type as FormValues['type'] | undefined) ?? 'ACCOUNT_TYPE_WALLET',
    description: initial?.description ?? '',
    portfolioId: initial?.portfolioId ?? '',
    address: data.address ?? '',
    chain: data.chain ?? '',
    provider: data.provider ?? '',
    // Masked values ("••••1a2b") round-trip as is: the backend keeps the
    // stored secret when it sees the mask back.
    apiKey: data.api_key ?? '',
    apiSecret: data.api_secret ?? '',
    tier: data.tier ?? '',
    quota: data.quota ?? '',
    period: data.period ?? '',
    rps: data.rps ?? '',
    burst: data.burst ?? '',
    extras: {},
    capabilities: initial?.capabilities ?? [],
    systemScopes: initial?.systemScopes ?? [],
  }
}

// tierLabel says what picking a plan costs, next to its name. A name alone is a
// choice made blind: the numbers are what the limiter will actually apply.
//
// The free keyed plan arrives with NO name at all, not with an empty one:
// proto3 JSON omits an empty string, so a comparison against '' reads undefined
// and prints it. Seen on the dev instance as "undefined — 1.6 rps, 10 000/month".
function tierLabel(tier: ProviderTier): string {
  const name = tier.name ? tier.name : 'Free (keyed)'
  const parts: string[] = []
  if (tier.rps) parts.push(`${tier.rps} rps`)
  if (tier.quota) parts.push(`${tier.quota.toLocaleString()}/${tier.quotaPeriod || 'period'}`)
  return parts.length > 0 ? `${name} — ${parts.join(', ')}` : name
}

export function AccountForm({ open, onOpenChange, onSubmit, isLoading, initial }: AccountFormProps) {
  const { data: portfolios = [] } = usePortfolios()
  const { data: providers = [], isError: catalogueUnavailable } = useProviders()
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
  const providerSlug = watch('provider')
  const selectedTier = watch('tier')

  const allowedCaps = ALLOWED_CAPABILITIES[selectedType] ?? []
  const isKeyed = KEYED_TYPES.includes(selectedType)

  const provider: Provider | undefined = useMemo(
    () => providers.find((p) => p.slug === providerSlug),
    [providers, providerSlug]
  )
  // A slug the catalogue does not know still has to be editable: an older
  // backend, or an account created before the provider was registered.
  const isUnlistedSlug = Boolean(providerSlug) && !provider
  const showSlugInput = catalogueUnavailable || providers.length === 0 || isUnlistedSlug
  const extraFields = provider?.fields ?? []

  useEffect(() => {
    if (!open) return
    // Extra fields are declared per provider, so their initial values can only
    // be read once the catalogue and the chosen slug are both known.
    const data = initial?.data ?? {}
    const extras: Record<string, string> = {}
    for (const field of extraFields) {
      extras[field.key] = data[field.key] ?? ''
    }
    setValue('extras', extras)
  }, [open, initial, extraFields, setValue])

  function setType(type: FormValues['type']) {
    setValue('type', type)
    // Prune selections the new type doesn't allow.
    const allowed = ALLOWED_CAPABILITIES[type] ?? []
    let caps = capabilities.filter((c) => allowed.includes(c))
    // Manual accounts have exactly one capability — pre-select it.
    if (type === 'ACCOUNT_TYPE_MANUAL') {
      caps = ['manual_positions']
    }
    setValue('capabilities', caps)
    setValue('systemScopes', systemScopes.filter((s) => caps.includes(s)))
  }

  // Choosing a provider pre-selects the capabilities it is reached through.
  // The mapping is a property of what the provider does, and expecting a person
  // to know that a price feed is reached via "market_data" is how an account
  // ends up created, correct-looking and never consulted.
  function setProvider(slug: string) {
    if (slug === CUSTOM_PROVIDER) {
      setValue('provider', '')
      return
    }
    const next = slug === NO_PROVIDER ? '' : slug
    setValue('provider', next)
    setValue('tier', '')

    const chosen = providers.find((p) => p.slug === next)
    if (!chosen?.capabilities?.length) return
    const allowed = ALLOWED_CAPABILITIES[selectedType] ?? []
    const suggested = chosen.capabilities.filter((c) => allowed.includes(c))
    const merged = Array.from(new Set([...capabilities, ...suggested]))
    setValue('capabilities', merged)
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
    const owned: Record<string, string | undefined> = {}
    if (values.type === 'ACCOUNT_TYPE_WALLET') {
      owned.address = values.address
      owned.chain = values.chain
    }
    if (KEYED_TYPES.includes(values.type)) {
      owned.provider = values.provider?.trim().toLowerCase()
      owned.api_key = values.apiKey
      owned.api_secret = values.apiSecret
      for (const key of BUDGET_KEYS) {
        owned[key] = values[key]
      }
      for (const field of extraFields) {
        owned[field.key] = values.extras?.[field.key]
      }
    }

    // The form owns the keys it renders; everything else in accounts.data is
    // carried through, because UpdateAccount writes the map by replacement.
    const data = mergeAccountData(initial?.data, owned)
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
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
                {providers.length > 0 && (
                  <Select
                    value={isUnlistedSlug ? CUSTOM_PROVIDER : (providerSlug || NO_PROVIDER)}
                    onValueChange={setProvider}
                  >
                    <SelectTrigger id="acc-provider-select">
                      <SelectValue placeholder="Choose a provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PROVIDER}>
                        <span className="text-muted-foreground">No provider</span>
                      </SelectItem>
                      {providers.map((p) => (
                        <SelectItem key={p.slug} value={p.slug}>
                          <span>{p.title || p.slug}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {p.keyless ? 'no key needed' : p.needsApiKey ? 'key required' : 'key optional'}
                          </span>
                        </SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_PROVIDER}>
                        <span className="text-muted-foreground">Something else…</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {showSlugInput && (
                  <Input id="acc-provider" {...register('provider')} placeholder="binance, moralis, coingecko, …" />
                )}
                {errors.provider && <p className="text-sm text-destructive">{errors.provider.message}</p>}
                {provider?.chains?.length ? (
                  <p className="text-xs text-muted-foreground">
                    Reads: <code className="font-mono">{provider.chains.join(', ')}</code>
                  </p>
                ) : null}
                {provider?.keyless && (
                  <p className="text-xs text-muted-foreground">
                    Works without a key. An account exists to throttle it or give this deployment a share of a shared plan.
                  </p>
                )}
              </div>
              {/* The key field is always offered. "Not required" is not the same
                  as "not accepted": CoinGecko answers keyless and answers better
                  with a key, and hiding the field leaves no way to enter one. */}
              <div className="space-y-1">
                <Label htmlFor="acc-api-key">API key{provider?.needsApiKey ? '' : ' (optional)'}</Label>
                <Input id="acc-api-key" {...register('apiKey')} autoComplete="off" />
              </div>
              {/* The secret, by contrast, is hidden where the provider signs
                  nothing: a read-only price feed has no second half to a
                  credential, and offering the field invites a value that will
                  sit in the account unused. */}
              {(!provider || provider.needsApiSecret) && (
                <div className="space-y-1">
                  <Label htmlFor="acc-api-secret">API secret{provider?.needsApiSecret ? '' : ' (optional)'}</Label>
                  <Input id="acc-api-secret" {...register('apiSecret')} autoComplete="off" placeholder="Optional" />
                </div>
              )}
              {extraFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={`acc-extra-${field.key}`}>
                    {field.title || field.key}{field.required ? '' : ' (optional)'}
                  </Label>
                  {field.multiline ? (
                    <Textarea
                      id={`acc-extra-${field.key}`}
                      className="font-mono text-xs"
                      rows={5}
                      {...register(`extras.${field.key}` as const)}
                    />
                  ) : (
                    <Input id={`acc-extra-${field.key}`} {...register(`extras.${field.key}` as const)} />
                  )}
                  {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Secrets are write-only: saved values show as <code className="font-mono">••••</code> + last 4.
                Leave the masked value untouched to keep the stored secret, or paste a new one to rotate it.
              </p>
            </div>
          )}
          {isKeyed && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plan and budget</p>
              {provider?.tiers?.length ? (
                <div className="space-y-1">
                  <Label>Plan</Label>
                  <Select
                    value={selectedTier === '' ? DEFAULT_TIER : (selectedTier ?? DEFAULT_TIER)}
                    onValueChange={(v) => setValue('tier', v === DEFAULT_TIER ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {provider.tiers.map((tier) => (
                        <SelectItem key={tier.name || DEFAULT_TIER} value={tier.name || DEFAULT_TIER}>
                          {tierLabel(tier)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The plan the key is on. Moving to a paid one is this setting, not a release.
                  </p>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="acc-quota">Quota</Label>
                  <Input id="acc-quota" {...register('quota')} inputMode="numeric" placeholder="plan default" />
                  {errors.quota && <p className="text-sm text-destructive">{errors.quota.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Period</Label>
                  <Select
                    value={watch('period') || DEFAULT_TIER}
                    onValueChange={(v) => setValue('period', v === DEFAULT_TIER ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DEFAULT_TIER}>
                        <span className="text-muted-foreground">unset</span>
                      </SelectItem>
                      <SelectItem value="day">day</SelectItem>
                      <SelectItem value="month">month</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.period && <p className="text-sm text-destructive">{errors.period.message}</p>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                A quota is <strong>this deployment&apos;s share</strong> of the plan, not the plan itself. Two
                instances on one key cannot see each other&apos;s spend, so each needs its own share —
                without them both assume they own the whole allowance and it runs out with both still
                reporting room.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="acc-rps">Requests per second</Label>
                  <Input id="acc-rps" {...register('rps')} inputMode="decimal" placeholder="plan default" />
                  {errors.rps && <p className="text-sm text-destructive">{errors.rps.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="acc-burst">Burst</Label>
                  <Input id="acc-burst" {...register('burst')} inputMode="numeric" placeholder="plan default" />
                  {errors.burst && <p className="text-sm text-destructive">{errors.burst.message}</p>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Blank means the plan&apos;s own number. Keep burst at 1 for providers that meter per second.
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
