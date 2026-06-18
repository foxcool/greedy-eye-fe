/**
 * Macro / world-finance mock data for the dashboard widgets.
 *
 * No backend source exists yet. These typed shapes are the contract the real
 * fetchers will implement later (rates from CB feeds, indices from a market API,
 * crypto from CoinGecko, news from an RSS/news API). Swap the mock bodies for
 * real `fetch` calls returning the same types and the widgets keep working.
 */

export interface InterestRate {
  bank: string // central bank short code, e.g. FED
  region: string
  rate: number // current policy rate, %
  deltaBps: number // last change in basis points (+/-)
  nextMeeting: string // ISO date
}

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
  rates: InterestRate[]
  markets: MarketIndex[]
  crypto: CryptoOverview
  news: NewsItem[]
  asOf: string // ISO datetime the snapshot reflects
}

const snapshot: MacroSnapshot = {
  rates: [
    { bank: 'FED', region: 'US', rate: 4.5, deltaBps: -25, nextMeeting: '2026-07-29' },
    { bank: 'ECB', region: 'EU', rate: 2.4, deltaBps: -25, nextMeeting: '2026-07-24' },
    { bank: 'CBR', region: 'RU', rate: 18.0, deltaBps: -100, nextMeeting: '2026-07-25' },
    { bank: 'BoE', region: 'UK', rate: 4.0, deltaBps: 0, nextMeeting: '2026-08-07' },
  ],
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

/** Returns the current macro snapshot. Async to mirror the future real fetcher. */
export async function fetchMacroSnapshot(): Promise<MacroSnapshot> {
  return snapshot
}
