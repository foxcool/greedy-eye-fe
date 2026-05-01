// Types matching the greedy-eye backend proto definitions.
// Timestamps are ISO 8601 strings in JSON responses.

export type AccountType =
  | 'ACCOUNT_TYPE_UNSPECIFIED'
  | 'ACCOUNT_TYPE_WALLET'
  | 'ACCOUNT_TYPE_EXCHANGE'
  | 'ACCOUNT_TYPE_BANK'
  | 'ACCOUNT_TYPE_BROKER'

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
  createdAt: string
  updatedAt: string
}

export interface Account {
  id: string
  userId: string
  name: string
  description?: string
  type: AccountType
  data?: Record<string, string>
  portfolioId?: string
  createdAt: string
  updatedAt: string
}

export interface Asset {
  id: string
  name: string
  type: AssetType
  symbol?: string
  tags: string[]
  createdAt: string
  updatedAt: string
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
