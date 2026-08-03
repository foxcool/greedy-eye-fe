/**
 * UI-specific types for portfolio visualization
 * These extend/simplify API types for display purposes
 */

export interface PortfolioHolding {
  assetId: string           // coingecko ID (e.g., "bitcoin")
  symbol: string            // display symbol (e.g., "BTC")
  name: string              // full name (e.g., "Bitcoin")
  quantity: number          // total amount across all sources
  price: number             // current price in USD
  value: number             // quantity × price
  percentage: number        // % of total portfolio
  change24h?: number        // 24h price change %
  // True when no price was found for this asset. The row is shown as
  // present-but-unvalued rather than dropped or filled with someone else's
  // quote; see ValuationCoverage for why the backend left it out of the total.
  unpriced?: boolean
  sources: HoldingSource[]  // breakdown by wallet/exchange
}

export interface HoldingSource {
  name: string              // e.g., "eth main", "binance", "arb main"
  type: 'wallet' | 'exchange' | 'defi'
  amount: number
  chain?: string            // for on-chain: "ethereum", "arbitrum", etc.
  protocol?: string         // for defi: "aave", "uniswap", etc.
}

export interface TargetAllocation {
  assetId: string
  symbol: string
  targetPercentage: number
  currentPercentage: number
  diff: number              // current - target (positive = overweight)
  diffValue: number         // diff in USD
}

// What the backend could and could not value, as reported by
// CalculatePortfolioValue. The total covers priced holdings only, so a consumer
// showing the number is expected to show this beside it (ADR-008).
export interface ValuationCoverage {
  pricedCount?: number
  unpricedCount?: number
  /** Capped list; unpricedTruncated says whether more exist than are listed. */
  unpriced?: UnpricedHolding[]
  unpricedTruncated?: boolean
}

export interface UnpricedHolding {
  holdingId?: string
  assetId?: string
  symbol?: string
  reason?: string
}

export interface PortfolioSummary {
  totalValue: number
  holdings: PortfolioHolding[]
  /** Merged across the portfolios this summary covers; absent in demo mode. */
  coverage?: ValuationCoverage
  allocations: TargetAllocation[]
  lastUpdated: Date
  isLivePrices?: boolean          // true if prices from live API
  portfolioId?: string            // backend portfolio ID if connected
  dataSource?: 'backend' | 'mock'
}

// For charts (index signature required for Recharts compatibility)
export interface AllocationSlice {
  assetId: string
  symbol: string
  value: number
  percentage: number
  color: string
  [key: string]: string | number
}
