'use client'

import { ExternalLink } from 'lucide-react'
import { AssetLink } from '@/components/asset/asset-link'
import { coingeckoIdBySymbol } from '@/hooks/use-prices'
import { coingeckoUrl, contractRef, contractUrl } from '@/lib/assets/links'
import type { Asset } from '@/lib/api/backend-types'
import { cn } from '@/lib/utils'
import { VerdictBadge } from './verdict-badge'

/**
 * The first cell of every asset row on this page: symbol, verdict, name — and
 * the link that makes the whole row open the card. The row must be `relative`
 * for the stretched link to cover it.
 */
export function AssetCell({
  assetId,
  asset,
  symbol,
  name,
}: {
  assetId: string
  asset?: Asset
  symbol: string
  name: string
}) {
  // Bounded width: an airdrop's "symbol" is often a whole sentence of ad copy,
  // and in an auto-layout table `truncate` alone lets it push every number off
  // screen.
  return (
    <div className="min-w-0 max-w-[18rem]">
      <div className="flex items-center gap-2">
        <AssetLink assetId={assetId} stretched className="min-w-0 font-medium text-foreground truncate" title={symbol}>
          {symbol}
        </AssetLink>
        <VerdictBadge verdict={asset?.identityVerdict} source={asset?.verdictSource} />
      </div>
      {name && name !== symbol && (
        <p className="text-xs text-muted-foreground truncate" title={name}>
          {name}
        </p>
      )}
    </div>
  )
}

/**
 * Outward link as an icon beside the row, not on the symbol: the row itself now
 * opens the card, and one text target meaning two destinations is how a reader
 * lands on etherscan when they wanted the asset.
 *
 * The CoinGecko id still comes from `coingeckoIdBySymbol`, derived from mock data
 * and covering about fifteen demo tokens. The real id is an external ref that only
 * GetAsset carries, and the card links it; a list cannot afford that call per row.
 */
export function ExternalAssetLink({ asset, className }: { asset?: Asset; className?: string }) {
  if (!asset) return null
  const coingeckoId = asset.symbol && coingeckoIdBySymbol[asset.symbol.toUpperCase()]
  const href = coingeckoId ? coingeckoUrl(coingeckoId) : contractUrl(contractRef(asset))
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={coingeckoId ? 'CoinGecko' : 'Block explorer'}
      aria-label={`${asset.symbol ?? asset.name} on ${coingeckoId ? 'CoinGecko' : 'a block explorer'}`}
      className={cn(
        'relative z-10 inline-flex rounded p-1 text-muted-foreground hover:text-primary',
        className
      )}
    >
      <ExternalLink size={14} aria-hidden="true" />
    </a>
  )
}

/**
 * A row of filter pills with counts. The count is part of the choice: "Excluded
 * (287)" says whether the filter is worth opening before it is opened.
 */
export function FilterPills<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; count?: number }[]
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
            value === o.value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1 tabular-nums opacity-70">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}
