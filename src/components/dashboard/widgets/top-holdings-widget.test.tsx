import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { HeatmapResult } from '@/hooks/use-heatmap'
import type { PricePoint } from '@/hooks/use-price-history'
import { MIN_SPARKLINE_POINTS, Sparkline, TopHoldingsCard } from './top-holdings-widget'

vi.mock('@/hooks/use-assets', () => ({
  useAssetsByIds: () => ({ data: [{ id: 'btc', name: 'Bitcoin' }] }),
}))
vi.mock('@/hooks/use-price-history', () => ({
  usePriceHistory: () => ({ data: [] }),
}))

function series(n: number): PricePoint[] {
  return Array.from({ length: n }, (_, i) => ({
    time: Date.UTC(2026, 0, 1) + i * 3_600_000,
    timestamp: '',
    price: 100 + i,
  }))
}

describe('Sparkline', () => {
  it('draws no line through a series one point short', () => {
    const { container } = render(<Sparkline points={series(MIN_SPARKLINE_POINTS - 1)} />)
    expect(container.querySelector('polyline')).toBeNull()
  })

  it('draws a line once the series has enough points', () => {
    const { container } = render(<Sparkline points={series(MIN_SPARKLINE_POINTS)} />)
    expect(container.querySelector('polyline')).not.toBeNull()
  })
})

describe('TopHoldingsCard', () => {
  const result: HeatmapResult = {
    isLoading: false,
    error: null,
    data: {
      quoteAssetId: 'usd',
      nodes: [
        { id: 'btc', label: 'BTC', assetId: 'btc', size: 900, price: 60000, colorValue: 2 },
        { id: 'sber', label: 'SBER', assetId: 'sber', size: 100, price: 3, colorValue: -1 },
      ],
      coverage: { pricedCount: 2, unpricedCount: 25 },
    },
  }

  it('counts unpriced holdings in the header instead of dropping them silently', () => {
    render(<TopHoldingsCard title="Top holdings" useData={() => result} limit={8} />)
    expect(screen.getByText('25 unpriced, not ranked')).toBeInTheDocument()
  })

  it('says so when nothing at all could be priced', () => {
    const allUnpriced: HeatmapResult = { ...result, data: { quoteAssetId: 'usd', nodes: [], coverage: { unpricedCount: 3 } } }
    render(<TopHoldingsCard title="Top holdings" useData={() => allUnpriced} limit={8} />)
    expect(screen.getByText('3 unpriced, not ranked')).toBeInTheDocument()
    expect(screen.getByText('No priced holdings to rank')).toBeInTheDocument()
  })

  it('keeps the backend order and cuts it at the limit', () => {
    render(<TopHoldingsCard title="Top holdings" useData={() => result} limit={1} />)
    expect(screen.getByText('BTC')).toBeInTheDocument()
    expect(screen.getByText('Bitcoin')).toBeInTheDocument()
    expect(screen.queryByText('SBER')).toBeNull()
  })

  it('shows a dash for a missing change, not a zero change', () => {
    const noChange: HeatmapResult = {
      ...result,
      data: { quoteAssetId: 'usd', nodes: [{ id: 'btc', label: 'BTC', assetId: 'btc', size: 900, price: 60000 }] },
    }
    render(<TopHoldingsCard title="Top holdings" useData={() => noChange} limit={8} />)
    const row = screen.getByText('BTC').closest('tr')!
    expect(row.lastElementChild).toHaveTextContent('—')
    expect(screen.queryByText(/0\.0+%/)).toBeNull()
  })
})
