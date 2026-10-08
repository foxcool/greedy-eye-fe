// Types matching the greedy-eye backend proto definitions.
// Timestamps are ISO 8601 strings in JSON responses.

export type AccountType =
  | 'ACCOUNT_TYPE_UNSPECIFIED'
  | 'ACCOUNT_TYPE_WALLET'
  | 'ACCOUNT_TYPE_EXCHANGE'
  | 'ACCOUNT_TYPE_BANK'
  | 'ACCOUNT_TYPE_BROKER'
  | 'ACCOUNT_TYPE_SERVICE'
  | 'ACCOUNT_TYPE_MANUAL'

// Named operations account credentials allow (mirrors the backend capability matrix).
export type AccountCapability =
  | 'portfolio_sync'
  | 'trading'
  | 'market_data'
  | 'onchain_lookup'
  | 'manual_positions'

// How a holding or transaction entered the system. Server-stamped at creation.
export type ProvenanceSource =
  | 'PROVENANCE_SOURCE_UNSPECIFIED'
  | 'PROVENANCE_SOURCE_SYNC'
  | 'PROVENANCE_SOURCE_MANUAL'
  | 'PROVENANCE_SOURCE_LLM_IMPORT'

export type AssetType =
  | 'ASSET_TYPE_UNSPECIFIED'
  | 'ASSET_TYPE_CRYPTOCURRENCY'
  | 'ASSET_TYPE_STOCK'
  | 'ASSET_TYPE_BOND'
  | 'ASSET_TYPE_COMMODITY'
  | 'ASSET_TYPE_FOREX'
  | 'ASSET_TYPE_FUND'

