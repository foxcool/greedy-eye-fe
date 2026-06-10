/**
 * Portfolio calculation utilities
 * Mirrors the logic from crypto_portfolio.r
 */

import type { 
  PortfolioHolding, 
  PortfolioSummary, 
  TargetAllocation,
  AllocationSlice 
} from '../types/portfolio-view'
import { rawHoldings, targetPercentages, mockPrices } from './portfolio-data'

// Color palette for pie chart (deterministic based on index)
const CHART_COLORS = [
  '#f97316', // orange
  '#3b82f6', // blue
  '#22c55e', // green
  '#a855f7', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#6366f1', // indigo
  '#ef4444', // red
  '#84cc16', // lime
  '#06b6d4', // cyan
  '#8b5cf6', // violet
]

/**
 * Calculate portfolio summary from raw holdings and prices
 * This replicates the R script logic
 */
export function calculatePortfolio(
  holdings = rawHoldings,
  prices = mockPrices,
  targets = targetPercentages,
  options: { includeZeroValue?: boolean } = {}
): PortfolioSummary {
  // Step 1: Calculate holdings with values
  const portfolioHoldings: PortfolioHolding[] = holdings
    .map((holding) => {
      const quantity = holding.sources.reduce((sum, s) => sum + s.amount, 0)
      // assetId match covers mock holdings (CoinGecko ids); symbol fallback
      // covers backend holdings whose assetId is a UUID.
      const priceData =
        prices[holding.assetId] ||
        prices[holding.symbol.toUpperCase()] || { price: 0, change24h: 0 }
      const value = quantity * priceData.price

      return {
        assetId: holding.assetId,
        symbol: holding.symbol,
        name: holding.name,
        quantity,
        price: priceData.price,
        value,
        percentage: 0, // will calculate after total
        change24h: priceData.change24h,
        sources: holding.sources.filter(s => s.amount > 0), // exclude zero balances
      }
    })
    .filter((h) => options.includeZeroValue ? h.quantity > 0 : h.value > 0)

  // Step 2: Calculate total and percentages
  const totalValue = portfolioHoldings.reduce((sum, h) => sum + h.value, 0)
  
  portfolioHoldings.forEach((h) => {
    h.percentage = totalValue > 0 ? (h.value / totalValue) * 100 : 0
  })

  // Step 3: Sort by value descending
  portfolioHoldings.sort((a, b) => b.value - a.value)

  // Step 4: Calculate target allocations with diffs
  const allocations: TargetAllocation[] = Object.entries(targets)
    .map(([assetId, targetPct]) => {
      const holding = portfolioHoldings.find((h) => h.assetId === assetId)
      const currentPct = holding?.percentage || 0
      const diff = currentPct - targetPct
      const diffValue = (diff / 100) * totalValue

      return {
        assetId,
        symbol: holding?.symbol || assetId.toUpperCase(),
        targetPercentage: targetPct,
        currentPercentage: Math.round(currentPct),
        diff: Math.round(diff),
        diffValue: Math.round(diffValue / 100) * 100, // round to nearest 100
      }
    })
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)) // sort by largest deviation

  return {
    totalValue,
    holdings: portfolioHoldings,
    allocations,
    lastUpdated: new Date(),
  }
}

/**
 * Get data formatted for pie chart
 * Groups small holdings into "Other" category
 */
export function getAllocationChartData(
  summary: PortfolioSummary,
  maxSlices = 10,
  minPercentage = 1
): AllocationSlice[] {
  const slices: AllocationSlice[] = []
  let otherValue = 0
  let otherPercentage = 0

  summary.holdings.forEach((holding, index) => {
    if (slices.length < maxSlices - 1 && holding.percentage >= minPercentage) {
      slices.push({
        assetId: holding.assetId,
        symbol: holding.symbol,
        value: holding.value,
        percentage: holding.percentage,
        color: CHART_COLORS[index % CHART_COLORS.length],
      })
    } else {
      otherValue += holding.value
      otherPercentage += holding.percentage
    }
  })

  if (otherValue > 0) {
    slices.push({
      assetId: 'other',
      symbol: 'Other',
      value: otherValue,
      percentage: otherPercentage,
      color: '#71717a', // zinc-500
    })
  }

  return slices
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

/**
 * Format quantity based on magnitude
 */
export function formatQuantity(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
  }
  if (value >= 1) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  }
  if (value >= 0.01) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 4 })
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 6 })
}
