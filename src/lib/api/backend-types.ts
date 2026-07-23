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
  createdAt: string
  updatedAt: string
}

// Prefix the backend uses when masking write-only secret values.
export const SECRET_MASK_PREFIX = '••••'

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
  createdAt: string
  updatedAt: string
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
}

// --- Analytics (heatmap) ---

export type HeatmapGroupBy = 'HEATMAP_GROUP_BY_UNSPECIFIED' | 'HEATMAP_GROUP_BY_ACCOUNT'
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
export function decimalToHolding(value: number, decimals: number): string {
  return Math.round(value * Math.pow(10, decimals)).toString()
}
