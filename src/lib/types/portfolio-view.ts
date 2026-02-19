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

export interface PortfolioSummary {
  totalValue: number
  holdings: PortfolioHolding[]
  allocations: TargetAllocation[]
  lastUpdated: Date
  isLivePrices?: boolean    // true if prices from live API
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
