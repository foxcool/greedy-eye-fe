import type {
  Asset,
  AssetPricingStatus,
  Holding,
  IdentityVerdict,
  ValuationCoverage,
} from '@/lib/api/backend-types'

/**
 * Why a position is, or is not, part of the total.
 *
 * There are three different reasons a holding can be missing from a sum, and
 * they are statements about three different things:
 *
 * - `unpriced` is about the DATA — no quote exists, or the quote found has no
 *   market behind it. `never-asked` and `priced-unusable` are the same statement
 *   made from the pricing record instead of the coverage list, for the positions
 *   that list is too short to reach
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
  | { kind: 'unpriced'; reason: UnpricedReason; askedSince?: string; sourcesAsked?: number }
  // A quote for this asset exists and the valuation still could not use it. The
  // backend DOES record which cause applied — it is reachable through
  // ListUnpricedHoldings — but this response did not carry it: no position in
  // this asset reached the capped disclosure list. The gap is in what was
  // disclosed here, not in what is known.
  | { kind: 'priced-unusable'; lastAskedAt?: string }
  // No source has ever been asked about this asset — a gap in coverage, not a
  // statement about the market.
  | { kind: 'never-asked' }
  | { kind: 'undisclosed'; disclosed: number; total: number }
  | { kind: 'unknown' }

export type UnpricedReason = 'NO_QUOTE' | 'THIN_MARKET' | 'NEVER_PRICED' | 'NO_CROSS_RATE' | 'OTHER'

/**
 * What is known about asking this asset's price sources, at the moment the
 * status is computed.
 *
 * Three states, not two, because "the lookup has not answered yet" and "the
 * backend holds no record" are different facts and only one of them is a
 * statement about the asset. Flattening them into `undefined` is how a loading
 * spinner turns into an assertion.
 */
export type PricingLookup =
  | { state: 'pending' }
  | { state: 'known'; status: AssetPricingStatus }
  | { state: 'never-asked' }

/**
 * Read one asset out of a batched GetPricingStatus response.
 *
 * `resolved` must be the query's success, not merely "data is not undefined":
 * a failed request leaves the answer unknown, and reporting that as
 * `never-asked` would state, on no evidence, that nobody ever looked.
 */
export function pricingLookup(
  assetId: string,
  statuses: AssetPricingStatus[] | undefined,
  resolved: boolean
): PricingLookup {
  if (!resolved) return { state: 'pending' }
  const status = statuses?.find((s) => s.assetId === assetId)
  // Absent means never asked: the backend omits such assets rather than
  // zero-filling them, precisely so this distinction survives the wire.
  return status ? { state: 'known', status } : { state: 'never-asked' }
}

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
    case 'UNPRICED_REASON_NO_CROSS_RATE':
      return 'NO_CROSS_RATE'
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
 *
 * `pricing` is what rescues the capped case: the coverage list stops at 50 while
 * counting every unpriced holding, so on a synced wallet a position is usually
 * outside the sample. GetPricingStatus answers the same question per asset, and
 * without it the honest thing left to say is that the reason was not disclosed.
 */
export function holdingStatus(
  holding: Holding,
  asset: Asset | undefined,
  coverage: ValuationCoverage | undefined,
  assetIsPriced: boolean,
  pricing: PricingLookup = { state: 'pending' }
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

  // Exact position first, then any position in the same asset. The fallback is
  // sound because an unpriced reason is a fact about the ASSET's quote, not
  // about the position: the backend derives it from `unitPrice(assetID,
  // quoteAssetID)`, whose signature has no holding in it. Two unexcluded
  // holdings of one asset therefore cannot carry different reasons — and
  // exclusion is already decided above, before this runs.
  //
  // Without the fallback the capped list splits them: on prod the HDX page
  // showed one position as THIN_MARKET and its twin, outside the sample of 50,
  // as "which of the two is not recorded". Same asset, same quote, two answers.
  const entry =
    coverage?.unpriced?.find((u) => u.holdingId === holding.id) ??
    coverage?.unpriced?.find((u) => u.assetId === holding.assetId)
  if (entry) {
    return {
      kind: 'unpriced',
      reason: parseReason(entry.reason),
      askedSince: entry.askedSince,
      // Only the pricing record counts sources; the coverage entry carries the
      // date alone. Taken from there when it is loaded so that the sentence does
      // not get thinner for being inside the sample.
      sourcesAsked: pricing.state === 'known' ? pricing.status.sourcesAsked : undefined,
    }
  }

  if (assetIsPriced) return { kind: 'counted' }

  // The disclosure list is capped. On a synced wallet the uncapped set runs to
  // triple digits, so "not in the sample" is the common case, not an edge — and
  // reporting it as `counted` would put a position in the total that is not in
  // the total.
  if (coverage?.unpricedTruncated) {
    switch (pricing.state) {
      case 'known':
        // Reached only when NO position in this asset made the disclosure list
        // — the asset-level fallback above already covers the case where one
        // did. All that is left here is the pricing record, which says whether
        // a price was ever stored but not why the valuation refused it.
        return pricing.status.everPriced
          ? { kind: 'priced-unusable', lastAskedAt: pricing.status.lastAskedAt }
          : {
              kind: 'unpriced',
              reason: 'NEVER_PRICED',
              askedSince: pricing.status.firstAskedAt,
              sourcesAsked: pricing.status.sourcesAsked,
            }
      case 'never-asked':
        return { kind: 'never-asked' }
      case 'pending':
        return {
          kind: 'undisclosed',
          disclosed: coverage.unpriced?.length ?? 0,
          total: coverage.unpricedCount ?? 0,
        }
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
    case 'priced-unusable':
    case 'never-asked':
    case 'undisclosed':
      return 'Not valued'
    case 'unknown':
      return 'Unknown'
  }
}

/**
 * A date as evidence, not as decoration: "since 3 August" is what turns "no
 * price" into "no price for eleven days".
 */
function since(iso: string | undefined): string | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString()
}

