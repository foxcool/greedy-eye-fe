/**
 * Demo portfolio: invented holdings, targets and a market snapshot.
 *
 * Shown only in demo mode (NEXT_PUBLIC_USE_BACKEND=false), which is also what
 * the project's public screenshots are taken from — so nothing here may come
 * from a real portfolio. Amounts are made up to look like a typical spread:
 * wallets on several chains, an exchange account, a lending deposit, staking,
 * and one airdropped token no source can price.
 */

import type { HoldingSource } from '../types/portfolio-view'

export interface RawHolding {
  assetId: string       // coingecko ID
  symbol: string
  name: string
  sources: HoldingSource[]
}

// ============================================================================
// HOLDINGS
// ============================================================================

export const rawHoldings: RawHolding[] = [
  {
    assetId: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    sources: [
      { name: 'btc cold', amount: 0.085 },
      { name: 'binance', amount: 0.012 },
    ],
  },
  {
    assetId: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    sources: [
      { name: 'eth main', amount: 1.2 },
      { name: 'eth main aave', amount: 0.8 },
      { name: 'arb main', amount: 0.35 },
      { name: 'base main', amount: 0.4 },
    ],
  },
  {
    assetId: 'usd-coin',
    symbol: 'USDC',
    name: 'USD Coin',
    sources: [
      { name: 'eth main aave', amount: 2500 },
      { name: 'base main', amount: 600 },
      { name: 'binance', amount: 400 },
    ],
  },
  {
    assetId: 'tether',
    symbol: 'USDT',
    name: 'Tether',
    sources: [
      { name: 'binance', amount: 1200 },
    ],
  },
  {
    assetId: 'dai',
    symbol: 'DAI',
    name: 'Dai',
    sources: [
      { name: 'op main', amount: 500 },
    ],
  },
  {
    assetId: 'solana',
    symbol: 'SOL',
    name: 'Solana',
    sources: [
      { name: 'sol main', amount: 14 },
      { name: 'binance', amount: 3 },
    ],
  },
  {
    assetId: 'the-open-network',
    symbol: 'TON',
    name: 'Toncoin',
    sources: [
      { name: 'ton main', amount: 320 },
    ],
  },
  {
    assetId: 'polkadot',
    symbol: 'DOT',
    name: 'Polkadot',
    sources: [
      { name: 'dot staked', amount: 260 },
    ],
  },
  {
    assetId: 'cosmos',
    symbol: 'ATOM',
    name: 'Cosmos Hub',
    sources: [
      { name: 'atom staked', amount: 140 },
    ],
  },
  {
    assetId: 'tezos',
    symbol: 'XTZ',
    name: 'Tezos',
    sources: [
      { name: 'xtz staked', amount: 600 },
    ],
  },
  {
    assetId: 'chainlink',
    symbol: 'LINK',
    name: 'Chainlink',
    sources: [
      { name: 'eth main', amount: 45 },
    ],
  },
  {
    assetId: 'uniswap',
    symbol: 'UNI',
    name: 'Uniswap',
    sources: [
      { name: 'eth main', amount: 40 },
    ],
  },
  {
    assetId: 'aave',
    symbol: 'AAVE',
    name: 'Aave',
    sources: [
      { name: 'eth main', amount: 3 },
    ],
  },
  {
    assetId: 'arbitrum',
    symbol: 'ARB',
    name: 'Arbitrum',
    sources: [
      { name: 'arb main', amount: 900 },
    ],
  },
  {
    assetId: 'optimism',
    symbol: 'OP',
    name: 'Optimism',
    sources: [
      { name: 'op main', amount: 300 },
    ],
  },
  {
    assetId: 'monero',
    symbol: 'XMR',
    name: 'Monero',
    sources: [
      { name: 'xmr main', amount: 4 },
    ],
  },
  {
    assetId: 'kusama',
    symbol: 'KSM',
    name: 'Kusama',
    sources: [
      { name: 'ksm main', amount: 12 },
    ],
  },
  {
    assetId: 'lido-dao',
    symbol: 'LDO',
    name: 'Lido DAO',
    sources: [
      { name: 'binance', amount: 250 },
    ],
  },
  {
    assetId: 'maker',
    symbol: 'MKR',
    name: 'Maker',
    sources: [
      { name: 'eth main', amount: 0.3 },
    ],
  },
  {
    assetId: 'polygon-ecosystem-token',
    symbol: 'POL',
    name: 'Polygon',
    sources: [
      { name: 'polygon main', amount: 800 },
    ],
  },
  {
    assetId: 'dogecoin',
    symbol: 'DOGE',
    name: 'Dogecoin',
    sources: [
      { name: 'binance', amount: 2000 },
    ],
  },
  {
    assetId: 'ethereum-name-service',
    symbol: 'ENS',
    name: 'Ethereum Name Service',
    sources: [
      { name: 'eth main', amount: 15 },
    ],
  },
  {
    // No entry in mockPrices on purpose: the demo's one unpriced position, so
    // the holdings table shows how a total admits what it could not value.
    assetId: 'demo-unlisted-airdrop',
    symbol: 'DROP',
    name: 'Unlisted airdrop',
    sources: [
      { name: 'base main', amount: 25000 },
    ],
  },
]

// ============================================================================
// TARGET ALLOCATIONS (percent of total; sums to 100)
// ============================================================================

export const targetPercentages: Record<string, number> = {
  'bitcoin': 28,
  'ethereum': 22,
  'usd-coin': 10,
  'tether': 4,
  'dai': 2,
  'solana': 7,
  'the-open-network': 3,
  'polkadot': 3,
  'cosmos': 2,
  'tezos': 2,
  'chainlink': 3,
  'uniswap': 2,
  'aave': 2,
  'arbitrum': 2,
  'optimism': 2,
  'monero': 2,
  'kusama': 1,
  'lido-dao': 1,
  'maker': 1,
  'polygon-ecosystem-token': 1,
}

// ============================================================================
// MOCK PRICES (market snapshot)
// ============================================================================

export const mockPrices: Record<string, { price: number; change24h: number }> = {
  'bitcoin': { price: 97500, change24h: 2.1 },
  'ethereum': { price: 3450, change24h: 1.5 },
  'usd-coin': { price: 1.0, change24h: 0.0 },
  'tether': { price: 1.0, change24h: 0.0 },
  'dai': { price: 1.0, change24h: 0.01 },
  'solana': { price: 195, change24h: 4.1 },
  'the-open-network': { price: 5.85, change24h: -0.8 },
  'polkadot': { price: 7.2, change24h: 3.2 },
  'cosmos': { price: 6.8, change24h: 1.5 },
  'tezos': { price: 1.05, change24h: 0.8 },
  'chainlink': { price: 23.5, change24h: 1.8 },
  'uniswap': { price: 13.5, change24h: 2.0 },
  'aave': { price: 265, change24h: 1.9 },
  'arbitrum': { price: 0.82, change24h: -0.3 },
  'optimism': { price: 1.85, change24h: -1.2 },
  'monero': { price: 195, change24h: 1.1 },
  'kusama': { price: 32, change24h: 2.2 },
  'lido-dao': { price: 1.95, change24h: 2.1 },
  'maker': { price: 1750, change24h: 2.8 },
  'polygon-ecosystem-token': { price: 0.48, change24h: 2.5 },
  'dogecoin': { price: 0.32, change24h: -1.1 },
  'ethereum-name-service': { price: 28.5, change24h: 3.5 },
}
