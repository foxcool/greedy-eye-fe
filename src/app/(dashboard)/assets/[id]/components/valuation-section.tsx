'use client'

import { useLatestPrice, usePricingStatus } from '@/hooks/use-assets'
import { holdingToDecimal, type Asset } from '@/lib/api/backend-types'
import { pricingEvidence, pricingLookup } from '@/lib/assets/valuation-status'
import { formatCurrency } from '@/lib/mocks'
import { EmptyPanel, Facts, Row, Section } from './section'

/**
 * The market's statement about this asset: the quote, and the evidence behind
 * it. Nothing here is about the reader's holdings — whether a POSITION reaches
 * a total is a fact about that position, and it is said beside the position.
 */
export function ValuationSection({ asset }: { asset: Asset }) {
  const { data: price, isLoading: priceLoading } = useLatestPrice(asset.id)
  // An absent quote is where a reader most needs the evidence behind it: asked
  // and silent, or never asked at all, are different answers to "why no price".
  const { data: pricingStatuses, isSuccess: pricingResolved } = usePricingStatus([asset.id])
  const evidence = pricingEvidence(pricingLookup(asset.id, pricingStatuses, pricingResolved))

  const dec = (raw: string | undefined) =>
    raw === undefined || price === undefined ? undefined : holdingToDecimal(raw, price.decimals)

  const volume = dec(price?.volume)
  const marketCap = dec(price?.marketCap)

  return (
    <Section
      title="Valuation"
      description="The stored quote behind this asset, and the evidence a valuation gate reads."
    >
      {priceLoading ? (
        <p className="text-sm text-muted-foreground">Loading quote…</p>
      ) : !price ? (
        <EmptyPanel>
          No stored quote for this asset. That is missing data, not a price of zero.
          {/* EmptyPanel already renders a <p>, so this is a block span. */}
          {evidence && <span className="mt-2 block">{evidence}</span>}
        </EmptyPanel>
      ) : (
        <Facts>
          <Row label="Last stored quote">
            {formatCurrency(holdingToDecimal(price.last, price.decimals), 6)}
          </Row>
          <Row label="Observed" muted>
            {new Date(price.timestamp).toLocaleString()}
          </Row>
          <Row label="Source" muted>
            {price.sourceId}
          </Row>
          {/* Absent volume and market cap are rendered as "—", never as $0: the
              proto says absent means the source reported none, which is not the
              same statement as a value of zero. Volume is shown because it is
              the evidence the thin-market gate reads — the threshold itself
              lives in the backend and is not restated here, or it would drift
              the moment the policy moves. */}
          <Row label="24h volume" muted>
            {volume === undefined ? '—' : formatCurrency(volume, 0)}
          </Row>
          <Row label="Market cap" muted>
            {marketCap === undefined ? '—' : formatCurrency(marketCap, 0)}
          </Row>
        </Facts>
      )}
    </Section>
  )
}