/**
 * The same evidence stated about the ASSET rather than about a position, for a
 * page that has no quote to show and owes the reader a reason.
 *
 * Undefined while the lookup is pending: an empty panel that says nothing is
 * honest, one that guesses is not.
 */
export function pricingEvidence(pricing: PricingLookup): string | undefined {
  switch (pricing.state) {
    case 'pending':
      return undefined
    case 'never-asked':
      return 'No price source has ever been asked about this asset. Nothing here is a statement about the market — it is a gap in coverage.'
    case 'known': {
      const { everPriced, firstAskedAt, lastAskedAt, sourcesAsked } = pricing.status
      if (everPriced) {
        const last = since(lastAskedAt)
        return `Sources have answered for this asset before, so a price row exists — just not one this page could read against your display currency.${
          last ? ` Last asked ${last}.` : ''
        }`
      }
      return `Every source available has been asked and none has ever answered.${evidence(
        firstAskedAt,
        sourcesAsked
      )} That is evidence of silence, not a delisting verdict.`
    }
  }
}

/** "asked since 3 August across 4 sources", as much of it as is known. */
function evidence(askedSince: string | undefined, sourcesAsked: number | undefined): string {
  const date = since(askedSince)
  const sources =
    sourcesAsked === undefined || sourcesAsked === 0
      ? undefined
      : `${sourcesAsked} source${sourcesAsked === 1 ? '' : 's'}`
  if (date && sources) return ` Asked since ${date}, across ${sources}.`
  if (date) return ` Asked since ${date}.`
  if (sources) return ` Asked across ${sources}.`
  return ''
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
          return 'Not valued: there is no stored price for this asset in any currency. Missing data, not a value of zero.'
        case 'NO_CROSS_RATE':
          return 'Not valued: this asset has a current price, but in a currency we hold no exchange rate to your display currency for. The position is priced; only the conversion is missing.'
        case 'THIN_MARKET':
          return 'Not valued: a quote exists, but the market behind it is too thin to sell this position at that price. The quote is real; the money is not.'
        case 'NEVER_PRICED':
          return `Not valued: every source available has been asked and none has ever answered.${evidence(status.askedSince, status.sourcesAsked)} That is evidence of silence, not a delisting verdict.`
        case 'OTHER':
          return 'Not valued. The reason given is one this page does not recognise.'
      }
    case 'priced-unusable': {
      const last = since(status.lastAskedAt)
      return `Not valued, though a price for this asset has been stored${
        last ? ` — sources last asked ${last}` : ''
      }. The valuation could not use that quote: either there is no path from it to your display currency, or the market behind it is too thin to sell into. Which of the two is recorded, but this report did not disclose it for any position in this asset.`
    }
    case 'never-asked':
      return 'Not valued: no price source has ever been asked about this asset. That is a gap in coverage — nothing here is a statement about the market.'
    case 'undisclosed':
      return `Not valued. The coverage report listed ${status.disclosed} of ${status.total} unvalued positions and this one is not in that sample; its reason is still loading.`
    case 'unknown':
      return 'Cannot say — the valuation report did not load.'
  }
}
