import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InterestRatesCard } from './interest-rates-widget'

// The widget shows what the publisher said and when it said it; a series the
// backend could not read says why instead of disappearing or showing a number.
describe('InterestRatesCard', () => {
  it('shows each rate with its publisher and the date it was set', () => {
    render(
      <InterestRatesCard
        series={[
          { series: 'fed_funds', available: true, value: '3.88', observationDate: '2026-11-19', source: 'fred' },
          { series: 'cbr_key_rate', available: true, value: '14', observationDate: '2026-11-20', source: 'cbr' },
        ]}
      />
    )
    expect(screen.getByText('US Fed funds rate')).toBeInTheDocument()
    expect(screen.getByText('3.88%')).toBeInTheDocument()
    expect(screen.getByText('FRED, as of 2026-11-19')).toBeInTheDocument()
    expect(screen.getByText('Bank of Russia key rate')).toBeInTheDocument()
    expect(screen.getByText('14%')).toBeInTheDocument()
  })

  it('names why a series is unavailable and shows no number for it', () => {
    render(
      <InterestRatesCard
        series={[{ series: 'fed_funds', available: false, unavailableReason: 'no FRED key configured', source: 'fred' }]}
      />
    )
    expect(screen.getByText('FRED: no FRED key configured')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText(/%$/)).toBeNull()
  })

  it('shows a series it has no label for under its id', () => {
    render(<InterestRatesCard series={[{ series: 'ecb_deposit', available: true, value: '2', observationDate: '2026-11-01', source: 'ecb' }]} />)
    expect(screen.getByText('ecb_deposit')).toBeInTheDocument()
  })

  it('says the call failed rather than showing an empty card', () => {
    render(<InterestRatesCard series={[]} error="HTTP 503" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Rates unavailable: HTTP 503')
  })
})
