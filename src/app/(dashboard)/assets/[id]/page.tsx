'use client'

import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PriceHistoryChart } from '@/components/prices/price-history-chart'
import { useAsset, useLatestPrice } from '@/hooks/use-assets'
import { holdingToDecimal, type Asset } from '@/lib/api/backend-types'
import { DEMO_MODE } from '@/lib/config/data-source'
import { truncateAddress } from '@/lib/assets/links'
import { assetTypeLabel } from '@/lib/assets/catalogue'
import { formatCurrency } from '@/lib/mocks'
import { VerdictBadge } from '../components/verdict-badge'
import { HoldingsSection } from './components/holdings-section'
import { IdentitySection } from './components/identity-section'
import { LinksSection } from './components/links-section'
import { RiskFlagsSection } from './components/risk-flags-section'
import { ValuationSection } from './components/valuation-section'
import { AssetActions } from './components/asset-actions'

interface PageProps {
  params: Promise<{ id: string }>
}


/**
 * Back to wherever the reader came from — a portfolio, the heatmap, the list —
 * not always to /assets. The card is reached from many places now, and sending
 * everyone to the catalogue loses the page they were working in.
 *
 * A card opened in a fresh tab has no in-app history to return to; there the
 * link's own href, the assets list, is the only sensible "back". The href stays
 * a real link either way, so cmd-click still opens the list in a new tab.
 */
function BackButton() {
  const router = useRouter()
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link
        href="/assets"
        aria-label="Back"
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || window.history.length <= 1) return
          e.preventDefault()
          router.back()
        }}
      >
        ←
      </Link>
    </Button>
  )
}

/**
 * The last STORED quote, labelled as such.
 *
 * Not "current price": this row is whatever the last sweep managed to write, and
 * on the assets this page exists to explain there may be nothing at all. Saying
 * "current" would date a number nobody re-checked.
 */
function LastQuote({ asset }: { asset: Asset }) {
  const { data: price, isLoading } = useLatestPrice(asset.id)
  return (
    <div className="text-right">
      <p className="text-xs text-muted-foreground mb-0.5">Last stored quote</p>
      <p className="text-2xl font-bold tabular-nums">
        {isLoading
          ? '…'
          : price
            ? formatCurrency(holdingToDecimal(price.last, price.decimals), 6)
            : '—'}
      </p>
      {price && (
        <p className="text-xs text-muted-foreground">
          {new Date(price.timestamp).toLocaleString()} · {price.sourceId}
        </p>
      )}
    </div>
  )
}

export default function AssetDetailPage({ params }: PageProps) {
  const { id } = use(params)

  // Disabled in demo, so no child hook ever fires a request that cannot be
  // answered. There is no mock asset, no mock risk flag and no mock price
  // history in this repo — an empty page is honest, an invented verdict is not.
  const { data: asset, isLoading, error } = useAsset(DEMO_MODE ? undefined : id)

  if (DEMO_MODE) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-2xl font-semibold">Asset</h1>
        </div>
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">
            Asset details need a backend. This demo has no mock asset — an empty page is
            honest, an invented verdict is not.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <p className="text-muted-foreground">Loading…</p>
  }

  if (error || !asset) {
    return (
      <div className="space-y-3">
        <p className="text-destructive">Asset not found.</p>
        <Button variant="outline" asChild>
          <Link href="/assets">← Back to Assets</Link>
        </Button>
      </div>
    )
  }

  // For an unlisted contract the backend writes market as "onchain:<chain>/<addr>".
  // That is signal, not junk — it says no venue lists this — but it is unreadable
  // at full length.
  const market = asset.market ?? ''
  const marketLabel = market.includes('/')
    ? `${market.slice(0, market.indexOf('/') + 1)}${truncateAddress(market.slice(market.indexOf('/') + 1))}`
    : market

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <BackButton />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold break-words">{asset.symbol ?? asset.name}</h1>
              <VerdictBadge verdict={asset.identityVerdict} source={asset.verdictSource} />
            </div>
            <p className="text-sm text-muted-foreground break-words">
              {asset.name}
              {' · '}
              {assetTypeLabel(asset.type)}
              {marketLabel && ` · ${marketLabel}`}
            </p>
            {market.includes('/') && (
              <p className="text-xs text-muted-foreground">no venue lists this contract</p>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <LastQuote asset={asset} />
          <AssetActions asset={asset} />
        </div>
      </div>

      {/* Facts about the ASSET first. It is a catalogue entity — global, and the
          same for every user. Holdings are one reader's relation to it, and
          there may be none; leading with them would say the asset belongs to a
          wallet, which is backwards. */}
      <div className="grid gap-6 md:grid-cols-2">
        <IdentitySection asset={asset} />
        <LinksSection asset={asset} />
      </div>

      <ValuationSection asset={asset} />
      <RiskFlagsSection asset={asset} />

      <div>
        <PriceHistoryChart
          assetId={asset.id}
          assetLabel={asset.symbol ?? asset.name}
          days={30}
        />
      </div>

      {/* Then the reader's own relation to it. */}
      <div className="border-t border-border pt-8">
        <HoldingsSection asset={asset} />
      </div>
    </div>
  )
}
