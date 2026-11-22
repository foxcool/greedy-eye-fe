import type { MacroSeries } from '@/lib/api/backend-types'

/**
 * Macro / world-finance mock data for the dashboard widgets.
 *
 * Policy rates are real (GetMacroRates); demoMacroRates stands in for them in
 * demo mode only. The rest has no backend source yet: these typed shapes are
 * the contract the real fetchers will implement later (indices from a market
 * API, crypto from CoinGecko, news from an RSS/news API). Swap the mock bodies for
 * real `fetch` calls returning the same types and the widgets keep working.
 */

export interface MarketIndex {
  symbol: string
  name: string
  region: 'US' | 'RF' | 'Crypto'
  value: number
  changePct: number // daily change %
}

export interface CryptoOverview {
  fearGreed: { value: number; label: string } // 0..100
  btcDominance: number // %
  totalMarketCap: number // USD
  totalMarketCapChangePct: number
  topMovers: { symbol: string; changePct: number }[]
}

export interface NewsItem {
  id: string
  title: string
  source: string
  time: string // ISO datetime
  importance: 'high' | 'normal'
  url?: string
}

export interface MacroSnapshot {
  markets: MarketIndex[]
  crypto: CryptoOverview
  news: NewsItem[]
  asOf: string // ISO datetime the snapshot reflects
}

const snapshot: MacroSnapshot = {
  markets: [
    { symbol: 'SPX', name: 'S&P 500', region: 'US', value: 5894.2, changePct: 0.62 },
    { symbol: 'NDX', name: 'Nasdaq 100', region: 'US', value: 21340.5, changePct: 0.91 },
    { symbol: 'IMOEX', name: 'MOEX Russia', region: 'RF', value: 2780.4, changePct: -1.14 },
    { symbol: 'TOTAL', name: 'Crypto Total Cap', region: 'Crypto', value: 3.42e12, changePct: 1.85 },
  ],
  crypto: {
    fearGreed: { value: 64, label: 'Greed' },
    btcDominance: 54.2,
    totalMarketCap: 3.42e12,
    totalMarketCapChangePct: 1.85,
    topMovers: [
      { symbol: 'SOL', changePct: 7.4 },
      { symbol: 'ETH', changePct: 3.1 },
      { symbol: 'BTC', changePct: 1.2 },
      { symbol: 'DOGE', changePct: -4.8 },
    ],
  },
  news: [
    {
      id: 'n1',
      title: 'Fed signals data-dependent path after 25bps cut',
      source: 'Reuters',
      time: '2026-06-17T09:10:00Z',
      importance: 'high',
    },
    {
      id: 'n2',
      title: 'Bitcoin reclaims key level as ETF inflows resume',
      source: 'CoinDesk',
      time: '2026-06-17T07:45:00Z',
      importance: 'normal',
    },
    {
      id: 'n3',
      title: 'CBR cuts rate, ruble steadies against dollar',
      source: 'Bloomberg',
      time: '2026-06-16T16:20:00Z',
      importance: 'normal',
    },
  ],
  asOf: '2026-06-17T09:30:00Z',
}

/** Policy rates for demo mode, in the shape GetMacroRates returns. */
export const demoMacroRates: MacroSeries[] = [
  { series: 'fed_funds', available: true, value: '4.33', observationDate: '2026-06-16', source: 'fred' },
  { series: 'cbr_key_rate', available: true, value: '20', observationDate: '2026-06-16', source: 'cbr' },
]

/** Returns the current macro snapshot. Async to mirror the future real fetcher. */
export async function fetchMacroSnapshot(): Promise<MacroSnapshot> {
  return snapshot
}
