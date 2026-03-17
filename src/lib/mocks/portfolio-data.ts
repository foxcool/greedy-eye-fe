/**
 * Mock data extracted from crypto_portfolio.r
 * This represents the current manual portfolio tracking approach
 * 
 * Data structure mirrors the R script:
 * - holdings: token amounts by source (wallet/exchange)
 * - targetPercentages: desired allocation
 * - Prices fetched from CoinGecko at runtime (mocked here)
 */

import type { HoldingSource } from '../types/portfolio-view'

// ============================================================================
// RAW HOLDINGS DATA (from R script)
// ============================================================================

export interface RawHolding {
  assetId: string       // coingecko ID
  symbol: string
  name: string
  sources: HoldingSource[]
}

export const rawHoldings: RawHolding[] = [
  {
    assetId: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    sources: [
      { name: 'eth main', type: 'wallet', amount: 0.0114, chain: 'ethereum' },
      { name: 'binance', type: 'exchange', amount: 0.0055 },
      { name: 'arb main', type: 'wallet', amount: 0.006, chain: 'arbitrum' },
      { name: 'gate.io', type: 'exchange', amount: 0 },
    ],
  },
  {
    assetId: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    sources: [
      { name: 'eth main', type: 'wallet', amount: 0.24, chain: 'ethereum' },
      { name: 'eth cold', type: 'wallet', amount: 0.18, chain: 'ethereum' },
      { name: 'arb main', type: 'wallet', amount: 0.02, chain: 'arbitrum' },
      { name: 'op main', type: 'wallet', amount: 0.16, chain: 'optimism' },
      { name: 'binance', type: 'exchange', amount: 0 },
      { name: 'gate.io', type: 'exchange', amount: 0 },
    ],
  },
  {
    assetId: 'dai',
    symbol: 'DAI',
    name: 'Dai',
    sources: [
      { name: 'eth main aave', type: 'defi', amount: 0, chain: 'ethereum', protocol: 'aave' },
      { name: 'eth main', type: 'wallet', amount: 0, chain: 'ethereum' },
      { name: 'op main', type: 'wallet', amount: 77, chain: 'optimism' },
      { name: 'binance', type: 'exchange', amount: 0 },
      { name: 'gate.io', type: 'exchange', amount: 0 },
    ],
  },
  {
    assetId: 'usd-coin',
    symbol: 'USDC',
    name: 'USD Coin',
    sources: [
      { name: 'eth main aave', type: 'defi', amount: 626, chain: 'ethereum', protocol: 'aave' },
      { name: 'eth main', type: 'wallet', amount: 0, chain: 'ethereum' },
      { name: 'scroll main aave', type: 'defi', amount: 0, chain: 'scroll', protocol: 'aave' },
      { name: 'binance', type: 'exchange', amount: 0 },
    ],
  },
  {
    assetId: 'tether',
    symbol: 'USDT',
    name: 'Tether',
    sources: [
      { name: 'eth main', type: 'wallet', amount: 771, chain: 'ethereum' },
      { name: 'ton seed', type: 'wallet', amount: 135, chain: 'ton' },
      { name: 'binance', type: 'exchange', amount: 47 },
      { name: 'hydration', type: 'defi', amount: 0, chain: 'hydration' },
      { name: 'gate.io', type: 'exchange', amount: 309 },
    ],
  },
  {
    assetId: 'the-open-network',
    symbol: 'TON',
    name: 'Toncoin',
    sources: [
      { name: 'ton ledger 1', type: 'wallet', amount: 4, chain: 'ton' },
      { name: 'ton seed', type: 'wallet', amount: 2.45, chain: 'ton' },
      { name: 'tsTON ledger 1', type: 'defi', amount: 196.42, chain: 'ton', protocol: 'tonstakers' },
      { name: 'gate.io', type: 'exchange', amount: 0 },
    ],
  },
  {
    assetId: 'polkadot',
    symbol: 'DOT',
    name: 'Polkadot',
    sources: [
      { name: 'dot main', type: 'wallet', amount: 47.7, chain: 'polkadot' },
      { name: 'dot controller', type: 'wallet', amount: 8.35, chain: 'polkadot' },
      { name: 'gate.io', type: 'exchange', amount: 0 },
      { name: 'binance', type: 'exchange', amount: 30.03 },
    ],
  },
  {
    assetId: 'monero',
    symbol: 'XMR',
    name: 'Monero',
    sources: [
      { name: 'xmr 1', type: 'wallet', amount: 3.3 },
      { name: 'gate.io', type: 'exchange', amount: 0 },
    ],
  },
  {
    assetId: 'bittensor',
    symbol: 'TAO',
    name: 'Bittensor',
    sources: [
      { name: 'tao main', type: 'wallet', amount: 0.374, chain: 'bittensor' },
      { name: 'gate.io', type: 'exchange', amount: 0.085 },
    ],
  },
  {
    assetId: 'maker',
    symbol: 'MKR',
    name: 'Maker',
    sources: [
      { name: 'eth main', type: 'wallet', amount: 0.2846, chain: 'ethereum' },
      { name: 'gate.io', type: 'exchange', amount: 0 },
    ],
  },
  {
    assetId: 'optimism',
    symbol: 'OP',
    name: 'Optimism',
    sources: [
      { name: 'op main', type: 'wallet', amount: 220, chain: 'optimism' },
      { name: 'op/weth uni', type: 'defi', amount: 191, chain: 'optimism', protocol: 'uniswap' },
      { name: 'gate.io', type: 'exchange', amount: 494.65 },
      { name: 'binance', type: 'exchange', amount: 0 },
    ],
  },
  {
    assetId: '1inch',
    symbol: '1INCH',
    name: '1inch',
    sources: [
      { name: 'eth main', type: 'wallet', amount: 1542, chain: 'ethereum' },
      { name: 'staked eth main', type: 'defi', amount: 514, chain: 'ethereum', protocol: '1inch' },
      { name: 'gate.io', type: 'exchange', amount: 0 },
    ],
  },
  {
    assetId: 'moonbeam',
    symbol: 'GLMR',
    name: 'Moonbeam',
    sources: [
      { name: 'glmr main staking', type: 'defi', amount: 1790, chain: 'moonbeam', protocol: 'staking' },
      { name: 'glmr main', type: 'wallet', amount: 152, chain: 'moonbeam' },
      { name: 'binance', type: 'exchange', amount: 0 },
    ],
  },
  {
    assetId: 'arbitrum',
    symbol: 'ARB',
    name: 'Arbitrum',
    sources: [
      { name: 'arb main', type: 'wallet', amount: 547.49, chain: 'arbitrum' },
      { name: 'binance', type: 'exchange', amount: 153.62 },
    ],
  },
  {
    assetId: 'solana',
    symbol: 'SOL',
    name: 'Solana',
    sources: [
      { name: 'sol main', type: 'wallet', amount: 2.46, chain: 'solana' },
      { name: 'binance', type: 'exchange', amount: 0.40 },
      { name: 'gate.io', type: 'exchange', amount: 0 },
    ],
  },
  {
    assetId: 'uniswap',
    symbol: 'UNI',
    name: 'Uniswap',
    sources: [
      { name: 'eth main', type: 'wallet', amount: 31.53, chain: 'ethereum' },
      { name: 'binance', type: 'exchange', amount: 8.19 },
    ],
  },
  {
    assetId: 'cosmos',
    symbol: 'ATOM',
    name: 'Cosmos',
    sources: [
      { name: 'atom main', type: 'wallet', amount: 46, chain: 'cosmos' },
      { name: 'binance', type: 'exchange', amount: 24 },
    ],
  },
  {
    assetId: 'gitcoin',
    symbol: 'GTC',
    name: 'Gitcoin',
    sources: [
      { name: 'eth main', type: 'wallet', amount: 124.66, chain: 'ethereum' },
      { name: 'binance', type: 'exchange', amount: 85.29 },
    ],
  },
  {
    assetId: 'ethereum-name-service',
    symbol: 'ENS',
    name: 'Ethereum Name Service',
    sources: [
      { name: 'eth main', type: 'wallet', amount: 4.4, chain: 'ethereum' },
      { name: 'gate.io', type: 'exchange', amount: 0 },
      { name: 'binance', type: 'exchange', amount: 4.97 },
    ],
  },
  {
    assetId: 'kusama',
    symbol: 'KSM',
    name: 'Kusama',
    sources: [
      { name: 'ksm main', type: 'wallet', amount: 4.25, chain: 'kusama' },
      { name: 'binance', type: 'exchange', amount: 3.89 },
    ],
  },
  {
    assetId: 'hydradx',
    symbol: 'HDX',
    name: 'HydraDX',
    sources: [
      { name: 'hydration controller', type: 'wallet', amount: 628, chain: 'hydration' },
      { name: 'hydration reserved', type: 'defi', amount: 34000, chain: 'hydration' },
    ],
  },
  {
    assetId: 'aave',
    symbol: 'AAVE',
    name: 'Aave',
    sources: [
      { name: 'eth main staked', type: 'defi', amount: 1, chain: 'ethereum', protocol: 'aave' },
      { name: 'eth main', type: 'wallet', amount: 0.61, chain: 'ethereum' },
    ],
  },
  {
    assetId: 'tezos',
    symbol: 'XTZ',
    name: 'Tezos',
    sources: [
      { name: 'xtz main staked', type: 'defi', amount: 274, chain: 'tezos', protocol: 'staking' },
      { name: 'binance', type: 'exchange', amount: 0 },
    ],
  },
  {
    assetId: 'astar',
    symbol: 'ASTR',
    name: 'Astar',
    sources: [
      { name: 'astar main', type: 'wallet', amount: 2840, chain: 'astar' },
      { name: 'binance', type: 'exchange', amount: 438 },
    ],
  },
  {
    assetId: 'filecoin',
    symbol: 'FIL',
    name: 'Filecoin',
    sources: [
      { name: 'binance', type: 'exchange', amount: 35.04 },
    ],
  },
  {
    assetId: 'polygon-ecosystem-token',
    symbol: 'POL',
    name: 'Polygon',
    sources: [
      { name: 'matic pos main', type: 'wallet', amount: 345, chain: 'polygon' },
      { name: 'gate.io', type: 'exchange', amount: 66 },
    ],
  },
  {
    assetId: 'chainlink',
    symbol: 'LINK',
    name: 'Chainlink',
    sources: [
      { name: 'eth main', type: 'wallet', amount: 18.59, chain: 'ethereum' },
      { name: 'binance', type: 'exchange', amount: 0 },
    ],
  },
  {
    assetId: 'velo',
    symbol: 'VELO',
    name: 'Velo',
    sources: [
      { name: 'gate.io', type: 'exchange', amount: 10364 },
    ],
  },
  {
    assetId: 'dash',
    symbol: 'DASH',
    name: 'Dash',
    sources: [
      { name: 'dash main', type: 'wallet', amount: 5 },
      { name: 'binance', type: 'exchange', amount: 0 },
    ],
  },
  {
    assetId: 'dogecoin',
    symbol: 'DOGE',
    name: 'Dogecoin',
    sources: [
      { name: 'binance', type: 'exchange', amount: 816 },
    ],
  },
  {
    assetId: 'zksync',
    symbol: 'ZK',
    name: 'zkSync',
    sources: [
      { name: 'binance', type: 'exchange', amount: 0 },
    ],
  },
  {
    assetId: 'lido-dao',
    symbol: 'LDO',
    name: 'Lido DAO',
    sources: [
      { name: 'binance', type: 'exchange', amount: 142.51 },
    ],
  },
]

