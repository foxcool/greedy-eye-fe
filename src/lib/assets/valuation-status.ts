import type { Asset, Holding, IdentityVerdict, ValuationCoverage } from '@/lib/api/backend-types'

/**
 * Why a position is, or is not, part of the total.
 *
 * There are three different reasons a holding can be missing from a sum, and
 * they are statements about three different things:
 *
 * - `unpriced` is about the DATA — no quote exists, or the quote found has no
 *   market behind it
 * - `excluded-verdict` is about the ASSET'S IDENTITY — it is not what it claims
 *   to be, and sync quarantines it
 * - `excluded-manual` is the USER'S accounting decision
 *
 * Collapsing them into "not counted" is the failure this module exists to
 * prevent. It lives beside links.ts for the same reason that one does: the rule
 * has two consumers already (the holdings row and the valuation section), and a
 * second copy is exactly how the distinction gets lost.
 */

export type ValuationStatus =
  | { kind: 'counted' }
  | { kind: 'excluded-verdict'; verdict: IdentityVerdict }
  | { kind: 'excluded-manual' }
  | { kind: 'unpriced'; reason: UnpricedReason }
  | { kind: 'undisclosed'; disclosed: number; total: number }
  | { kind: 'unknown' }

export type UnpricedReason = 'NO_QUOTE' | 'THIN_MARKET' | 'NEVER_PRICED' | 'OTHER'

/** Verdicts that make sync quarantine every holding of the asset. */
const QUARANTINE_VERDICTS: IdentityVerdict[] = ['scam', 'impersonation', 'suspect']

function parseReason(raw: string | undefined): UnpricedReason {
  switch (raw) {
    case 'UNPRICED_REASON_NO_QUOTE':
      return 'NO_QUOTE'
    case 'UNPRICED_REASON_THIN_MARKET':
      return 'THIN_MARKET'
    case 'UNPRICED_REASON_NEVER_PRICED':
      return 'NEVER_PRICED'
    default:
      // A reason this build does not know about still has to read as prose. The
      // one thing it must never do is surface `UNPRICED_REASON_SOMETHING` to a
      // person as though that were an explanation.
      return 'OTHER'
  }
}

/**
 * Decide why `holding` is or is not in the total.
 *
 * `assetIsPriced` comes from the portfolio summary's own view of this asset —
 * it is a reliable POSITIVE signal because the heatmap's node list is not
 * capped, unlike the coverage disclosure list.
 */
export function holdingStatus(
  holding: Holding,
  asset: Asset | undefined,
  coverage: ValuationCoverage | undefined,
  assetIsPriced: boolean
): ValuationStatus {
  // Exclusion is decided BEFORE any question about price, because the backend
  // decides it in that order too: CalculatePortfolioValue counts an excluded
  // holding and continues before reaching the pricing branch, so an excluded
  // holding can never appear in coverage.unpriced. Its absence from that list
  // proves nothing about whether a quote exists.
  if (holding.excluded) {
    const verdict = asset?.identityVerdict
    if (verdict && QUARANTINE_VERDICTS.includes(verdict)) {
      return { kind: 'excluded-verdict', verdict }
    }
    return { kind: 'excluded-manual' }
  }

  const entry = coverage?.unpriced?.find((u) =>
    u.holdingId ? u.holdingId === holding.id : u.assetId === holding.assetId
  )
  if (entry) return { kind: 'unpriced', reason: parseReason(entry.reason) }

  if (assetIsPriced) return { kind: 'counted' }

  // The disclosure list is capped. On a synced wallet the uncapped set runs to
  // triple digits, so "not in the sample" is the common case, not an edge — and
  // reporting it as `counted` would put a position in the total that is not in
  // the total.
  if (coverage?.unpricedTruncated) {
    return {
      kind: 'undisclosed',
      disclosed: coverage.unpriced?.length ?? 0,
      total: coverage.unpricedCount ?? 0,
    }
  }

  return { kind: 'unknown' }
}

/** Short label for a table cell. */
export function statusLabel(status: ValuationStatus): string {
  switch (status.kind) {
    case 'counted':
      return 'In total'
    case 'excluded-verdict':
      return 'Quarantined'
    case 'excluded-manual':
      return 'Excluded by you'
    case 'unpriced':
      return 'Not valued'
    case 'undisclosed':
      return 'Not valued'
    case 'unknown':
      return 'Unknown'
  }
}

/**
 * The sentence a reader came here for. Every branch names WHICH of the three
 * reasons applies.
 *
 * On `excluded-verdict` the wording attributes rather than asserts: holdings
 * carry one `excluded` boolean with no provenance column, so a user who
 * hand-excluded a scam asset is indistinguishable from sync having done it.
 * Saying what quarantine does is true either way; saying "we excluded this"
 * would not be.
 */
export function statusExplanation(status: ValuationStatus): string {
  switch (status.kind) {
    case 'counted':
      return 'Counted in your total.'
    case 'excluded-verdict':
      return `Out of the total. This asset is marked ${status.verdict} — sync quarantines holdings of an asset that is not what it claims to be.`
    case 'excluded-manual':
      return 'Out of the total. This position is excluded by hand; nothing about the asset or its price caused it.'
    case 'unpriced':
      switch (status.reason) {
        case 'NO_QUOTE':
          return 'Not valued: there is no stored price, or no path from the price we have to your display currency. Missing data, not a value of zero.'
        case 'THIN_MARKET':
          return 'Not valued: a quote exists, but the market behind it is too thin to sell this position at that price. The quote is real; the money is not.'
        case 'NEVER_PRICED':
          return 'Not valued: every source available has been asked and none has ever answered. That is evidence of silence, not a delisting verdict.'
        case 'OTHER':
          return 'Not valued. The reason given is one this page does not recognise.'
      }
    case 'undisclosed':
      return `Not valued. The coverage report listed ${status.disclosed} of ${status.total} unvalued positions and this one is not in that sample, so its reason was not disclosed.`
    case 'unknown':
      return 'Cannot say — the valuation report did not load.'
  }
}
