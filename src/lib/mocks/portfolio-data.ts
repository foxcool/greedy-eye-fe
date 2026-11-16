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
      { name: 'btc cold', type: 'wallet', amount: 0.085, chain: 'bitcoin' },
      { name: 'binance', type: 'exchange', amount: 0.012 },
    ],
  },
  {
    assetId: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    sources: [
      { name: 'eth main', type: 'wallet', amount: 1.2, chain: 'ethereum' },
      { name: 'eth main aave', type: 'defi', amount: 0.8, chain: 'ethereum', protocol: 'aave' },
      { name: 'arb main', type: 'wallet', amount: 0.35, chain: 'arbitrum' },
      { name: 'base main', type: 'wallet', amount: 0.4, chain: 'base' },
    ],
  },
  {
    assetId: 'usd-coin',
    symbol: 'USDC',
    name: 'USD Coin',
    sources: [
      { name: 'eth main aave', type: 'defi', amount: 2500, chain: 'ethereum', protocol: 'aave' },
      { name: 'base main', type: 'wallet', amount: 600, chain: 'base' },
      { name: 'binance', type: 'exchange', amount: 400 },
    ],
  },
  {
    assetId: 'tether',
    symbol: 'USDT',
    name: 'Tether',
    sources: [
      { name: 'binance', type: 'exchange', amount: 1200 },
    ],
  },
  {
    assetId: 'dai',
    symbol: 'DAI',
    name: 'Dai',
    sources: [
      { name: 'op main', type: 'wallet', amount: 500, chain: 'optimism' },
    ],
  },
  {
    assetId: 'solana',
    symbol: 'SOL',
    name: 'Solana',
    sources: [
      { name: 'sol main', type: 'wallet', amount: 14, chain: 'solana' },
      { name: 'binance', type: 'exchange', amount: 3 },
    ],
  },
  {
    assetId: 'the-open-network',
    symbol: 'TON',
    name: 'Toncoin',
    sources: [
      { name: 'ton main', type: 'wallet', amount: 320, chain: 'ton' },
    ],
  },
  {
    assetId: 'polkadot',
    symbol: 'DOT',
    name: 'Polkadot',
    sources: [
      { name: 'dot staked', type: 'defi', amount: 260, chain: 'polkadot', protocol: 'staking' },
    ],
  },
  {
    assetId: 'cosmos',
    symbol: 'ATOM',
    name: 'Cosmos Hub',
    sources: [
      { name: 'atom staked', type: 'defi', amount: 140, chain: 'cosmos', protocol: 'staking' },
    ],
  },
  {
    assetId: 'tezos',
    symbol: 'XTZ',
    name: 'Tezos',
    sources: [
      { name: 'xtz staked', type: 'defi', amount: 600, chain: 'tezos', protocol: 'staking' },
    ],
  },
  {
    assetId: 'chainlink',
    symbol: 'LINK',
    name: 'Chainlink',
    sources: [
      { name: 'eth main', type: 'wallet', amount: 45, chain: 'ethereum' },
    ],
  },
  {
    assetId: 'uniswap',
    symbol: 'UNI',
    name: 'Uniswap',
    sources: [
      { name: 'eth main', type: 'wallet', amount: 40, chain: 'ethereum' },
    ],
  },
  {
    assetId: 'aave',
    symbol: 'AAVE',
    name: 'Aave',
    sources: [
      { name: 'eth main', type: 'wallet', amount: 3, chain: 'ethereum' },
    ],
  },
  {
    assetId: 'arbitrum',
    symbol: 'ARB',
    name: 'Arbitrum',
    sources: [
      { name: 'arb main', type: 'wallet', amount: 900, chain: 'arbitrum' },
    ],
  },
  {
    assetId: 'optimism',
    symbol: 'OP',
    name: 'Optimism',
    sources: [
      { name: 'op main', type: 'wallet', amount: 300, chain: 'optimism' },
    ],
  },
  {
    assetId: 'monero',
    symbol: 'XMR',
    name: 'Monero',
    sources: [
      { name: 'xmr main', type: 'wallet', amount: 4, chain: 'monero' },
    ],
  },
  {
    assetId: 'kusama',
    symbol: 'KSM',
    name: 'Kusama',
    sources: [
      { name: 'ksm main', type: 'wallet', amount: 12, chain: 'kusama' },
    ],
  },
  {
    assetId: 'lido-dao',
    symbol: 'LDO',
    name: 'Lido DAO',
    sources: [
      { name: 'binance', type: 'exchange', amount: 250 },
    ],
  },
  {
    assetId: 'maker',
    symbol: 'MKR',
    name: 'Maker',
    sources: [
      { name: 'eth main', type: 'wallet', amount: 0.3, chain: 'ethereum' },
    ],
  },
  {
    assetId: 'polygon-ecosystem-token',
    symbol: 'POL',
    name: 'Polygon',
    sources: [
      { name: 'polygon main', type: 'wallet', amount: 800, chain: 'polygon' },
    ],
  },
  {
    assetId: 'dogecoin',
    symbol: 'DOGE',
    name: 'Dogecoin',
    sources: [
      { name: 'binance', type: 'exchange', amount: 2000 },
    ],
  },
  {
    assetId: 'ethereum-name-service',
    symbol: 'ENS',
    name: 'Ethereum Name Service',
    sources: [
      { name: 'eth main', type: 'wallet', amount: 15, chain: 'ethereum' },
    ],
  },
  {
    // No entry in mockPrices on purpose: the demo's one unpriced position, so
    // the holdings table shows how a total admits what it could not value.
    assetId: 'demo-unlisted-airdrop',
    symbol: 'DROP',
    name: 'Unlisted airdrop',
    sources: [
      { name: 'base main', type: 'wallet', amount: 25000, chain: 'base' },
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