// ============================================================================
// TARGET ALLOCATIONS (from R script)
// ============================================================================

export const targetPercentages: Record<string, number> = {
  'bitcoin': 14,
  'ethereum': 13,
  'dai': 10,
  'usd-coin': 10,
  'tether': 9,
  'the-open-network': 3,
  'polkadot': 2,
  'monero': 3,
  'bittensor': 1,
  'maker': 2,
  'optimism': 3,
  '1inch': 2,
  'moonbeam': 1,
  'arbitrum': 2,
  'solana': 3,
  'uniswap': 2,
  'cosmos': 2,
  'gitcoin': 1,
  'ethereum-name-service': 1,
  'kusama': 1,
  'hydradx': 1,
  'aave': 2,
  'tezos': 1,
  'astar': 1,
  'filecoin': 1,
  'polygon-ecosystem-token': 1,
  'chainlink': 2,
  'velo': 1,
  'dash': 2,
  'dogecoin': 1,
  'zksync': 1,
  'lido-dao': 1,
}

// ============================================================================
// MOCK PRICES (snapshot, will be replaced by API)
// ============================================================================

export const mockPrices: Record<string, { price: number; change24h: number }> = {
  'bitcoin': { price: 97500, change24h: 2.1 },
  'ethereum': { price: 3450, change24h: 1.5 },
  'dai': { price: 1.0, change24h: 0.01 },
  'usd-coin': { price: 1.0, change24h: 0.0 },
  'tether': { price: 1.0, change24h: -0.01 },
  'the-open-network': { price: 5.85, change24h: -0.8 },
  'polkadot': { price: 7.20, change24h: 3.2 },
  'monero': { price: 195, change24h: 1.1 },
  'bittensor': { price: 480, change24h: 5.2 },
  'maker': { price: 1750, change24h: 2.8 },
  'optimism': { price: 1.85, change24h: -1.2 },
  '1inch': { price: 0.42, change24h: 0.5 },
  'moonbeam': { price: 0.28, change24h: 1.8 },
  'arbitrum': { price: 0.82, change24h: -0.3 },
  'solana': { price: 195, change24h: 4.1 },
  'uniswap': { price: 13.50, change24h: 2.0 },
  'cosmos': { price: 6.80, change24h: 1.5 },
  'gitcoin': { price: 1.15, change24h: -2.1 },
  'ethereum-name-service': { price: 28.50, change24h: 3.5 },
  'kusama': { price: 32.00, change24h: 2.2 },
  'hydradx': { price: 0.012, change24h: -1.5 },
  'aave': { price: 265, change24h: 1.9 },
  'tezos': { price: 1.05, change24h: 0.8 },
  'astar': { price: 0.065, change24h: -0.5 },
  'filecoin': { price: 5.20, change24h: 1.2 },
  'polygon-ecosystem-token': { price: 0.48, change24h: 2.5 },
  'chainlink': { price: 23.50, change24h: 1.8 },
  'velo': { price: 0.018, change24h: -3.2 },
  'dash': { price: 42.00, change24h: 0.9 },
  'dogecoin': { price: 0.32, change24h: -1.1 },
  'zksync': { price: 0.19, change24h: 4.5 },
  'lido-dao': { price: 1.95, change24h: 2.1 },
}