export interface Portfolio {
  id: string
  userId: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Holding {
  id: string
  // int64 serialized as string in JSON
  amount: string
  decimals: number
  assetId: string
  accountId: string
  portfolioId?: string
  excluded?: boolean
  // Output-only provenance; stamped by the server on create.
  source?: ProvenanceSource
  importId?: string
  // Network this amount sits on ("eth", "base", "solana"). Empty means the
  // position is not chain-scoped (an exchange balance, a manual entry) — it
  // never means Ethereum. Sync writes one row per (account, asset, chain), so
  // the same token held on three chains is three holdings, not one sum.
  chain?: string
  // How soon this amount can be spent: "liquid", "staked", "unbonding",
  // "locked", "vesting". Empty means the source could not partition the
  // balance — it is NOT a synonym for liquid, and a runway figure must not
  // read it as one.
  liquidity?: string
  createdAt: string
  updatedAt: string
}

export interface Account {
  id: string
  userId: string
  name: string
  description?: string
  type: AccountType
  // Secret-looking keys (api_key, api_secret, *_token, ...) are write-only:
  // responses carry a "••••"+last4 mask. Echoing a masked value back keeps
  // the stored secret; a new value rotates it.
  data?: Record<string, string>
  portfolioId?: string
  capabilities?: AccountCapability[]
  // Admin-managed subset of capabilities shared system-wide.
  systemScopes?: AccountCapability[]
  // Stood down by its owner: keeps its key and holdings, but nothing syncs it
  // or takes it as a provider. Absent means active (proto3 omits false).
  disabled?: boolean
  disabledAt?: string
  createdAt: string
  updatedAt: string
}

// How much of its job an account or price source is doing. The state of a
// whole is decided by the server as the worst of its reasons; a client must not
// re-derive it. UNKNOWN means the instance cannot tell and is not OK.
export type HealthState =
  | 'HEALTH_STATE_UNSPECIFIED'
  | 'HEALTH_STATE_OK'
  | 'HEALTH_STATE_DEGRADED'
  | 'HEALTH_STATE_UNUSABLE'
  | 'HEALTH_STATE_UNKNOWN'
  // The owner's choice, not a fault.
  | 'HEALTH_STATE_DISABLED'

export interface HealthReason {
  kind: string
  // Written by the server and safe to show as is.
  message: string
  chain?: string
  failures?: number
  since?: string
  // When the account or source will be tried again.
  until?: string
  // Upstream error text; only ever present for admins.
  detail?: string
}

export interface AccountHealth {
  accountId: string
  accountName: string
  state: HealthState
  reasons?: HealthReason[]
}

// A price source the caller's prices depend on, named by provider only: a
// shared source is served by an account the caller may not own.
export interface SourceHealth {
  provider: string
  state: HealthState
  reasons?: HealthReason[]
}

export interface AccountHealthResponse {
  accounts?: AccountHealth[]
  sources?: SourceHealth[]
  sourcesState?: HealthState
}

// Prefix the backend uses when masking write-only secret values.
export const SECRET_MASK_PREFIX = '••••'

// What a provider does. A provider may do several: Binance both syncs an
// exchange account and quotes prices.
export type ProviderKind =
  | 'PROVIDER_KIND_UNSPECIFIED'
  | 'PROVIDER_KIND_PRICE'
  | 'PROVIDER_KIND_WALLET'
  | 'PROVIDER_KIND_EXCHANGE'

// An accounts.data entry a provider needs beyond the usual key and secret —
// a trust anchor, for instance, which no key field can hold.
export interface ProviderField {
  key: string
  title: string
  // What happens without it, in one sentence.
  help?: string
  required?: boolean
  // Wants a textarea rather than an input: a PEM block is not a line.
  multiline?: boolean
}

// A plan the provider meters a credential under, with the limits this instance
// applies by default. `name` is what goes into data["tier"]; empty is the
// provider's free keyed plan.
export interface ProviderTier {
  // Absent for the provider's free keyed plan: proto3 JSON omits an empty
  // string, so "" never reaches the wire as a value.
  name?: string
  rps?: number
  burst?: number
  // Requests the plan allows per period; absent when only rate is metered.
  quota?: number
  // "day", "month", or absent.
  quotaPeriod?: string
}

// Provider describes an external service an account can be created against.
// Served by PortfolioService.ListProviders — the same registry the resolver
// routes on, so the form offers what the backend actually uses rather than a
// list of its own that drifts.
export interface Provider {
  slug: string
  title?: string
  kinds?: ProviderKind[]
  // Capabilities an account must carry for this provider to be reachable.
  capabilities?: AccountCapability[]
  needsApiKey?: boolean
  needsApiSecret?: boolean
  // Answers with no account at all; an account naming the slug still wins,
  // which is how a free feed gets throttled or given a share of a shared plan.
  keyless?: boolean
  chains?: string[]
  fields?: ProviderField[]
  tiers?: ProviderTier[]
}

// Identity verdict (scam-filtering): whether an asset is what it claims to be.
// A permanent property, distinct from a real asset's situational risk and from a
// user's per-holding excluded decision.
export type IdentityVerdict =
  | 'unknown'
  | 'legit'
  | 'suspect'
  | 'scam'
  | 'impersonation'

// Asset identity is the composite (symbol, market, type): the same ticker may
// exist on different markets (AAPL on nasdaq vs an AAPL token on crypto).
export interface Asset {
  id: string
  name: string
  type: AssetType
  symbol?: string
  // Listing market/venue ("crypto" is the single global crypto market,
  // "nasdaq", "moex"), not the price source.
  market?: string
  // Quote currency/base where applicable.
  quote?: string
  tags: string[]
  // Scam-filtering identity verdict; "unknown" until scored.
  identityVerdict?: IdentityVerdict
  // Verdict provenance: "heuristic" | "provider:<name>" | "curated" | "user:<id>".
  verdictSource?: string
  // Last automated score in [0,1]. Absent for a user verdict and for an asset
  // that has never been scored — which is not the same as a score of zero.
  identityScore?: number
  // Which signals fired and what each weighed, so a verdict can be explained
  // rather than only announced. Empty until first scored.
  identitySignals?: Record<string, number>
  // When the current verdict was set.
  verdictSetAt?: string
  // Identities in external namespaces, and the situational risks on the asset.
  //
  // Both are POPULATED BY GetAsset ONLY. Read an empty array from listAssets as
  // "not loaded", never as "this asset has none" — the backend says the same
  // thing on both fields, because proto3 cannot tell the two apart.
  externalRefs?: AssetExternalRef[]
  riskFlags?: AssetRiskFlag[]
  createdAt: string
  updatedAt: string
}

// AssetExternalRef maps an asset to its identifier in an external namespace. On
// a chain, identity is the contract and not the symbol — this is what keeps a
// clone of a real ticker from merging into the real asset.
export interface AssetExternalRef {
  id: string
  assetId: string
  // Namespace: "onchain:<chain>", "coingecko", "cmc", broker ID spaces.
  source: string
  // Contract address, mint, coin id.
  ref: string
  // A manual link is terminal for auto-discovery.
  origin: 'auto' | 'manual' | 'seed'
  createdAt: string
}

// Risk-model axis 2: something true about a real asset's situation, as opposed
// to whether it is what it claims to be (that is the identity axis).
export type RiskFlagKind =
  | 'exploit'
  | 'depeg'
  | 'frozen_transfers'
  | 'deprecation'
  | 'delisting'
  | 'sanctions_freeze'

// Derived action direction (axis 3).
export type RiskActionHint = 'none' | 'hold' | 'exit_soon'

// AssetRiskFlag never changes a total: it does not exclude a holding and does
// not enter ValuationCoverage. It is disclosure, not arithmetic.
export interface AssetRiskFlag {
  id: string
  assetId: string
  kind: RiskFlagKind
  // Free-form context: what happened, where it was reported.
  note?: string
  actionHint?: RiskActionHint
  // When the flag must be revisited or ends. Required on write — a flag with no
  // review date never expires and turns the axis into a graveyard.
  reviewAt: string
  // Who set it: "user:<id>".
  setBy?: string
  createdAt: string
}

export type RuleStatus =
  | 'RULE_STATUS_UNKNOWN'
  | 'RULE_STATUS_ACTIVE'
  | 'RULE_STATUS_PAUSED'
  | 'RULE_STATUS_DISABLED'
  | 'RULE_STATUS_ERROR'

// AutomationService rule. `configuration` is a free-form JSON object
// (google.protobuf.Struct on the backend); for rule_type "target_allocation"
// it holds { targets: { [assetId]: percentage } }.
export interface Rule {
  id: string
  name: string
  description?: string
  ruleType: string
  portfolioId: string
  userId?: string
  status?: RuleStatus
  configuration?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface StoredPrice {
  id: string
  sourceId: string
  assetId: string
  baseAssetId: string
  interval: string
  decimals: number
  // int64 serialized as string in JSON
  last: string
  open?: string
  high?: string
  low?: string
  close?: string
  volume?: string
  // Market capitalisation observed with this quote, scaled by `decimals` like
  // the amounts above. Absent means the source reported none — which is not the
  // same statement as a capitalisation of zero. It travels with the price, not
  // with the asset: a quote is only as good as the market standing behind it.
  marketCap?: string
  timestamp: string
}

export interface PortfolioValueResponse {
  portfolioId: string
  quoteAssetId: string
  // int64 serialized as string in JSON
  totalValueAmount: string
  decimals: number
  calculationTime: string
  // Quarantined holdings kept out of the total but disclosed so the number never
  // silently diverges from the wallet.
  excludedCount?: number
  excludedValueAmount?: string
  // Holdings the backend could not price at all. The total covers priced
  // holdings only (ADR-008), so this travels with it; the field was being
  // dropped on the floor here, which is how the dashboard came to invent its
  // own numbers for these rows.
  coverage?: ValuationCoverage
}

export interface ValuationCoverage {
  pricedCount?: number
  unpricedCount?: number
  unpriced?: UnpricedHolding[]
  unpricedTruncated?: boolean
}

export interface UnpricedHolding {
  holdingId?: string
  assetId?: string
  symbol?: string
  // UNPRICED_REASON_NO_QUOTE | UNPRICED_REASON_THIN_MARKET | UNPRICED_REASON_NEVER_PRICED
  //   | UNPRICED_REASON_NO_CROSS_RATE
  reason?: string
  // Since when the sources have been asked without answering. Set only with
  // NEVER_PRICED, where it turns "no price" into "no price for eleven days".
  askedSince?: string
}

// What asking this asset's price sources has produced. Its caller is a
// disclosure that names a reason per position, so the shape is deliberately
// evidence — who was asked, since when — rather than a verdict.
//
// An asset nobody has ever asked about is ABSENT from the response, not
// zero-filled: an empty record would read as "asked, nothing came back", which
// is the opposite statement.
export interface AssetPricingStatus {
  assetId: string
  // True when some source has answered at some point. Such an asset has a price
  // row, so a valuation that still could not use it failed for another reason.
  everPriced?: boolean
  firstAskedAt?: string
  lastAskedAt?: string
  // Four sources silent for a week is a different statement from one source
  // silent for a week.
  sourcesAsked?: number
}

// --- Analytics (heatmap) ---

export type HeatmapGroupBy =
  | 'HEATMAP_GROUP_BY_UNSPECIFIED'
  | 'HEATMAP_GROUP_BY_ACCOUNT'
  | 'HEATMAP_GROUP_BY_PORTFOLIO'
export type HeatmapWindow = 'HEATMAP_WINDOW_24H' | 'HEATMAP_WINDOW_7D' | 'HEATMAP_WINDOW_30D'

// One treemap tile (leaf) or group (parent). Proto3 JSON omits zero values,
// so numeric fields may be absent.
export interface HeatmapNode {
  id: string
  label?: string
  parentId?: string
  size?: number
  colorValue?: number
  price?: number
  assetId?: string
}

export interface GetHeatmapResponse {
  nodes?: HeatmapNode[]
  quoteAssetId: string
  calculatedAt?: string
}

// Converts int64 holding amount string to decimal number.
// e.g. holdingToDecimal("1140000", 8) → 0.0114
export function holdingToDecimal(amount: string | undefined | null, decimals: number): number {
  if (!amount) return 0
  return Number(BigInt(amount)) / Math.pow(10, decimals)
}

// Converts decimal number to int64 holding amount string.
// e.g. decimalToHolding(0.0114, 8) → "1140000"
//
// Goes through the plain decimal text of the number rather than multiplying
// it: value * 10^decimals leaves float range for any 18-decimal token over
// ~1000 units and prints "1.2e+21", which is not an amount. Anything that
// starts from TEXT a person typed should use decimalStringToRaw directly and
// skip the float altogether.
export function decimalToHolding(value: number, decimals: number): string {
  return decimalStringToRaw(value.toFixed(Math.min(decimals, 100)), decimals)
}

// rawToDecimalString renders a raw amount exactly: "1234567890123456789012"
// at 18 decimals is "1234.567890123456789012", with no float in between and
// trailing zeros of the fraction dropped. For a field a person edits — what
// it shows is what an unedited save sends back.
export function rawToDecimalString(raw: string | undefined | null, decimals: number): string {
  if (!raw) return '0'
  const negative = raw.startsWith('-')
  const digits = (negative ? raw.slice(1) : raw).padStart(decimals + 1, '0')
  const whole = digits.slice(0, digits.length - decimals).replace(/^0+(?=\d)/, '')
  const fraction = decimals > 0 ? digits.slice(digits.length - decimals).replace(/0+$/, '') : ''
  return (negative ? '-' : '') + whole + (fraction ? '.' + fraction : '')
}

// decimalStringToRaw is the inverse, exactly: "1234.567890123456789012" at 18
// decimals is "1234567890123456789012". It refuses rather than rounds — more
// fraction digits than the asset carries, or anything that is not a plain
// non-negative decimal, is an error for the caller to show.
export function decimalStringToRaw(value: string, decimals: number): string {
  const text = value.trim()
  const m = /^(\d*)(?:\.(\d*))?$/.exec(text)
  if (!m || (m[1] === '' && (m[2] ?? '') === '')) {
    throw new Error(`"${value}" is not a non-negative decimal number`)
  }
  const fraction = (m[2] ?? '').replace(/0+$/, '')
  if (fraction.length > decimals) {
    throw new Error(`at most ${decimals} digits after the point for this asset`)
  }
  return BigInt((m[1] || '0') + fraction.padEnd(decimals, '0')).toString()
}
